import jwt from 'jsonwebtoken';
import getAuthCookieOptions from './authCookieOptions.js';

const sendTokenResponse = (user, statusCode, res, responseData = {}) => {
  // Create token
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  const options = getAuthCookieOptions(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  // Remove password from output object
  user.password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...responseData,
    });
};

export default sendTokenResponse;