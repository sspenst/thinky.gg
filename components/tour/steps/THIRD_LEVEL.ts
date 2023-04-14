import { Step } from 'react-joyride';

export const TOUR_STEPS_THIRD_LEVEL: Step[] = [
  {
    disableBeacon: true,
    target: '.difficultyText',
    content: 'This shows the current difficulty of this level. Levels can range from 10 different difficulty levels ranging from Kindergarten to Super Grandmaster!'
  },
  {
    disableBeacon: true,
    target: '#leastStepsTab',
    content: 'On the side bar you can see the user that first achieved the current minimum step count.'
  },
  {
    disableBeacon: true,
    target: '#solvesTab',
    content: 'This tab (a Pro feature) will show other users that have reached different step counts.'
  },
  {
    disableBeacon: true,
    target: '#timePlayedTab',
    content: 'This tab (also a Pro feature) will show details on how long you have taken to solve this level.'
  },
  {
    disableBeacon: true,
    target: '.reviewsSection',
    content: 'Did you enjoy this level? After beating it, leave a review here. Reviewing a level gives feedback to the author and helps other Pathology recommend levels for players.'
  },
];
