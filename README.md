<p align="center">
  <!-- <img src="src/img/icon-48.png" alt="Simplify YouTube" /> -->
  <img src="public/logos/thinky/thinky_pfp.png" width="48">
</p>

<p align="center">
  <strong>
    <a href="https://thinky.gg">Thinky.gg</a>
  </strong>
</p>

<p align="center">
  A platform dedicated to high-quality puzzle games.
</p>

<p align="center">
  <a href="https://codecov.io/gh/sspenst/thinky.gg">
    <img src="https://codecov.io/gh/sspenst/thinky.gg/branch/main/graph/badge.svg?token=BX0RSQ9R57" />
  </a>
  <img src="https://github.com/sspenst/thinky.gg/actions/workflows/node.js.yml/badge.svg" />
  <br />
  <a href="https://discord.gg/j6RxRdqq4A">
    <img src="https://dcbadge.vercel.app/api/server/j6RxRdqq4A?style=flat&theme=default-inverted" />
  </a>
</p>

## Dev Environment

### Local install
- Run `npm install`
- Create a `.env` file in the root directory containing the following:
```
JWT_SECRET=anything
LOCAL=true
NEW_RELIC_APP_NAME=dummy
NEW_RELIC_LICENSE_KEY=dummy
REVALIDATE_SECRET=whatever
```
- Run `npm run dev` to test changes locally

### Containerized setup
 *Required: Docker installed and running locally.*
 - Run `bash startDevEnv.sh` in the root directory

## Tests
- Run `npm test` to run jest tests

## Contributing

- Find an [issue](https://github.com/sspenst/thinky.gg/issues) to work on
- Fork the repo
- Test your changes locally
- Create a [pull request](https://github.com/sspenst/thinky.gg/pulls)

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [mongoose](https://mongoosejs.com/)
- [Docker](https://www.docker.com/)
- [NGINX](https://www.nginx.com/)
- [New Relic](https://newrelic.com/)
