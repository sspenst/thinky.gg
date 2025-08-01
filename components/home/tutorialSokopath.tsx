/* istanbul ignore file */

import { createPopper, Instance, Placement } from '@popperjs/core';
import { GameState } from '@root/helpers/gameStateHelpers';
import classNames from 'classnames';
import { Types } from 'mongoose';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { JSX, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import { TimerUtil } from '../../helpers/getTs';
import Control from '../../models/control';
import Level from '../../models/db/level';
import BasicLayout from '../level/basicLayout';
import Controls from '../level/controls';
import GameRefactored from '../level/game-refactored';
import Page from '../page/page';
import DismissToast from '../toasts/dismissToast';

interface Tooltip {
  canClose?: boolean;
  dir?: Placement;
  target: string;
  title: JSX.Element;
}

interface TutorialStep {
  editorGrid?: boolean;
  gameClasses?: string;
  gameGrid?: boolean;
  header: JSX.Element;
  isNextButtonDisabled?: boolean;
  key?: string;
  level?: Level;
  onComplete?: () => void;
  onMove?: (gameState: GameState) => void;
  onSolve?: () => void;
  // number of steps back using the previous button
  prevSteps?: number;
  tooltip?: Tooltip;
}

interface TutorialSokopathProps {
  recaptchaPublicKey?: string | null;
}

export default function TutorialSokopath({ recaptchaPublicKey }: TutorialSokopathProps) {
  function getLevel(data: string, override: Partial<Level> = {}): Level {
    const sp = data.split('\n');
    const width = sp[0].length;

    return {
      _id: new Types.ObjectId(),
      authorNote: 'test level 1 author note',
      data: data,
      height: sp.length,
      isDraft: false,
      leastMoves: 0,
      name: 'test level 1',
      ts: TimerUtil.getTs(),
      width: width,
      ...override,
    } as Level;
  }

  const router = useRouter();
  const globalTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isNextButtonDisabled, setIsNextButtonDisabled] = useState(false);
  const [isPrevButtonDisabled, setIsPrevButtonDisabled] = useState(false);
  const { game, mutateUser, user } = useContext(AppContext);
  const [popperInstance, setPopperInstance] = useState<Instance | null>(null);
  const popperUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const [showNiceJob, setShowNiceJob] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip>();
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialStepIndexMax, setTutorialStepIndexMax] = useState(0);
  const isLoggedIn = !!user;

  const LEVEL_1 = '00040\n00000\n00230\n00000\n00000';
  const WALL_INTRO = '0000\n0100\n4200\n0030';
  const MOVABLE_EXPLAIN = '41310\n00223\n01010\n00011';
  const MOVABLE_EXPLAIN_END_COVER = '0000\n4K30\n0210\n0400';

  useEffect(() => {
    if (tutorialStepIndex > tutorialStepIndexMax) {
      setTutorialStepIndexMax(tutorialStepIndex);
    }
  }, [tutorialStepIndex, tutorialStepIndexMax]);

  const initializeTooltip = useCallback((tooltip: Tooltip | undefined) => {
    // set opacity of tooltip to 0
    const tooltipEl = document.getElementById('tooltip');

    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.display = 'none';
    }

    if (tooltip) {
      // loop every 1ms until DOM has loeaded, then show the tooltip
      const popperI = setInterval(() => {
        if (!tooltip) {
          return;
        }

        const tooltipEl = document.getElementById('tooltip');

        if (!tooltipEl) {
          return;
        }

        const target = document.querySelector(tooltip.target);
        // get y position of target
        const targetY = target?.getBoundingClientRect().top;

        if (!targetY) {
          tooltipEl.style.opacity = '0';
          tooltipEl.style.display = 'none';

          return;
        }

        tooltipEl.style.opacity = '0.9';
        tooltipEl.style.display = 'block';

        const instance = createPopper(target, tooltipEl, {
          placement: tooltip.dir || 'top',
          modifiers: [
            {
              name: 'flip',
              options: {
                boundary: document.querySelector('#tutorial-container'),
                fallbackPlacements: ['bottom'],
              },
            },
            {
              name: 'offset',
              options: {
                offset: [0, 10],
              },
            },
          ]
        });

        clearInterval(popperI);
        setPopperInstance(instance);
        setTooltip(tooltip);
      }, 1);
    } else {
      setPopperInstance(null);
      setTooltip(undefined);
    }
  }, []);

  const niceJob = useCallback(() => {
    // set opacity of tooltip to 0
    const tooltipEl = document.getElementById('tooltip');

    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.display = 'none';
    }

    setTooltip(undefined);
    setPopperInstance(null);
    setShowNiceJob(true);

    const gameDivParent = document.getElementById('game-div-parent');

    // remove fadeIn class if it exists and add fadeOut
    if (gameDivParent) {
      gameDivParent.classList.remove('fadeIn');
      gameDivParent.classList.add('fadeOut');
    }

    setIsNextButtonDisabled(true);
    setIsPrevButtonDisabled(true);

    if (globalTimeout.current) {
      clearTimeout(globalTimeout.current);
    }

    globalTimeout.current = setTimeout(() => {
      setShowNiceJob(false);
      setTutorialStepIndex(i => i + 1);
      sessionStorage.setItem('tutorialStep-Sokopath', (tutorialStepIndex + 1).toString());
    }, 1500);
  }, [tutorialStepIndex]);

  const prevControl = useCallback((disabled = false) => new Control(
    'control-prev',
    () => {
      setTutorialStepIndex(i => i - 1);
      sessionStorage.setItem('tutorialStep-Sokopath', (tutorialStepIndex - 1).toString());
    },
    <div className='flex justify-center'>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-arrow-left-short' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z' />
      </svg>
      <span className='pr-2 self-center'>
        Prev
      </span>
    </div>,
    disabled,
  ), [tutorialStepIndex]);

  const nextControl = useCallback((disabled = false) => new Control(
    'control-next',
    () => {
      setTutorialStepIndex(i => i + 1);
      sessionStorage.setItem('tutorialStep-Sokopath', (tutorialStepIndex + 1).toString());
    },
    <div className='flex justify-center text-black'>
      <span className='pl-2 self-center'>
        Next
      </span>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-arrow-right-short' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
      </svg>
    </div>,
    disabled,
    !disabled,
  ), [tutorialStepIndex]);

  const getTutorialSteps = useCallback(() => {
    return [

      {
        gameGrid: true,
        header: <><div key='tutorial-level-1-header' className='text-3xl fadeIn'>Try to complete your first level!</div><div className='text-xl'>Push the box onto the goal.</div></>,
        key: 'tutorial-level-1',
        level: getLevel(LEVEL_1),
        isNextButtonDisabled: true,
        onSolve: () => {
          setIsNextButtonDisabled(false);
        },
        onComplete: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-wall-header' className='text-3xl fadeIn'>Try completing another level.</div>,
        key: 'tutorial-wall',
        level: getLevel(WALL_INTRO),
        onSolve: () => {
          setIsNextButtonDisabled(false);
        },
        onComplete: niceJob,
        tooltip: { canClose: true, target: '.tile-type-1', title: <div>You cannot walk through walls</div> },
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-movable-explain-header' className='text-3xl fadeIn'>You can only push one box at a time.</div>,
        key: 'tutorial-movable-explain',
        level: getLevel(MOVABLE_EXPLAIN),
        onSolve: () => {
          setIsNextButtonDisabled(false);
        },
        onComplete: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <><div key='tutorial-level-1-coverexit' className='text-3xl fadeIn'>Complete the final level of the tutorial!</div></>,
        key: 'tutorial-movable-explain-end-cover',
        level: getLevel(MOVABLE_EXPLAIN_END_COVER),
        onSolve: () => {
          setIsNextButtonDisabled(false);
        },
        onComplete: niceJob,
      },
      {
        header: <div>
          <div className='text-3xl mb-6 fadeIn'>Congratulations on completing the tutorial!</div>
          <div className='text-xl fadeIn' style={{
            animationDelay: '1s',
          }}>There is a lot more to Sokopath than just this:<br />An active community, level editor, and thousands of levels to explore.</div>
          {isLoggedIn ?
            <div className='text-xl fadeIn' style={{
              pointerEvents: 'all',
              animationDelay: '2s',
            }}>
              {!game.disableCampaign && <>
              Continue your Sokopath journey with the <span className='font-bold'>Campaign</span>!
              </>}
            </div>
            :
            <div className='flex flex-col gap-3'>
              <div className='text-xl fadeIn' style={{
                pointerEvents: 'all',
                animationDelay: '2s'
              }}>
                Now <Link href='/signup' className='font-bold text-blue-500 hover:text-blue-400'>sign up</Link> for free to explore the world of Sokopath (and other puzzle games!)
              </div>
              <div className='fadeIn' style={{
                pointerEvents: 'all',
                animationDelay: '2.5s'
              }}>
                (or <Link href='/play-as-guest' className='font-bold text-blue-500 hover:text-blue-400'>continue as a guest</Link>)
              </div>
            </div>
          }
        </div>,
      },
    ] as TutorialStep[];
  }, [game.disableCampaign, isLoggedIn, niceJob]);

  useEffect(() => {
    const sessionStorageTutorialStep = sessionStorage.getItem('tutorialStep-Sokopath');

    if (sessionStorageTutorialStep) {
      const intStep = parseInt(sessionStorageTutorialStep);

      setTutorialStepIndex(Math.max(0, Math.min(intStep, getTutorialSteps().length - 1)));
    }
  }, [getTutorialSteps]);
  const skipControl = useCallback(() => new Control(
    'control-skip',
    () => {
      if (confirm('Are you sure you want to skip the tutorial?')) {
        setTutorialStepIndex(() => {
          sessionStorage.setItem('tutorialStep-Sokopath', (getTutorialSteps().length - 1).toString());

          return getTutorialSteps().length - 1;
        });
      }
    },
    <div className='flex justify-center'>
      <span className='pl-2 align-middle text-center justify-center self-center'>
        Skip
      </span>
      <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-skip-forward pl-2' viewBox='0 0 16 16'>
        <path d='M15.5 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V8.752l-6.267 3.636c-.52.302-1.233-.043-1.233-.696v-2.94l-6.267 3.636C.713 12.69 0 12.345 0 11.692V4.308c0-.653.713-.998 1.233-.696L7.5 7.248v-2.94c0-.653.713-.998 1.233-.696L15 7.248V4a.5.5 0 0 1 .5-.5zM1 4.633v6.734L6.804 8 1 4.633zm7.5 0v6.734L14.304 8 8.5 4.633z' />
      </svg>
    </div>,
  ), [getTutorialSteps]);

  useEffect(() => {
    if (popperUpdateInterval.current) {
      clearInterval(popperUpdateInterval.current);
    }

    if (!popperInstance) {
      return;
    }

    popperUpdateInterval.current = setInterval(async () => {
      if (popperInstance) {
        popperInstance.forceUpdate();
      }
    }, 10);
  }, [popperInstance]);

  const putTutorialCompletedAt = useCallback((tutorialCompletedAt: number) => {
    fetch('/api/user-config', {
      method: 'PUT',
      body: JSON.stringify({
        tutorialCompletedAt: tutorialCompletedAt,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(() => {
      mutateUser();
    }).catch(err => {
      console.error('Error setting tutorialCompletedAt', err);
    });
  }, [mutateUser]);

  useEffect(() => {
    setTooltip(undefined);
    setPopperInstance(null);

    const tutorialSteps = getTutorialSteps();
    const tutorialStep = tutorialSteps[tutorialStepIndex];

    setIsNextButtonDisabled(!!tutorialStep.isNextButtonDisabled);
    setIsPrevButtonDisabled(false);
    initializeTooltip(tutorialStep.tooltip);

    // mark tutorial as completed on the last step
    if (tutorialSteps.length - 1 === tutorialStepIndex) {
      if (isLoggedIn) {
        putTutorialCompletedAt(TimerUtil.getTs());
        window.localStorage.removeItem('tutorialCompletedAt');
      } else {
        localStorage.setItem('tutorialCompletedAt', '' + TimerUtil.getTs());
      }
    }
  }, [getTutorialSteps, initializeTooltip, isLoggedIn, putTutorialCompletedAt, tutorialStepIndex]);

  const tutorialStep = getTutorialSteps()[tutorialStepIndex];

  useEffect(() => {
    setTimeout(() => {
      const nextId = document.getElementById('control-next') as HTMLButtonElement;

      // if nextId doesn't have class pointer-events-none
      if (nextId && !isNextButtonDisabled) {
        if (!nextId.classList.contains('pointer-events-none')) {
          setTimeout(() => {
            nextId.classList.add('bg-orange-300');
            nextId.classList.add('bounce');
            // have nextId delay animation by 1s
            nextId.style.animationDelay = '3s';
          }, 1);
        } else {
          // remove
          nextId.classList.remove('bg-orange-300');
          nextId.classList.remove('bounce');
        }
      }
    }, 1);
  }, [isNextButtonDisabled, tutorialStep.gameGrid, tutorialStep.isNextButtonDisabled, tutorialStepIndex, tutorialStepIndexMax]);

  const controls: Control[] = [];

  // Add restart button on all steps
  controls.push(new Control(
    'control-restart',
    () => {
      setTutorialStepIndex(0);
      sessionStorage.setItem('tutorialStep-Sokopath', '0');
    },
    <div className='flex items-center text-xs gap-1'>
      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' viewBox='0 0 16 16'>
        <path fillRule='evenodd' d='M11.854 3.646a.5.5 0 0 1 0 .708L8.207 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0zM4.707 8l3.647-3.646a.5.5 0 0 1 .708.708L5.414 8l3.648 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0z' />
      </svg>
      Restart Tutorial
    </div>,
    false,
  ));

  if (tutorialStepIndex !== 0) {
    controls.push(prevControl(isPrevButtonDisabled));
  }

  if (tutorialStepIndex !== getTutorialSteps().length - 1) {
    // when you are the furthest you have been in the tutorial (tutorialStepIndexMax) and it is a level, you must complete the level to continue and so the next button is disabled
    // if you come back to this step after beating the level the next button should be enabled
    const atIncompleteLevel = !tutorialStep.isNextButtonDisabled && tutorialStep.gameGrid && tutorialStepIndex === tutorialStepIndexMax;

    controls.push(skipControl());
    !tutorialStep.onSolve && controls.push(nextControl(isNextButtonDisabled || atIncompleteLevel));
  } else {
    controls.push(new Control(
      'restart',
      () => {
        console.log('Restart button clicked - Sokopath');
        setTutorialStepIndex(0);
        sessionStorage.setItem('tutorialStep-Sokopath', '0');
      },
      <span>Restart Tutorial</span>,
      false,
    ));

    controls.push(!isLoggedIn ?
      new Control(
        'control-sign-up',
        () => {
          router.push('/signup');

          return;
        },
        <>Sign up</>,
        false,
        true,
      )
      :
      !game.disableCampaign ?
        new Control(
          'control-campaign',
          () => {
            router.push('/play');
          },
          <>Campaign</>,
          false,
          true,
        )
        :
        new Control(
          'control-home',
          () => {
            router.push('/');
          },
          <>Home</>,
          false,
          true,
        )
    );
  }

  return (
    <Page isFullScreen={!!tutorialStep.editorGrid || !!tutorialStep.gameGrid} title={'Tutorial'}>
      <div className='flex flex-col h-full' id='tutorial-container'>
        <div className='w-full bg-gray-200 h-1 mb-1'>
          <div className='bg-blue-600 h-1' style={{
            width: (100 * tutorialStepIndex / (getTutorialSteps().length - 1)) + '%',
            transition: 'width 0.5s ease'
          }} />
        </div>
        {showNiceJob &&
          <div className='text-4xl glow w-full h-full absolute flex items-center justify-center font-medium z-30'>
            Nice job!
          </div>
        }
        <div className={classNames('w-full text-center', { 'invisible': showNiceJob })}>
          <div className='flex flex-col items-center gap-4 p-4'>
            {tutorialStep.header}
          </div>
          {!tutorialStep.editorGrid && !tutorialStep.gameGrid &&
            <div>
              <Controls controls={controls} />
            </div>
          }
        </div>
        {tutorialStep.editorGrid && tutorialStep.level && (
          <div key={'div-' + tutorialStep.key} className={classNames('grow flex flex-col', tutorialStep.gameClasses)}>
            <BasicLayout
              controls={controls}
              id={'tutorial-' + tutorialStep.key}
              key={tutorialStep.key}
              level={tutorialStep.level}
            />
          </div>
        )}
        {tutorialStep.gameGrid && tutorialStep.level && (
          <div id='game-div-parent' key={'div-' + tutorialStep.key} className={classNames('grow', tutorialStep.gameClasses)}>
            <GameRefactored
              disableCheckpoints={true}
              disablePlayAttempts={true}
              disableStats={true}
              disableScrubber
              extraControls={controls}
              key={tutorialStep.key}
              level={tutorialStep.level}
              onComplete={tutorialStep.onComplete}
              onMove={(gameState: GameState) => {
                if (tutorialStep.onMove) {
                  tutorialStep.onMove(gameState);
                }
              }}
              onSolve={tutorialStep.onSolve}
            />
          </div>
        )}
        <div
          className='bg-white rounded-lg text-black p-3 font-bold justify-center opacity-90 z-30 fadeIn'
          id='tooltip'
          key={'tooltip-' + tutorialStepIndex}
          role='tooltip'
          style={{
            animationDelay: '0.5s',
            display: tooltip ? 'block' : 'none',
          }}
        >
          {!!tooltip &&
            <div className='flex'>
              {tooltip?.title}
              {tooltip?.canClose && <DismissToast onClick={() => setTooltip(undefined)} />}
            </div>
          }
          <div id='arrow' data-popper-arrow />
        </div>
      </div>
    </Page>
  );
}
