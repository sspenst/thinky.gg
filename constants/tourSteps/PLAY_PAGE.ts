import { Step } from 'react-joyride';

export const TOUR_STEPS_PLAY_PAGE: Step[] = [
  {
    disableBeacon: true,
    target: '#chapter1',
    title: 'Welcome to Pathology!',
    content: 'This is the first chapter, and it is unlocked by default. Completing this chapter will unlock the next chapter, and so on.',
    // navigate to first chapter
  },
];
