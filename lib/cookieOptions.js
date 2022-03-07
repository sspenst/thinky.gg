// https://github.com/jshttp/cookie#options-1
export default function cookieOptions(clear = false) {
  return {
    domain: process.env.LOCAL ? 'localhost' : 'pathology.sspenst.com',
    // browsers will delete cookies with a unix epoch expiration date
    expires: clear ? new Date(0) : undefined,
    httpOnly: true,
    // valid for 1 day
    maxAge: clear ? undefined : 60 * 60 * 24,
    path: '/api',
    sameSite: 'strict',
    secure: !process.env.LOCAL,
  };
}
