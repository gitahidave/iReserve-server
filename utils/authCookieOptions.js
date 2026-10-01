const isHostedDeployment =
  process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER) || process.env.VERCEL === '1';

const getAuthCookieOptions = (expires) => ({
  expires,
  httpOnly: true,
  secure: isHostedDeployment,
  sameSite: isHostedDeployment ? 'none' : 'lax',
  partitioned: isHostedDeployment,
  path: '/',
});

export default getAuthCookieOptions;