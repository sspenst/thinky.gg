import { Step } from 'react-joyride';

const TOUR_STEPS_HOME_PAGE: Step[] = [
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
    content: 'Here are the latest levels that have been created by the community. Check them out if you are looking for some fresh levels.',
    disableBeacon: true,
    placement: 'top',
    target: '#latest-levels',
  },
  {
    content: 'Continue your Pathology journey here!',
    disableBeacon: true,
    placement: 'top',
    target: '#campaign',
  },
];

export default TOUR_STEPS_HOME_PAGE;
