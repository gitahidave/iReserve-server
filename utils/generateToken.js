import jwt from 'jsonwebtoken';

const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  const isProductionCookie =
    process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER) || process.env.VERCEL === '1';

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true, // Prevents XSS client-side script access
    secure: isProductionCookie, // Use HTTPS in production and hosted deployments
    sameSite: isProductionCookie ? 'none' : 'lax', // Supports cross-site cookies
    path: '/',
  };

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
    });
};

export default sendTokenResponse;