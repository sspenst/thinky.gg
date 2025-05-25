import TourPath from '@root/constants/tourPath';
import TourType from '@root/constants/tourType';
import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import React, { JSX, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactJoyride, { CallBackProps, Step, Styles, StylesOptions } from 'react-joyride';
import TOUR_STEPS_HOME_PAGE from '../constants/tourSteps/TOUR_STEPS_HOME_PAGE';

export const TOUR_DATA: { [key in TourType]: Step[] } = {
  [TourType.HOME_PAGE]: TOUR_STEPS_HOME_PAGE,
};

export default function useTour(path: TourPath, cb?: (data: CallBackProps) => void, disableScrolling = false) {
  const { game, mutateUser, userConfig } = useContext(AppContext);
  const router = useRouter();
  const [run, setRun] = useState(false);
  const stepsRef = useRef<Step[]>([]);
  const [tour, setTour] = useState<JSX.Element>();
  const [currentUrl, setCurrentUrl] = useState(router.asPath);

  setTimeout(() => {
    setRun(true);
  }, 1000);

  useEffect(() => {
    if (currentUrl !== router.asPath) {
      setCurrentUrl(router.asPath);
      setRun(false);
    }
  }, [currentUrl, router.asPath]);

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

  const scrollToTarget = useCallback((target: string | HTMLElement) => {
    const element = typeof target === 'string' ? document.querySelector(target) : target;

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  useEffect(() => {
    if (!userConfig || game.disableTour) {
      return;
    }

    let tourType: TourType | undefined = undefined;

    if (path === TourPath.HOME) {
      tourType = TourType.HOME_PAGE;
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
        callback={(data: CallBackProps) => {
          if (!tourType) {
            return;
          }

          if ((data.type === 'tour:end' && data.action === 'next') || data.status === 'skipped') {
            putFinishedTour(tourType);
          }

          // Handle scrolling when step changes
          if (data.type === 'step:after' && data.step?.target) {
            scrollToTarget(data.step.target);
          }

          if (cb) {
            cb(data);
          }
        }}
        run={run}
        steps={stepsRef.current}
        continuous
        hideCloseButton
        disableScrolling={true} // Disable react-joyride's built-in scrolling
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
          buttonBack: {
            backgroundColor: '#3B82F6',
            borderRadius: '6px',
            color: 'var(--color)',
          },
          buttonClose: {
            display: 'none',
          },
          buttonNext: {
            backgroundColor: '#3B82F6',
            borderRadius: '6px',
            color: 'var(--color)',
          },
          buttonSkip: {
            color: 'var(--color)',
            textDecoration: 'underline',
          },
          options: {
            arrowColor: 'var(--bg-color-2)',
            primaryColor: '#5c6bc0',
            textColor: 'var(--color)',
            zIndex: 10000,
          } as StylesOptions,
          spotlight: {
            borderRadius: '8px',
          },
          tooltip: {
            backgroundColor: 'var(--bg-color-2)',
            borderRadius: '8px',
            boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: '8px',
          },
          tooltipTitle: {
            color: 'var(--color)',
            fontSize: '24px',
            marginLeft: '8px',
            fontWeight: 'bold',
          },
        } as Styles}
      />
    );
  }, [cb, game.disableTour, path, putFinishedTour, run, scrollToTarget, userConfig]);

  return tour;
}
