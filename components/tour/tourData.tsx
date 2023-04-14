import User, { ReqUser } from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactJoyride, { Step } from 'react-joyride';
import { PAGE_PATH } from '../page';

export enum TourTypes {
    HOME_PAGE = 'TOUR',
    CHAPTER_1 = 'CHAPTER_1',
    FIRST_LEVEL = 'FIRST_LEVEL',
    SECOND_LEVEL = 'SECOND_LEVEL',
    THIRD_LEVEL = 'THIRD_LEVEL',
    PLAY_PAGE = 'PLAY_PAGE',
}

export const TOUR_DATA: { [key in TourTypes]: Step[] } = {
  [TourTypes.PLAY_PAGE]: [
    {
      disableBeacon: true,
      target: '#chapter1',
      content: 'Welcome to Pathology main campaign! This is the first chapter, and it is unlocked by default.',
      // navigate to first chapter
    },

  ],
  [TourTypes.CHAPTER_1]: [
    {
      disableBeacon: true,
      target: '#level-selectcard-0',
      content: 'This is the first level',
      // navigate to first chapter
    },
  ],
  [TourTypes.FIRST_LEVEL]: [
    {
      disableBeacon: true,
      target: '#fullscreenBtn',
      content: 'Allows you to go full screen',
    },
    {
      disableBeacon: true,
      target: '#checkpointBtn',
      content: 'Allows you to save checkpoints (note this is a Pro feature)',
    },

  ],
  [TourTypes.SECOND_LEVEL]: [

    {
      disableBeacon: true,
      target: '#dropdownMenuBtn',
      content: 'Access your profile, settings, and change the theme.'
    },
    {
      disableBeacon: true,
      target: '#searchBtn',
      content: 'Search through the thousands of user created levels',
    },
    {
      disableBeacon: true,
      target: '#notificationsBtn',
      content: 'Access notifications and messages',
    },
    {
      disableBeacon: true,
      target: '#multiplayerBtn',
      content: 'Play against other plays with the real time multiplayer mode!',
    },
    {
      disableBeacon: true,
      target: '#levelsCompletedBtn',
      content: 'Shows how many levels you have completed',
    },
  ],
  [TourTypes.THIRD_LEVEL]: [
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
  ],
  [TourTypes.HOME_PAGE]: [
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
  ]

};

export function useTour(page: PAGE_PATH, user: ReqUser, cb?: (data: any) => void) {
  const [tour, setTour] = useState<JSX.Element>();
  const stepsRef = useRef<any[]>([]);

  const putFinishedTour = async (tourRef: TourTypes) => {
    if (!user) {
      return;
    }

    const res = await fetch('/api/user-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toursCompleted: [...(user.config.toursCompleted || []), tourRef],
      }),
    });

    if (!res.ok) {
      toast.dismiss();
      toast.error('Error occured');
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    let tourRef: TourTypes = undefined as unknown as TourTypes;
    const userConfig = user.config;

    if (page === PAGE_PATH.HOME) {
      tourRef = TourTypes.HOME_PAGE;
    } else if (page === PAGE_PATH.LEVEL) {
      if (userConfig.toursCompleted?.includes(TourTypes.FIRST_LEVEL)) {
        if (userConfig.toursCompleted?.includes(TourTypes.SECOND_LEVEL)) {
          tourRef = TourTypes.THIRD_LEVEL;
        } else {
          tourRef = TourTypes.SECOND_LEVEL;
        }
      } else {
        tourRef = TourTypes.FIRST_LEVEL;
      }
    } else if (page === PAGE_PATH.CHAPTER) {
      tourRef = TourTypes.CHAPTER_1;
    } else if (page === PAGE_PATH.PLAY) {
      tourRef = TourTypes.PLAY_PAGE;
    }

    if (!tourRef) {
      return;
    }

    if (userConfig.toursCompleted?.includes(tourRef)) {
      stepsRef.current = [];
    } else {
      stepsRef.current = TOUR_DATA[tourRef];
    }

    setTour(
      <ReactJoyride
        callback={(data: any) => {
          if (data.type === 'tour:end' || data.type === 'tour:skip') {
            putFinishedTour(tourRef);
          }

          if (cb) {
            cb(data);
          }
        }}
        run={true}
        steps={stepsRef.current}
        continuous
        hideCloseButton
        scrollToFirstStep
        showProgress
        showSkipButton
      />
    );
  }, [page, cb, user]);

  return {
    tour: tour,
  };
}
