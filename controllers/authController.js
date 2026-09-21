import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { getWelcomeEmailTemplate } from '../utils/emailTemplates.js';
import sendTokenResponse from '../utils/generateToken.js';

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

    try {
      await sendEmail({
        email: user.email,
        subject: `Welcome to iReserve as a ${user.role === 'host' ? 'Host' : 'Client'}`,
        text: `Hi ${user.name},\n\nWelcome to iReserve. Your ${user.role === 'host' ? 'host' : 'client'} account has been created successfully.\n\nYou can now get started from your dashboard.\n\nThanks for joining iReserve.`,
        html: getWelcomeEmailTemplate(user),
      });
    } catch (emailError) {
      console.error('Registration email dispatch failed:', emailError.message || emailError);
    }

    sendTokenResponse(user, 201, res);
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

export const logout = (req, res) => {
  res
    .cookie('token', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    })
    .status(200)
    .json({ success: true, message: 'Logged out successfully' });
};

export const getMe = (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};