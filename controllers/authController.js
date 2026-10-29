import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { getPasswordResetEmailTemplate, getWelcomeEmailTemplate } from '../utils/emailTemplates.js';
import sendTokenResponse from '../utils/generateToken.js';
import getAuthCookieOptions from '../utils/authCookieOptions.js';

const passwordResetRequestMessage =
  'If an account exists for that email, a password reset link has been sent.';

const hashResetToken = (token) => createHash('sha256').update(token).digest('hex');

export const register = async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role });
    let emailSent = false;
    try {
      await sendEmail({
        email: user.email,
        subject: `Welcome to iReserve as a ${user.role === 'host' ? 'Host' : 'Client'}`,
        text: `Hi ${user.name},\n\nWelcome to iReserve. Your ${user.role === 'host' ? 'host' : 'client'} account has been created successfully.\n\nYou can now get started from your dashboard.\n\nThanks for joining iReserve.`,
        html: getWelcomeEmailTemplate(user),
      });
      emailSent = true;
    } catch (error) {
      console.error('Registration email dispatch failed:', {
        message: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response,
        stack: error.stack,
      });
    }

    sendTokenResponse(user, 201, res, { emailSent, emailPending: false });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0].message });
    }

    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: passwordResetRequestMessage });
    }

    const resetToken = randomBytes(32).toString('hex');
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = process.env.PASSWORD_RESET_URL
      ? new URL(process.env.PASSWORD_RESET_URL)
      : new URL(
          '/reset-password',
          (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim()
        );
    resetUrl.searchParams.set('token', resetToken);

    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset your iReserve password',
        text: `Hi ${user.name},\n\nUse this link to reset your iReserve password within one hour:\n${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.`,
        html: getPasswordResetEmailTemplate(user, resetUrl.toString()),
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw error;
    }

    return res.status(200).json({ message: passwordResetRequestMessage });
  } catch (error) {
    console.error('Password reset email dispatch failed:', error);
    return res.status(500).json({ message: 'Unable to send password reset email' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or expired' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset failed:', error);
    return res.status(500).json({ message: 'Unable to reset password' });
  }
};

export const logout = (req, res) => {
  res
    .cookie('token', '', getAuthCookieOptions(new Date(0)))
    .status(200)
    .json({ success: true, message: 'Logged out successfully' });
};

export const getMe = (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};