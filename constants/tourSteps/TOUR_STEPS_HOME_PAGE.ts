import { Step } from 'react-joyride';

const TOUR_STEPS_HOME_PAGE: Step[] = [
  {
    content: 'The campaign is the best way to start your Pathology journey!',
    disableBeacon: true,
    placement: 'top',
    target: '#campaign',
  },
  {
    content: 'If you want a different challenge than the campaign, try solving some ranked levels to improve your spot on the leaderboard.',
    disableBeacon: true,
    placement: 'top',
    target: '#ranked',
  },
  {
    content: 'The community has created various campaigns to play through. Check them out here!',
    disableBeacon: true,
    placement: 'top',
    target: '#communityCampaignsBtn',
  },
  {
    content: 'Create your own levels and share them with the community!',
    disableBeacon: true,
    placement: 'top',
    target: '#create',
  },
  {
    content: 'Here are the latest levels that have been created by the community. Check them out if you are looking for some fresh levels.',
    disableBeacon: true,
    placement: 'top',
    target: '#latestLevelsSection',
  },
  {
    content: 'If you want to chat with other players, join our Discord server! We hope you enjoy Pathology!',
    disableBeacon: true,
    placement: 'top',
    target: '#discordSection',
  },
];

export default TOUR_STEPS_HOME_PAGE;
