// run with ts-node --files server/scripts/smoke.ts
// import dotenv
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';

dotenv.config();

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
// get command line arguments... Extract first parameter as HOSTNAME
const args = process.argv.slice(2);
const URL_HOST = args[0] || 'http://localhost:3000';

async function start() {
  console.log('Running smoke tests...');
  await smokeKeyPages();
  console.log('\nWoohoo!\n\nSuccessfully completed all smoke tests.\nExiting with status code 0');
  process.exit(0);
}

async function smokeKeyPages() {
  console.log('Smoking key pages...');
  const pages = [
    '/signup',
    '/search',
    '/create',
    '/users',
    '/tutorial',
    '/catalog',
    '/play',
    '/profile/k2xl',
    '/profile/tilu',
    '/level/kiggd/level-01-eyes-closed?cid=61fe329e5d3a34bc11f62345',
    '/login',
    '/api/search 200',
    '/api/level/61fe329e5d3a34bc11f62345 401',
    '/api/level-by-slug/kiggd/a 404', // should not exist...
    '/api/level-by-slug/kiggd/level-01-eyes-closed?cid=61fe329e5d3a34bc11f62345' // public to the world
  ];

  progressBar.start(pages.length, 0);

  // loop through all the users and check to make sure their profile page loads
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i].split(' ');
    // fetch page
    const res = await fetch(`${URL_HOST}${page[0]}`);
    const expectCode = page[1] || '200';

    if (res.status !== parseInt(expectCode)) {
      console.error(`\nError: Page [${page[0]}] failed with status code ${res.status} when ${expectCode} was expected`);
      // exit status code
      console.error('\nExiting status code 1');
      process.exit(1);
    }

    progressBar.update(i);
  }

  progressBar.update(pages.length);
  progressBar.stop();
}

start();
