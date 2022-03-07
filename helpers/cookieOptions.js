// https://github.com/jshttp/cookie#options-1
export default function cookieOptions(clear = false) {
  return {
    // TODO: try pathology.sspenst.com domain once all APIs are on next
    domain: process.env.LOCAL ? 'localhost' : 'sspenst.com',
    // browsers will delete cookies with a unix epoch expiration date
    expires: clear ? new Date(0) : undefined,
    httpOnly: true,
    // valid for 1 day
    maxAge: clear ? undefined : 60 * 60 * 24,
    // TODO: try /api once all APIs are on next
    path: '/',
    sameSite: 'strict',
    // TODO: uncomment this once both sspenst.com sites are https
    // secure: !process.env.LOCAL,
    secure: false,
  };
}
