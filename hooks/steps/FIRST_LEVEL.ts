import { Step } from 'react-joyride';

export const TOUR_STEPS_FIRST_LEVEL: Step[] = [
  {
    disableBeacon: true,
    target: '.difficultyText',
    placement: 'left',
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

];
