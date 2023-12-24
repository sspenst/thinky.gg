import { Step } from 'react-joyride';

const TOUR_STEPS_HOME_PAGE: Step[] = [
  {
    content: 'The campaign is the best way to start the game!',
    disableBeacon: true,
    placement: 'top',
    target: '#campaign',
  },
  {
    content: 'Every day we select a level that we think is fun and interesting. You can play it here!',
    disableBeacon: true,
    placement: 'top',
    target: '#level-of-day',
  },
  {
    content: 'Levels are recommended here based on what you\'ve been playing recently.',
    disableBeacon: true,
    placement: 'top',
    target: '#recommended-level',
  },
  {
    content: 'If you want a different challenge than the main campaign, check out one of the campaigns created by the community.',
    disableBeacon: true,
    placement: 'top',
    target: '#communityCampaignsBtn',
  },
  {
    content: 'Here are the latest levels that have been created by the community. Check them out if you are looking for some fresh levels.',
    disableBeacon: true,
    placement: 'top',
    target: '#latestLevelsSection',
  },
  {
    content: 'If you want to chat with other players, join our Discord server! We hope you enjoy the game!',
    disableBeacon: true,
    placement: 'top',
    target: '#discordSection',
  },
];

export default TOUR_STEPS_HOME_PAGE;
