/* istanbul ignore file */
import { createPopper, Instance, Placement } from '@popperjs/core';
import { ObjectId } from 'bson';
import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import EditorLayout from '../../components/level/editorLayout';
import Game from '../../components/level/game';
import LayoutContainer from '../../components/level/layoutContainer';
import Page from '../../components/page';
import getTs from '../../helpers/getTs';
import useUser from '../../hooks/useUser';
import useUserConfig from '../../hooks/useUserConfig';
import useWindowSize from '../../hooks/useWindowSize';
import Level from '../../models/db/level';

interface Tooltip {
  dir?: Placement;
  target: string;
  title: JSX.Element;
}

interface TutorialStep {
  body?: JSX.Element;
  duration?: number;
  hasNext?: boolean;
  header: JSX.Element;
  // if the body should be maintained into the next step
  keepPreviousBody?: boolean;
  tooltip?: Tooltip;
}

export default function App() {
  function getLevel(data: string, override: Partial<Level> = {}): Level {
    const sp = data.split('\n');
    const width = sp[0].length;

    return {
      _id: new ObjectId(),
      authorNote: 'test level 1 author note',
      data: data,
      height: sp.length,
      isDraft: false,
      leastMoves: 0,
      name: 'test level 1',
      points: 0,
      ts: getTs(),
      width: width,
      ...override,
    } as Level;
  }

  const [body, setBody] = useState<JSX.Element>();
  const globalTimeout = useRef<NodeJS.Timeout | null>(null);
  const [header, setHeader] = useState(<>Please wait...</>);
  const { mutateUserConfig } = useUserConfig();
  const [nextButton, setNextButton] = useState(false);
  const [popperInstance, setPopperInstance] = useState<Instance | null>(null);
  const popperUpdateInterval = useRef<NodeJS.Timer | null>(null);
  const [prevButton, setPrevButton] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip>();
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const { user } = useUser();
  const windowSize = useWindowSize();

  const BLANK_GRID = '0000000\n0000000\n0000000\n0000000\n0000000';
  const GRID_WITH_PLAYER = '0000000\n0000000\n0004000\n0000000\n0000000';
  const LEVEL_1_ONLY_END = '000000\n000000\n000000\n000030\n000000';
  const LEVEL_1 = '000000\n040000\n000000\n000030\n000000';
  const WALL_INTRO = '00000\n00100\n40100\n00103\n00000';
  const MULTIPLE_ENDS = '0000100\n0400000\n0001003\n0000000\n0100030\n0000000\n0303000';
  const MOVABLE_INTRO = '300\n000\n120\n000\n400';
  const MOVABLE_EXPLAIN = '410100\n002200\n010103\n000110';
  const MOVABLE_EXPLAIN_END_COVER = '00100\n04232\n01010\n00000';
  const RESTRICTED_MOVABLES = '00000\n060E0\n00000\n0D0I0\n00000';
  const RESTRICTED_MOVABLES_EXPLAIN = '4010010\n070C000\n0010013';
  const HOLES_EXPLAIN = '100010\n000053\n000010\n000011';
  const HOLES_INTRO = '100010\n020053\n000010\n004011';

  const niceJobTutorialStep = useCallback(() => {
    return {
      duration: 1500,
      header: <div className='text-3xl'>Nice job!</div>,
      keepPreviousBody: true,
      tooltip: { target: '#player', title: <div>:-)</div> },
    } as TutorialStep;
  }, []);

  const getTutorialSteps = useCallback(() => {
    return [
      {
        hasNext: true,
        header: <div><h1 className='text-3xl p-6'>Welcome to the Pathology tutorial!</h1><div className='text-xl'>In this tutorial you will be walked through the basics of the game.</div></div>,
      },
      {
        body: <EditorLayout key={'tutorial-blank-grid'} level={getLevel(BLANK_GRID)} />,
        hasNext: true,
        header: <div>
          <div className='text-3xl p-6'>Pathology is a grid-based puzzle game.</div>
          <div>The goal of the game is to find a path to an exit in the <span className='font-bold underline'>shortest</span> amount of steps.</div>
        </div>,
      },
      {
        body: <EditorLayout key={'tutorial-player-intro'} level={getLevel(GRID_WITH_PLAYER)} />,
        header: <div className='text-xl'>That block with a 0 on it is the <span className='font-bold'>Player</span> you will be controlling.</div>,
        hasNext: true,
        tooltip: { target: '.block_type_4', title: <div>Player</div> },
      },
      {
        body: <Game key={'tutorial-player-intro'} disableServer={true} level={getLevel(GRID_WITH_PLAYER)} onMove={() => setTutorialStepIndex(i => i + 1)} />,
        header: <div className='text-xl'>Try moving around using the arrow keys (or swipe with mobile).</div>,
        tooltip: { target: '#player', title: <div className='flex'>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            width="100"
            height="68"
            version="1"
          >
            <defs>
              <linearGradient id="shadow">
                <stop offset="0" stopColor="#fff" stopOpacity="1"></stop>
                <stop offset="1" stopColor="#000" stopOpacity="1"></stop>
              </linearGradient>
              <linearGradient
                id="shadow1"
                x1="50"
                x2="50"
                y1="1"
                y2="15.383"
                gradientUnits="userSpaceOnUse"
                spreadMethod="pad"
                xlinkHref="#shadow"
              ></linearGradient>
              <linearGradient
                id="shadow2"
                x1="0"
                x2="15.829"
                y1="34.283"
                y2="49.895"
                gradientUnits="userSpaceOnUse"
                spreadMethod="pad"
                xlinkHref="#shadow"
              ></linearGradient>
            </defs>
            <rect
              id="up"
              width="31"
              height="31"
              x="34.5"
              y="1.5"
              fill="url(#shadow1)"
              fillOpacity="1"
              stroke="#000"
              strokeDasharray="none"
              strokeDashoffset="0"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="4"
              strokeOpacity="1"
              strokeWidth="1"
              rx="5.75"
              ry="5.75"
            ></rect>
            <rect
              id="left"
              width="31"
              height="31"
              x="1.5"
              y="34.5"
              fill="url(#shadow2)"
              fillOpacity="1"
              stroke="#000"
              strokeDasharray="none"
              strokeDashoffset="0"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="4"
              strokeOpacity="1"
              strokeWidth="1"
              rx="5.75"
              ry="5.75"
            ></rect>
            <use
              width="100"
              height="66"
              x="0"
              y="0"
              transform="matrix(.99943 0 0 .99942 .028 33.01)"
              xlinkHref="#up"
            ></use>
            <use
              width="100"
              height="66"
              x="0"
              y="0"
              transform="matrix(-1 0 0 1 100 0)"
              xlinkHref="#left"
            ></use>
            <path
              id="up_arrow"
              fill="#fff"
              fillOpacity="0.5"
              stroke="none"
              strokeDasharray="none"
              strokeDashoffset="0"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="4"
              strokeOpacity="1"
              strokeWidth="1"
              d="M45.778 9h8.444C58.436 9.445 58 13.5 58 16.655c.074 3.469.587 7.603-3.778 8.345h-8.444C41.453 24.524 42 20.258 42 17.034 41.905 13.63 41.537 9.72 45.778 9zm-1.056 11.708l10.556-.125-5.39-9.07-5.166 9.195z"
            ></path>
            <use
              width="100"
              height="66"
              x="0"
              y="0"
              transform="rotate(-90 50.25 50.25)"
              xlinkHref="#up_arrow"
            ></use>
            <use
              width="100"
              height="66"
              x="0"
              y="0"
              transform="matrix(1 0 0 -1 0 67.5)"
              xlinkHref="#up_arrow"
            ></use>
            <use
              width="100"
              height="66"
              x="0"
              y="0"
              transform="rotate(90 49.75 50.25)"
              xlinkHref="#up_arrow"
            ></use>
          </svg>
        </div>
        },
      },
      {
        body: <Game key={'tutorial-player-intro'} disableServer={true} level={getLevel(GRID_WITH_PLAYER)} />,
        hasNext: true,
        header: <div className='text-xl'>The numbers on the grid will count your steps.</div>,
      },
      {
        body: <EditorLayout key={'tutorial-level-1-only-end'} level={getLevel(LEVEL_1_ONLY_END, { leastMoves: 5 })} />,
        hasNext: true,
        header: <div>
          <div className='text-3xl p-6'>This is an exit.</div>
          The &apos;5&apos; here means you may take at most 5 moves to reach the exit.</div>,
        tooltip: { target: '.block_type_3', title: <div>Exit</div>, dir: 'top' },
      },
      {
        body: <Game key={'tutorial-level-1'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(LEVEL_1, { leastMoves: 5 })} />,
        header: <div>
          <div className='text-3xl p-6'>Try completing your first level!</div>
          Use the <span className='font-bold'>Restart</span> / <span className='font-bold'>Undo</span> buttons at the bottom (or press &apos;R&apos; / &apos;U&apos;) to try again if you make a mistake.</div>,
        tooltip: { target: '.block_type_3', title: <div>Move the Player here in 5 steps</div>, dir: 'bottom' },
      },
      niceJobTutorialStep(),
      {
        body: <Game key={'tutorial-wall'} disableServer={true} onMove={() => setTutorialStepIndex(i => i + 1)} level={getLevel(WALL_INTRO, { leastMoves: 7 })} />,
        header: <>
          <div className='text-2xl pb-3'>Try getting to the exit now.</div>
          <div>Remember to use the Restart/Undo buttons if you make a mistake.</div>
        </>,
      },
      {
        body: <Game key={'tutorial-wall'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(WALL_INTRO, { leastMoves: 7 })} />,
        header: <>
          <div className='text-2xl pb-3'>Try getting to the exit now.</div>
          <div>Remember to use the Restart/Undo buttons if you make a mistake.</div>
        </>,
        tooltip: { target: '.block_type_1', title: <div>Notice you are not able to go through walls</div> },
      },
      niceJobTutorialStep(),
      {
        body: <Game key={'tutorial-ends'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(MULTIPLE_ENDS, { leastMoves: 6 })} />,
        header: <>
          <div className='text-2xl pb-3'>There can be multiple exits.</div>
          <div>Can you find which can be reached in 6 moves? Remember to use the Restart/Undo buttons if you make a mistake.</div>
        </>,
      },
      niceJobTutorialStep(),
      {
        body: <Game key={'tutorial-movable'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(MOVABLE_INTRO, { leastMoves: 6 })} />,
        header: <>
          <div className='text-2xl pb-3'>This new block can be moved.</div>
          <div>Try to get to the exit! Remember to use the Restart/Undo buttons if you make a mistake.</div>
        </>,
      },
      niceJobTutorialStep(),
      {
        body: <Game key={'tutorial-movable-explain'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(MOVABLE_EXPLAIN, { leastMoves: 11 })} />,
        header: <div><div className='text-2xl pb-3'>You can only push one block at a time.</div>Try playing this one! Remember to use the Restart/Undo buttons if you make a mistake.</div>,
      },
      niceJobTutorialStep(),
      {
        body: <Game key={'tutorial-movable-explain-end-cover'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(MOVABLE_EXPLAIN_END_COVER, { leastMoves: 8 })} />,
        header: <div><div className='text-2xl pb-3'>Movable blocks can cover exits.</div>Remember where the exit is if you&apos;ve covered it up!</div>,
      },
      niceJobTutorialStep(),
      {
        body: <EditorLayout key={'tutorial-restricted-movables'} level={getLevel(RESTRICTED_MOVABLES)} />,
        hasNext: true,
        header: <div><div className='text-2xl pb-3'>These are restricted movables.</div>Some movable blocks can only move in certain directions. The borders represent which sides of the block can be pushed.</div>,
        tooltip: { target: '.block_type_D', title: <div>Can only be pushed down and to the left</div>, dir: 'bottom' },
      },
      {
        body: <Game key={'tutorial-restricted-movables-explain'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(RESTRICTED_MOVABLES_EXPLAIN, { leastMoves: 12 })} />,
        header: <div><div className='text-xl pb-3'>Can you find the path through these restricted movables?</div>Remember to use the Restart/Undo buttons at the bottom if you make a mistake.</div>,
      },
      niceJobTutorialStep(),
      {
        body: <EditorLayout key={'tutorial-holes-explain'} level={getLevel(HOLES_EXPLAIN, { leastMoves: 9 })} />,
        hasNext: true,
        header: <>
          <div className='text-2xl pb-3'>Alright one LAST block to learn!</div>
          <div className='text-xl pb-3'>The new block above is a hole.</div>
          <div>Holes cannot be pushed, but they can be filled with any movable block.</div>
        </>,
        tooltip: { target: '.square-hole', title: <div>Hole</div> },
      },
      {
        body: <Game key={'tutorial-holes-intro'} disableServer={true} onComplete={() => setTutorialStepIndex(i => i + 1)} level={getLevel(HOLES_INTRO, { leastMoves: 9 })} />,
        header: <div className='text-xl'>Try using this movable block to cross over the hole!</div>,
      },
      niceJobTutorialStep(),
      {
        header: <div>
          <div className='text-3xl pb-3'>Congratulations on completing the tutorial!</div>
          <div className='text-xl pb-3'>There is a ton more to the game than just this:<br />An active community, level editor, and thousands of levels to explore.</div>
          {user ?
            <div className='text-xl' style={{ pointerEvents: 'all' }}>
              {'Next you can continue your Pathology journey with the '}
              <Link href='/collection/61fe329e5d3a34bc11f62345'>
                <a className='underline font-bold'>
                  Campaign
                </a>
              </Link>
              !
            </div>
            :
            <div className='text-xl' style={{ pointerEvents: 'all' }}>Now <Link href='/signup'><a className='underline font-bold'>sign up</a></Link> to explore the world of Pathology!</div>
          }
        </div>,
      },
    ] as TutorialStep[];
  }, [niceJobTutorialStep, user]);

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

  const applyTutorialStep = useCallback(async (tutorialStep: TutorialStep) => {
    if (!tutorialStep.keepPreviousBody) {
      setBody(tutorialStep.body);
    }

    if (tutorialStep.duration) {
      if (globalTimeout.current) {
        clearTimeout(globalTimeout.current);
      }

      globalTimeout.current = setTimeout(() => {
        setTutorialStepIndex(tutorialStepIndex + 1);
      }, tutorialStep.duration);
    }

    setHeader(tutorialStep.header);
    setNextButton(!!tutorialStep.hasNext);
    setPrevButton(!!tutorialStep.hasNext && tutorialStepIndex > 0);
    setTooltip(tutorialStep.tooltip);

    if (tutorialStep.tooltip) {
      // set opacity of tooltip to 0
      const tooltipEl = document.getElementById('tooltip');

      if (tooltipEl) {
        tooltipEl.style.opacity = '0';
      }

      // loop every 1ms until DOM has loeaded, then show the tooltip
      const popperI = setInterval(() => {
        if (!tutorialStep.tooltip) {
          return;
        }

        const tooltipEl = document.getElementById('tooltip');

        if (!tooltipEl) {
          return;
        }

        const target = document.querySelector(tutorialStep.tooltip.target);
        // get y position of target
        const targetY = target?.getBoundingClientRect().top;

        if (!targetY) {
          tooltipEl.style.opacity = '0';

          return;
        }

        tooltipEl.style.opacity = '0.9';

        const instance = createPopper(target, tooltipEl, {
          placement: tutorialStep.tooltip.dir || 'top',
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 10]
              }
            }
          ]
        });

        clearInterval(popperI);
        setPopperInstance(instance);
      }, 1);
    } else {
      setPopperInstance(null);
    }
  }, [tutorialStepIndex]);

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
      mutateUserConfig();
    }).catch(err => {
      console.error('Error setting tutorialCompletedAt', err);
    });
  }, [mutateUserConfig]);

  useEffect(() => {
    const tutorialSteps = getTutorialSteps();

    applyTutorialStep(tutorialSteps[tutorialStepIndex]);

    // mark tutorial as completed on the last step
    if (tutorialSteps.length - 1 === tutorialStepIndex) {
      if (user) {
        putTutorialCompletedAt(getTs());
        window.localStorage.removeItem('tutorialCompletedAt');
      } else {
        localStorage.setItem('tutorialCompletedAt', '' + getTs());
      }
    }
  }, [applyTutorialStep, getTutorialSteps, putTutorialCompletedAt, tutorialStepIndex, user]);

  const onPrevClick = useCallback(() => {
    const steps = getTutorialSteps();

    for (let i = tutorialStepIndex - 1; i >= 0; i--) {
      if (steps[i].hasNext) {
        setTutorialStepIndex(i);
        break;
      }
    }
  }, [getTutorialSteps, tutorialStepIndex]);

  const progressBar = <div className='w-full bg-gray-200 h-1 mb-6'>
    <div className='bg-blue-600 h-1' style={{
      width: (100 * tutorialStepIndex / (getTutorialSteps().length - 1)) + '%',
      transition: 'width 0.5s ease'
    }}></div>
  </div>;

  if (!windowSize) {
    return null;
  }

  return (
    <Page title={'Pathology'}>
      <div className='overflow-hidden position-fixed w-full justify-center items-center text-center' style={{
        height: '100%',
        margin: 0
      }}>
        {progressBar}
        {body && (
          <div className='body' style={{
            height: body.key ? 'inherit' : 0,
          }}>
            <LayoutContainer height={windowSize.height * 0.5}>
              {body}
            </LayoutContainer>
          </div>
        )}
        <div className='text-l p-6' style={{
          pointerEvents: 'none',
        }}>{header}</div>
        {tooltip ? (<div className='bg-white rounded-lg text-black p-3 font-bold justify-center opacity-90' id='tooltip' role='tooltip'>{tooltip.title} <div id='arrow' data-popper-arrow></div></div>) : <div id='tooltip'></div>}
        <div className='p-2 self-center flex flex-cols-2 gap-2 justify-center'>
          {prevButton && <button type='button' className='inline-flex p-3 bg-blue-500 text-gray-300 font-medium text-4xl rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out' onClick={onPrevClick}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="bi bi-arrow-left-short" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z" />
          </svg>Prev</button>}
          {nextButton && <button type='button' className='inline-flex p-3 bg-blue-500 text-gray-300 font-medium text-4xl rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out' onClick={() => setTutorialStepIndex(i => i + 1)}>Next<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" className="bi bi-arrow-right-short" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z" />
          </svg></button>}
        </div>
      </div>
    </Page>
  );
}
