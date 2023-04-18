import PagePath from '@root/constants/pagePath';
import { TOUR_STEPS_MULTIPLAYER_PAGE } from '@root/constants/tourSteps/MULTIPLAYER_PAGE';
import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactJoyride, { Step } from 'react-joyride';
import { TOUR_STEPS_CHAPTER_1 } from '../constants/tourSteps/CHAPTER_1';
import { TOUR_STEPS_FIRST_LEVEL } from '../constants/tourSteps/FIRST_LEVEL';
import { TOUR_STEPS_HOME_PAGE } from '../constants/tourSteps/HOME_PAGE';
import { TOUR_STEPS_PLAY_PAGE } from '../constants/tourSteps/PLAY_PAGE';
import { TOUR_STEPS_SECOND_LEVEL } from '../constants/tourSteps/SECOND_LEVEL';
import { TOUR_STEPS_THIRD_LEVEL } from '../constants/tourSteps/THIRD_LEVEL';

export enum TourType {
  HOME_PAGE = 'TOUR',
  CHAPTER_1 = 'CHAPTER_1',
  FIRST_LEVEL = 'FIRST_LEVEL',
  SECOND_LEVEL = 'SECOND_LEVEL',
  THIRD_LEVEL = 'THIRD_LEVEL',
  PLAY_PAGE = 'PLAY_PAGE',
  MULTIPLAYER_PAGE = 'MULTIPLAYER_PAGE',
}

export const TOUR_DATA: { [key in TourType]: Step[] } = {
  [TourType.PLAY_PAGE]: TOUR_STEPS_PLAY_PAGE,
  [TourType.CHAPTER_1]: TOUR_STEPS_CHAPTER_1,
  [TourType.FIRST_LEVEL]: TOUR_STEPS_FIRST_LEVEL,
  [TourType.SECOND_LEVEL]: TOUR_STEPS_SECOND_LEVEL,
  [TourType.THIRD_LEVEL]: TOUR_STEPS_THIRD_LEVEL,
  [TourType.HOME_PAGE]: TOUR_STEPS_HOME_PAGE,
  [TourType.MULTIPLAYER_PAGE]: TOUR_STEPS_MULTIPLAYER_PAGE,
};

export function useTour(page: PagePath, cb?: (data: any) => void, disableScrolling = false) {
  const { mutateUser, userConfig } = useContext(AppContext);
  const router = useRouter();
  const [run, setRun] = useState(false);
  const stepsRef = useRef<any[]>([]);
  const [tour, setTour] = useState<JSX.Element>();
  const [currentUrl, setCurrentUrl] = useState(router.asPath);

  setTimeout(() => {
    setRun(true);
  }, 1000);

  const putFinishedTour = useCallback(async (tourRef: TourType) => {
    if (!userConfig) {
      return;
    }

    const res = await fetch('/api/user-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toursCompleted: [...(userConfig.toursCompleted || []), tourRef],
      }),
    });

    if (!res.ok) {
      toast.dismiss();
      toast.error('Error occured');
    } else {
      mutateUser();
    }
  }, [mutateUser, userConfig]);

  useEffect(() => {
    if (!userConfig) {
      return;
    }

    if (currentUrl !== router.asPath) {
      setCurrentUrl(router.asPath);
      setRun(false);
    }

    let tourType: TourType | undefined = undefined;

    if (page === PagePath.HOME) {
      tourType = TourType.HOME_PAGE;
    } else if (page === PagePath.LEVEL) {
      if (userConfig.toursCompleted?.includes(TourType.FIRST_LEVEL)) {
        if (userConfig.toursCompleted?.includes(TourType.SECOND_LEVEL)) {
          tourType = TourType.THIRD_LEVEL;
        } else {
          tourType = TourType.SECOND_LEVEL;
        }
      } else {
        tourType = TourType.FIRST_LEVEL;
      }
    } else if (page === PagePath.CHAPTER) {
      tourType = TourType.CHAPTER_1;
    } else if (page === PagePath.PLAY) {
      tourType = TourType.PLAY_PAGE;
    } else if (page === PagePath.MULTIPLAYER) {
      tourType = TourType.MULTIPLAYER_PAGE;
    }

    if (!tourType) {
      return;
    }

    if (userConfig.toursCompleted?.includes(tourType)) {
      stepsRef.current = [];
    } else {
      stepsRef.current = TOUR_DATA[tourType];
    }

    setTour(
      <ReactJoyride
        callback={(data: any) => {
          if (!tourType) {
            return;
          }

          if ((data.type === 'tour:end' && data.action === 'next') || data.status === 'skipped') {
            putFinishedTour(tourType);
          }

          if (cb) {
            cb(data);
          }
        }}
        run={run}
        steps={stepsRef.current}
        continuous
        hideCloseButton
        disableScrolling={disableScrolling}
        showProgress
        showSkipButton
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Done',
          next: 'Next',
          skip: 'Skip',
        }}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#5c6bc0',
            textColor: 'var(--text-color)',
          },
          buttonClose: {
            display: 'none',
          },
          buttonBack: {
            backgroundColor: '#3B82F6',
            color: '#ffffff',
            borderRadius: '6px',
          },
          buttonNext: {
            backgroundColor: '#3B82F6',
            color: '#ffffff',
            borderRadius: '6px',
          },
          buttonSkip: {
            color: 'var(--text-color)',
            textDecoration: 'underline',
          },
          tooltip: {
            backgroundColor: 'var(--bg-color)',
            borderRadius: '8px',
            boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: '16px',
          },
          tooltipTitle: {
            color: 'var(--text-color)',
            fontSize: '24px',

            marginLeft: '16px',

            fontWeight: 'bold',
          }
        }}
      />
    );
  }, [page, cb, userConfig, run, router.asPath, currentUrl, router.pathname, putFinishedTour, disableScrolling]);

  return tour;
}
