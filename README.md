# <img src="public/logo.svg"> [Pathology](https://pathology.gg)

A recreation of [k2xl](https://k2xl.com)'s Psychopath 2 using [Next.js](https://nextjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), and [mongoose](https://mongoosejs.com/). Find your way to the exit in the least number of moves.

[![codecov](https://codecov.io/gh/sspenst/pathology/branch/main/graph/badge.svg?token=BX0RSQ9R57)](https://codecov.io/gh/sspenst/pathology)
![Tests](https://github.com/sspenst/pathology/actions/workflows/node.js.yml/badge.svg)


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

- Find an [issue](https://github.com/sspenst/pathology/issues) to work on
- Fork the repo
- Test your changes locally
- Create a [pull request](https://github.com/sspenst/pathology/pulls)

## Discord

Join the [Pathology Discord](https://discord.gg/j6RxRdqq4A)!

