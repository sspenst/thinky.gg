import { Step } from 'react-joyride';

export const TOUR_STEPS_HOME_PAGE: Step[] = [
  {
    disableBeacon: true,
    target: '#level-of-day',
    content: 'Every day we select a level that we think is fun and interesting. You can play it here!',
  },
  {
    disableBeacon: true,
    target: '#recommended-easy-level',
    content: 'We think this level is easy enough for you to complete. Give it a try!',
  },
  {
    disableBeacon: true,
    target: '#communityCampaignsBtn',
    content: 'Here is some classic campaigns if you want a different challenge than the main campaign.',
  },
  {
    disableBeacon: true,
    target: '#usersBtn',
    content: 'Browse through all the users on the site and check out how you stack up!',
  },
  {
    disableBeacon: true,
    target: '#latestLevelsSection',
    placement: 'auto',
    content: 'Here are the latest levels that have been created by the community. Check them out if you are looking for some fresh levels.',
  },
  {
    disableBeacon: true,
    target: '#discordSection',
    content: 'If you want to chat with other players, join our discord server!',
    placement: 'auto',
  },
  {
    disableBeacon: true,
    target: '#playBtn',
    content: 'Play here to get back into the main campaign!',
    placement: 'auto',
  },
];
