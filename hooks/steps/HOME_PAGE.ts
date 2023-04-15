import { Step } from 'react-joyride';

export const TOUR_STEPS_HOME_PAGE: Step[] = [
  {
    disableBeacon: true,
    target: '#level-of-day',
    content: 'Every day we select a level that we think is fun and interesting. You can play it here!',
    // navigate to first chapter
  },
  {
    disableBeacon: true,
    target: '#recommended-easy-level',
    content: 'We think this level is easy enough for you to complete. Give it a try!',
    // navigate to first chapter
  },
  {
    disableBeacon: true,
    target: '#communityCampaignsBtn',
    content: 'Here is some classic campaigns if you want a different challenge than the main campaign.',
    // navigate to first chapter
  },
  {
    disableBeacon: true,
    target: '#usersBtn',
    content: 'Browse through all the users on the site and check out how you stack up!',
    // navigate to first chapter
  },
  {
    disableBeacon: true,
    target: '#latestLevelsSection',
    placement: 'auto',
    content: 'Here are the latest levels that have been created by the community. Check them out if you are looking for some fresh levels.',
    // navigate to first chapter
  },
  {
    disableBeacon: true,
    target: '#discordSection',
    content: 'If you want to chat with other players, join our discord server!',
    placement: 'auto',
    // navigate to first chapter
  },
  {
    disableBeacon: true,
    target: '#playBtn',
    content: 'Play here to get back into the main campaign!',
    placement: 'auto',
    // navigate to first chapter
  },
];
