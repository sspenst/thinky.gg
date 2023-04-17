import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactJoyride, { Step } from 'react-joyride';
import { PAGE_PATH } from '../components/page';
import { TOUR_STEPS_CHAPTER_1 } from './steps/CHAPTER_1';
import { TOUR_STEPS_FIRST_LEVEL } from './steps/FIRST_LEVEL';
import { TOUR_STEPS_HOME_PAGE } from './steps/HOME_PAGE';
import { TOUR_STEPS_PLAY_PAGE } from './steps/PLAY_PAGE';
import { TOUR_STEPS_SECOND_LEVEL } from './steps/SECOND_LEVEL';
import { TOUR_STEPS_THIRD_LEVEL } from './steps/THIRD_LEVEL';

export enum TourTypes {
    HOME_PAGE = 'TOUR',
    CHAPTER_1 = 'CHAPTER_1',
    FIRST_LEVEL = 'FIRST_LEVEL',
    SECOND_LEVEL = 'SECOND_LEVEL',
    THIRD_LEVEL = 'THIRD_LEVEL',
    PLAY_PAGE = 'PLAY_PAGE',
}

export const TOUR_DATA: { [key in TourTypes]: Step[] } = {
  [TourTypes.PLAY_PAGE]: TOUR_STEPS_PLAY_PAGE,
  [TourTypes.CHAPTER_1]: TOUR_STEPS_CHAPTER_1,
  [TourTypes.FIRST_LEVEL]: TOUR_STEPS_FIRST_LEVEL,
  [TourTypes.SECOND_LEVEL]: TOUR_STEPS_SECOND_LEVEL,
  [TourTypes.THIRD_LEVEL]: TOUR_STEPS_THIRD_LEVEL,
  [TourTypes.HOME_PAGE]: TOUR_STEPS_HOME_PAGE

};

export function useTour(page: PAGE_PATH, cb?: (data: any) => void, disableScrolling = false) {
  const [run, setRun] = useState(false);
  const { user, mutateUser } = useContext(AppContext);
  const router = useRouter();

  setTimeout(() => {
    setRun(true);
  }, 1000);

  const [tour, setTour] = useState<JSX.Element>();

  const [currentUrl, setCurrentUrl] = useState(router.asPath);
  const stepsRef = useRef<any[]>([]);

  const putFinishedTour = useCallback(async (tourRef: TourTypes) => {
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
    } else {
      mutateUser();
    }
  }, [mutateUser, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (currentUrl !== router.asPath) {
      setCurrentUrl(router.asPath);
      setRun(false);
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
          if ((data.type === 'tour:end' && data.action === 'next') || data.status === 'skipped') {
            putFinishedTour(tourRef);
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
  }, [page, cb, user, run, router.asPath, currentUrl, router.pathname, putFinishedTour, disableScrolling]);

  return {
    tour: tour,
  };
}
