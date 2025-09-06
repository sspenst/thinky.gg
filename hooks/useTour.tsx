import TourPath from '@root/constants/tourPath';
import TourType from '@root/constants/tourType';
import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import { JSX, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import CustomTour from '@root/components/tour/CustomTour';
import { TourCallbackData, TourStep } from '@root/types/tour';
import TOUR_STEPS_HOME_PAGE from '../constants/tourSteps/TOUR_STEPS_HOME_PAGE';

export const TOUR_DATA: { [key in TourType]: TourStep[] } = {
  [TourType.HOME_PAGE]: TOUR_STEPS_HOME_PAGE,
};

export default function useTour(path: TourPath, cb?: (data: TourCallbackData) => void, disableScrolling = false) {
  const { game, mutateUser, userConfig } = useContext(AppContext);
  const router = useRouter();
  const [run, setRun] = useState(false);
  const stepsRef = useRef<TourStep[]>([]);
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
      <CustomTour
        run={run}
        steps={stepsRef.current}
        disableScrolling={true}
        showProgress
        showSkipButton
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Done',
          next: 'Next',
          skip: 'Skip',
        }}
        onCallback={(data) => {
          if (!tourType) return;
          if (data.type === 'tour:end' || data.type === 'skipped') {
            putFinishedTour(tourType);
          }
          if ((data.type === 'step:after' || data.type === 'step:before') && data.step?.target) {
            scrollToTarget(data.step.target as any);
          }
          if (cb) cb(data);
        }}
      />
    );
  }, [cb, game.disableTour, path, putFinishedTour, run, scrollToTarget, userConfig]);

  return tour;
}
