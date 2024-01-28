# <img src="public/logos/thinky/thinky.svg"> [Thinky.gg](https://thinky.gg)

[![codecov](https://codecov.io/gh/sspenst/pathology/branch/main/graph/badge.svg?token=BX0RSQ9R57)](https://codecov.io/gh/sspenst/pathology)
![Tests](https://github.com/sspenst/pathology/actions/workflows/node.js.yml/badge.svg)
[![](https://dcbadge.vercel.app/api/server/j6RxRdqq4A?style=flat&theme=default-inverted)](https://discord.gg/j6RxRdqq4A)

Thinky is a platform dedicated to high-quality puzzle games. Solve and optimize puzzles, or create your own for everyone to play!

## Dev Environment

### Local install
- Run `pnpm install`
- Create a `.env` file in the root directory containing the following:
```
JWT_SECRET=anything
LOCAL=true
NEW_RELIC_APP_NAME=dummy
NEW_RELIC_LICENSE_KEY=dummy
REVALIDATE_SECRET=whatever
```
- Run `pnpm run dev` to test changes locally

### Containerized setup
 *Required: Docker installed and running locally.*
 - Run `bash startDevEnv.sh` in the root directory

## Tests
- Run `pnpm test` to run jest tests

## Contributing

- Find an [issue](https://github.com/sspenst/pathology/issues) to work on
- Fork the repo
- Test your changes locally
- Create a [pull request](https://github.com/sspenst/pathology/pulls)

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [mongoose](https://mongoosejs.com/)
- [Docker](https://www.docker.com/)
- [NGINX](https://www.nginx.com/)
- [New Relic](https://newrelic.com/)
