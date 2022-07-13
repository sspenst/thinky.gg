import { Instance, createPopper } from '@popperjs/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import EditorLayout from '../components/level/editorLayout';
import Game from '../components/level/game';
import Level from '../models/db/level';
import Link from 'next/link';
import { ObjectId } from 'bson';
import Page from '../components/page';
import getTs from '../helpers/getTs';
import useWindowSize from '../hooks/useWindowSize';

export async function getStaticProps() {
  return {
    props: {}
  };
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
      width: width, ...override
    } as Level;
  }
  const [header, setHeader] = React.useState(<>Please wait...</>);
  const [body, setBody] = React.useState(<></>);
  const [tooltip, setTooltip] = React.useState<any | null>({ title: '', target: null });
  const [tutorialStep, setTutorialStep] = React.useState(0);
  const [domLoaded, setDomLoaded] = React.useState(false);
  const [popperInstance, setPopperInstance] = useState<Instance | null>(null);
  const popperUpdateInterval: any = useRef(null);
  const windowSize = useWindowSize();

  const BLANK_SMALL_GRID = '000\n000\n000';
  const BLANK_LARGE_GRID = '0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000';
  const GRID_WITH_JUST_START = '0000000\n0000000\n0004000\n0000000\n0000000';
  const GRID_WITH_ONLY_END = '00000\n00000\n00000\n00000\n00003';

  const WALL_INTRO = '0000000000\n0000000000\n0000000000\n0400100300\n0000000000\n0000000000\n0000000000';

  const MULTIPLE_ENDINGS = '0000100\n0400000\n0001003\n0000000\n0100030\n0000000\n0303000';

  const MOVABLE_INTRO = '1000004\n1211111\n1000001\n1011103';
  const MOVABLE_EXPLAIN = '0011100\n0410100\n0002200\n0110103\n0000110';
  const MOVABLE_EXPLAIN_EXIT_COVER = '1001114\n1000020\n1011111\n1010002\n1010302\n1011012\n1011012\n0011012\n0000022\n2220022';
  const DIRECTIONAL_MOVABLE_ONLY = '00000\n00206\n00708\n00900\n00900\n00A00\n00B0C\n00D0E\nG0F00\nI0H00\nJ0000';
  const DIRECTIONAL_MOVABLE_EXPLAIN = '46000\n0A010\n0E000\n08010\n06110\n0J223\n0F000';

  const GRID_WITH_ONLY_HOLE_AND_START = '00030\n00000\n15111\n00000\n40000';
  const GRID_WITH_ONLY_HOLE_AND_MOVABLE = '00030\n00000\n15111\n00020\n40000';
  const [nextButton, setNextButton] = React.useState(false);
  const globalTimeout: any = useRef(null);

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
  const ReactToLevel = useCallback((tutorial: any) => {

    if (tutorial?.body) {
      setBody(tutorial.body);
    }

    if (tutorial?.header) {
      setHeader(tutorial.header);
    }

    if (tutorial?.tooltip) {
      setTooltip(tutorial.tooltip);
      // set opacity of tooltip to 0
      const tooltipEl = document.getElementById('tooltip');

      if (tooltipEl) {
        tooltipEl.style.opacity = '0';
      }

      const popperI = setInterval(()=>{
        const target = document.querySelector(tutorial.tooltip.target);

        const tooltipDom = document.querySelector('#tooltip');
        // get y position of target
        const targetY = target?.getBoundingClientRect().top;
        const tooltipEl = document.getElementById('tooltip');

        if (!targetY)
        {
          if (tooltipEl) {
            tooltipEl.style.opacity = '0';
          }

          return;
        }

        if (tooltipEl) {
          tooltipEl.style.opacity = '0.9';
        }

        const instance = createPopper(target, tooltipDom as HTMLElement, {
          placement: tutorial.tooltip.dir || 'top',
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
        setPopperInstance(instance);},
      1); // to allow DOM to get ready for game to finish loading
    } else {
      setTooltip(null);
      setPopperInstance(null);
    }

    if (tutorial?.duration > 0) {
      if (globalTimeout.current) {
        clearTimeout(globalTimeout.current);
      }

      globalTimeout.current = setTimeout(() => {
        setTutorialStep(tutorialStep + 1);
      }, tutorial.duration);
      setNextButton(false);
    } else {
      setNextButton(tutorial?.duration === 0);
    }

    if (tutorial?.duration < 0 ) {
      // set the localstorage value
      localStorage.setItem('tutorialCompletedAt', '' + getTs());
    }
  }, [tutorialStep]);

  // call ReactToLevel when page loads
  const onNextClick = useCallback(() => {
    setTutorialStep(tutorialStep + 1);
  }, [tutorialStep]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomLoaded(true);

      const tutorialMap = [
        {
          header: <div><h1 className='text-3xl p-6'>Welcome to the Pathology tutorial!</h1><div className='text-xl'>In this tutorial you will be walked through the basics of the game.</div></div>,
          duration: 0,
          body: <></>
        },
        {
          header: <div>
            <div className='text-3xl p-6'>Pathology is a grid-based puzzle game.</div>
            <div>The goal of the game is to find a path to the ending square in the <span className='font-bold underline'>shortest</span> amount of steps.</div>
          </div>,
          duration: 0,
          body: <></>
        },
        {
          header: <div className='text-xl p-0'>Some levels can be small... <br/>For example... Here is a 3x3 grid...</div>,
          duration: 0,
          body: <EditorLayout key={1} level={getLevel(BLANK_SMALL_GRID)} />
        },
        {
          header: <div className='text-2xl'>The levels can be large too...</div>,
          duration: 0,
          body: <EditorLayout key={2} level={getLevel(BLANK_LARGE_GRID)} />
        },
        {
          header: <div className='text-xl'>That pink block with a 0 on it. That is your <span className='font-bold'>Start</span> block.</div>,
          duration: 0,
          tooltip: { target: '.block_type_4', title: <div>Start block</div> },
          body: <EditorLayout key={3} level={getLevel(GRID_WITH_JUST_START)} />
        },
        {
          header: <div className='text-xl'>Try moving around using the arrow keys (or swipe with mobile)</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>Watch this block</div> },
          body: <Game key={3} disableServer={true} level={getLevel(GRID_WITH_JUST_START)} onMove={()=>{onNextClick();}}></Game>,
          duration: 99999999
        },
        {
          header: <div className='text-xl'>Try moving around using the arrow keys (or swipe with mobile)</div>,
          duration: 0,
          tooltip: { target: '#Player_default__NLQTF', title: <div>The numbers on the grid will count your steps.</div> },
        },
        {
          header: <div>Here is an Exit block. Your goal is to move your Start Block to the End block. Notice that it has a number on it representing what should be the <span className='font-bold underline'>minimum steps</span> required to reach the end.</div>,
          duration: 0,
          body: <EditorLayout key={4} level={getLevel(GRID_WITH_ONLY_END, { leastMoves: 8 })} />
        },
        {
          header: <div>Try giving this really easy level a shot. Use the <span className='font-bold'>Undo</span> / <span className='font-bold'>Restart</span> buttons (or using &apos;u&apos; or &apos;r&apos; key for shortcut) at the bottom to try again if you mess up.</div>,
          duration: 99999999,
          tooltip: { target: '.block_type_3', title: <div>Move the pink to here in 8 steps.</div>, dir: 'bottom' },
          body: <Game key={5} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(GRID_WITH_ONLY_END, { leastMoves: 8 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
          duration: 0,
        },
        {
          header: <div>Now we can introduce new block types that make the game harder. Try getting to the Exit block now.</div>,
          duration: 99999999,
          body: <Game key={6} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(WALL_INTRO, { leastMoves: 8 })}></Game>
        },
        {
          header: <div>Remember to use the Restart/Undo buttons if you mess up.</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>Notice that you are not able to go through that darker block.</div> },
          duration: 99999999,
          body: <Game key={6} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(WALL_INTRO, { leastMoves: 8 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
          duration: 2000,
        },
        {
          header: <div>Levels can also have more than one exit. Can you find which exit is the winning one? Use the Undo / Restart buttons at the bottom to try again if you mess up.</div>,
          duration: 99999999,
          tooltip: null,
          body: <Game key={7} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(MULTIPLE_ENDINGS, { leastMoves: 6 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
          duration: 2000,
        },
        {
          header: <div>Here is another type of block. Called a Movable block.</div>,
          duration: 0,
          body: <EditorLayout key={8} level={getLevel(MOVABLE_INTRO, { leastMoves: 13 })} />
        },
        {
          header: <div>Try playing this one.</div>,
          tooltip: { target: '.block_movable', title: <div>Push me!</div>, dir: 'right' },
          duration: 99999999,
          body: <Game key={7} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(MOVABLE_INTRO, { leastMoves: 13 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
          duration: 0,
        },
        {
          header: <div><div className='text-2xl'>Movable rules</div> A few rules on movable blocks...</div>,
          tooltip: null,
          duration: 3000,
          body: <></>
        },
        {
          header: <div><div className='text-2xl'>Rule 1</div>You can only push one at a time. If there are two blocks in the way, you will have to find a way to approach from a different angle.<br/>Try playing this one...</div>,
          duration: 99999999,
          body: <Game key={8} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(MOVABLE_EXPLAIN, { leastMoves: 13 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
          duration: 3000,
        },
        {
          header: <div><div className='text-2xl'>Rule 2</div> Movables can cover End blocks (the End blocks are still active)</div>,
          duration: 99999999,
          body: <Game key={9} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(MOVABLE_EXPLAIN_EXIT_COVER, { leastMoves: 26 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          duration: 3000,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
        },
        {
          header: <div><div className='text-2xl'>Directional movables</div>Some Movable blocks are only able to move in certain directions. The orange borders represent which direction you can push the block.</div>,
          duration: 0,
          tooltip: { target: '.block_type_C', title: <div className='text-xs'>Can only be pushed to the right and down</div>, dir: 'auto' },
          body: <EditorLayout key={9} level={getLevel(DIRECTIONAL_MOVABLE_ONLY, { leastMoves: 26 })} />
        },
        {
          header: <div className='text-xl'>Can you find the path? Remember to use the Undo and Restart buttons at the bottom if you get stuck!</div>,
          duration: 99999999,
          body: <Game key={10} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(DIRECTIONAL_MOVABLE_EXPLAIN, { leastMoves: 13 })}></Game>
        },
        {
          header: <div className='text-3xl'>Nice job!</div>,
          duration: 3000,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
        },
        {
          header: <div className='text-2xl'>Alright one LAST block to learn before you are all onboarded to the game...</div>,
          duration: 3500,
          body: <></>
        },
        {
          header: <div className='text-3xl'>Holes.</div>,
          duration: 3000,
          body: <></>
        },
        {
          header: <div className='text-3xl'>Holes.</div>,
          duration: 1000,
          body: <EditorLayout key={11} level={getLevel(GRID_WITH_ONLY_HOLE_AND_START, { leastMoves: 13 })} />
        },
        {
          header: <div className='text-3xl'>This gray block is a hole.</div>,
          duration: 0,
          tooltip: { target: '.square-hole', title: <div>Can&apos;t push me</div> },
          body: <EditorLayout key={11} level={getLevel(GRID_WITH_ONLY_HOLE_AND_START, { leastMoves: 13 })} />
        },
        {
          header: <div className='text-2xl'>Holes are like walls - you can not push them.</div>,
          duration: 0,
          body: <EditorLayout key={11} level={getLevel(GRID_WITH_ONLY_HOLE_AND_START, { leastMoves: 13 })} />
        },
        {
          header: <div className='text-xl'>They can be filled them with Movables. Give this level a shot!</div>,
          duration: 99999999,
          tooltip: { target: '.block_movable', title: <div>Push me in the hole</div> },
          body: <Game key={12} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(GRID_WITH_ONLY_HOLE_AND_MOVABLE, { leastMoves: 15 })}></Game>
        },
        {
          header: <div className='text-xl'>They can be filled them with Movables. Give this level a shot!</div>,
          duration: 99999999,
          body: <Game key={12} disableServer={true} onComplete={()=>{onNextClick();}} level={getLevel(GRID_WITH_ONLY_HOLE_AND_MOVABLE, { leastMoves: 15 })}></Game>
        },
        {
          header: <div className='text-2xl'>Nice job!</div>,
          duration: 3000,
          tooltip: { target: '#Player_default__NLQTF', title: <div>:-)</div> },
        },
        {
          header: <div>
            <div className='text-3xl'>Congratulations on completing the tutorial!</div>
            <div className='text-md'>There is a ton more to the game than just this. An active community, level editor, and thousands of levels to explore.</div>
            <div className='text-xl'>Now <Link href='/signup'><a className='underline font-bold'>sign up</a></Link> to explore the world of Pathology!</div>
          </div>,
          duration: -1,
          body: <></>
        },
      ];

      const curTutorial = tutorialMap[tutorialStep];

      ReactToLevel(curTutorial);

    }
  }, [tutorialStep, onNextClick, ReactToLevel]);

  //  const tooltipClass = 'tooltip bg-gray-200 text-gray-800 rounded text-center p-5';
  const progressBar = <div className='w-full bg-gray-200 h-1 mb-6'>
    <div className='bg-blue-600 h-1' style={{
      width: (100 * tutorialStep / 34) + '%',
      transition: 'width 0.5s ease'
    }}></div>
  </div>;

  if (!windowSize) {
    return null;
  }

  return (
    <Page title={'Pathology'}>
      <div className='overflow-hidden position-fixed w-full justify-center items-center text-center'>
        {progressBar}
        {domLoaded && body && (
          <div className='body' style={{
            height: body.key ? 'inherit' : 0
          }}>
            <div id='game-container' className='overflow-hidden justify-center' style={{ height: windowSize.height * 0.5 }}>
              {body}
            </div>
          </div>
        )}
        <div className='text-l p-6'>{header}</div>
        {tooltip ? (<div className='bg-white rounded-lg text-black p-3 font-bold justify-center opacity-90' id='tooltip' role='tooltip'>{tooltip?.title} <div id='arrow' data-popper-arrow></div>
        </div>
        ) : <div id='tooltip'></div>}

        <div className='p-2'>
          {nextButton && <button type='button' className='inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-4xl leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out' onClick={() => onNextClick()}>Next</button>}
        </div>
      </div>
    </Page>
  );
}
