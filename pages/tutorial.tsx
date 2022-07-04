import { LevelModel, ReviewModel, UserModel } from '../models/mongoose';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

import Dimensions from '../constants/dimensions';
import FormattedReview from '../components/formattedReview';
import Game from '../components/level/game';
import LatestLevelsTable from '../components/latestLevelsTable';
import Level from '../models/db/level';
import Link from 'next/link';
import { ObjectId } from 'bson';
import Page from '../components/page';
import { PageContext } from '../contexts/pageContext';
import Review from '../models/db/review';
import { SWRConfig } from 'swr';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import User from '../models/db/user';
import { clearInterval } from 'timers';
import { createPopper } from '@popperjs/core';
import dbConnect from '../lib/dbConnect';
import getSWRKey from '../helpers/getSWRKey';
import getTs from '../helpers/getTs';
import useLatestLevels from '../hooks/useLatestLevels';
import useLatestReviews from '../hooks/useLatestReviews';
import useUser from '../hooks/useUser';

export async function getStaticProps() {
  return {
    props: {}
  };

}

export default function App() {
  function getLevel(data:string, override:any = {}):Level {
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
  const [tutorialStep, setTutorialStep] = React.useState(0);
  const [domLoaded, setDomLoaded] = React.useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const updateWindowDimensions = () => {
      const newHeight = window.innerHeight;

      setHeight(newHeight);
    };

    window.addEventListener('resize', updateWindowDimensions);

    return () => window.removeEventListener('resize', updateWindowDimensions);

  }, []);

  const BLANK_SMALL_GRID = '000\n000\n000';
  const BLANK_LARGE_GRID = '0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000';
  const GRID_WITH_JUST_START = '0000000\n0000000\n0004000\n0000000\n0000000';
  const GRID_WITH_ONLY_END = '00000\n00000\n00300';

  const WALL_INTRO = '0000000000\n0000000000\n0000000000\n0400100300\n0000000000\n0000000000\n0000000000';

  const MULTIPLE_ENDINGS = '0000100\n0400000\n0001003\n0000000\n0100030\n0000000\n0303000';

  const MOVABLE_INTRO = '1000004\n1211111\n1000001\n1011103';
  const MOVABLE_EXPLAIN = '4202\n2020\n2202\n2022\n3002';
  const MOVABLE_EXPLAIN_EXIT_COVER = '1001114\n1000020\n1011111\n1010002\n1010302\n1011012\n1011012\n0011012\n0000022\n2220022';
  const DIRECTIONAL_MOVABLE_EXPLAIN = '46000\n0A010\n0E000\n08000\n06110\n0J223\n0F000';

  const GRID_WITH_ONLY_HOLE = '00100\n00500\n00000';
  const GRID_WITH_ONLY_HOLE_AND_START = '77777\n40500\n99993';
  const GRID_WITH_ONLY_HOLE_AND_MOVABLE = '77777\n42500\n99993';
  const [nextButton, setNextButton] = React.useState(false);
  const globalTimeout:any = useRef(null);
  const ReactToLevel = useCallback((tutorial:any) => {

    if (tutorial?.body) {
      setBody(tutorial.body);
    }

    if (tutorial?.header) {
      setHeader(tutorial.header);
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
  }, [tutorialStep]);
  // call ReactToLevel when page loads
  const onNextClick = useCallback(() => {
    setTutorialStep(tutorialStep + 1);
  }, [tutorialStep]);

  useEffect(() => {

    if (typeof window !== 'undefined') {
      setDomLoaded(true);
      setHeight(window.innerHeight);
      const parentDiv = document.getElementById('game-container');
      const tutorialMap = [
        {
          header: <div>Welcome to Pathology</div>,
          duration: 0,
          body: <></>
        },
        {
          header: <div>Pathology is a grid based puzzle game.</div>,
          duration: 3000,
          body: <div>The goal of the game is to go from point A to point B in the shortest amount of steps.</div>
        },
        {
          header: <div>Some levels can be small... <br/>For example... Here is a 3x3 grid</div>,
          duration: 4000,
          body: <Game key={1} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(BLANK_SMALL_GRID)}></Game>
        },
        {
          header: <div>But they can be big too...</div>,
          duration: 3000,
          body: <Game key={2} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(BLANK_LARGE_GRID)}></Game>
        },
        {
          header: <div>This is what your Start block looks like. </div>,
          duration: 0,
          tooltip: { target: '#Player_default__NLQTF', title: <div>This is what your Start block looks like.</div> },
          body: <Game key={3} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(GRID_WITH_JUST_START)}></Game>
        },
        {
          header: <div>Try moving around using the arrow keys</div>,
          tooltip: { target: '#Player_default__NLQTF', title: <div>Try moving around using the arrow keys</div> },
          body: <Game key={3} disableServer={true} parentDiv={parentDiv} level={getLevel(GRID_WITH_JUST_START)} onPlayerInput={()=>{onNextClick();}}></Game>,
          duration: 99999999
        },
        {
          header: <div>Notice that there are numbers underneath your character as you move... counting your steps</div>,
          duration: 0,
          tooltip: { target: '#Player_default__NLQTF', title: <div>Try moving around using the arrow keys</div> },
        },
        {
          header: <div>Here is an Exit block. Notice that it has a number on it.<br/>This represents what should be the minimum steps should be to get to the end.</div>,
          duration: 0,
          body: <Game key={4} onPlayerInput={undefined} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_END, { leastMoves: 4 })}></Game>
        },
        {
          header: <div>Try giving this really easy level a shot. Use the Undo / Restart buttons at the bottom to try again if you mess up.</div>,
          duration: 99999999,
          body: <Game key={5} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_END, { leastMoves: 4 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 0,
        },
        {
          header: <div>Now we can introduce new block types that make the game harder. Try getting to the Exit block now.</div>,
          duration: 99999999,
          body: <Game key={6} disableServer={true} onPlayerInput={()=>{onNextClick();}} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(WALL_INTRO, { leastMoves: 8 })}></Game>
        },
        {
          header: <div>Notice that you are not able to go through those darker block. Remember to use the Restart/Undo buttons if you mess up.</div>,
          duration: 99999999,
          body: <Game key={6} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(WALL_INTRO, { leastMoves: 8 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 2000,
        },
        {
          header: <div>Levels can also have more than one exit. Can you find which exit is the winning one? Use the Undo / Restart buttons at the bottom to try again if you mess up.</div>,
          duration: 99999999,
          body: <Game key={7} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(MULTIPLE_ENDINGS, { leastMoves: 6 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 2000,
        },
        {
          header: <div>Here is another type of block. Called a Movable block. Movable blocks can be pushed</div>,
          duration: 0,
          body: <Game key={7} onPlayerInput={undefined} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(MOVABLE_INTRO, { leastMoves: 13 })}></Game>
        },
        {
          header: <div>Try playing this one.</div>,
          duration: 99999999,
          body: <Game key={7} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(MOVABLE_INTRO, { leastMoves: 13 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 0,
        },
        {
          header: <div>A few rules on Movable blocks. First rule: You can only push one at a time.</div>,
          duration: 3000,
          body: <></>
        },
        {
          header: <div>A few rules on Movable blocks. First rule: You can only push one at a time.<br/>Try playing this one</div>,
          duration: 99999999,
          body: <Game key={8} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(MOVABLE_EXPLAIN, { leastMoves: 8 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 3000,
          body: <Game key={8} disableServer={true} onPlayerInput={undefined} onComplete={()=>{undefined;}} parentDiv={parentDiv} level={getLevel(MOVABLE_EXPLAIN, { leastMoves: 8 })}></Game>
        },
        {
          header: <div>Rule 2: Movables can cover End blocks (the End blocks are still active)</div>,
          duration: 99999999,
          body: <Game key={9} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(MOVABLE_EXPLAIN_EXIT_COVER, { leastMoves: 26 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 3000,
          body: <Game key={9} disableInput={true} disableServer={true} onPlayerInput={undefined} onComplete={undefined} parentDiv={parentDiv} level={getLevel(MOVABLE_EXPLAIN_EXIT_COVER, { leastMoves: 26 })}></Game>
        },
        {
          header: <div>So now to kick up the challenge. Some Movable blocks are only able to move in certain directions.</div>,
          duration: 4000,
          body: <></>
        },
        {
          header: <div>Can you find the path? Remember to use the Undo and Restart buttons at the bottom if you get stuck!</div>,
          duration: 99999999,
          body: <Game key={10} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(DIRECTIONAL_MOVABLE_EXPLAIN, { leastMoves: 15 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 3000,
          body: <Game key={10} disableInput={true} disableServer={true} onPlayerInput={undefined} onComplete={undefined} parentDiv={parentDiv} level={getLevel(DIRECTIONAL_MOVABLE_EXPLAIN, { leastMoves: 15 })}></Game>
        },
        {
          header: <div>Alright one LAST block to learn before you are all onboarded to the game...</div>,
          duration: 3500,
          body: <></>
        },
        {
          header: <div>Holes.</div>,
          duration: 3000,
          body: <></>
        },
        {
          header: <div>Holes.</div>,
          duration: 1000,
          body: <Game key={11} onPlayerInput={undefined} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_HOLE_AND_START, { leastMoves: 13 })}></Game>
        },
        {
          header: <div>This gray block is a hole.</div>,
          duration: 0,
          body: <Game key={11} onPlayerInput={undefined} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_HOLE_AND_START, { leastMoves: 13 })}></Game>
        },
        {
          header: <div>Holes are like walls - you can not push them. You can however...</div>,
          duration: 3000,
          body: <Game key={11} onPlayerInput={undefined} disableServer={true} disableInput={true} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_HOLE_AND_START, { leastMoves: 13 })}></Game>
        },
        {
          header: <div>fill them with movables! Give this level a shot!</div>,
          duration: 99999999,
          body: <Game key={12} disableServer={true} onPlayerInput={undefined} onComplete={()=>{onNextClick();}} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_HOLE_AND_MOVABLE, { leastMoves: 5 })}></Game>
        },
        {
          header: <div>Nice job!</div>,
          duration: 3000,
          body: <Game key={12} disableInput={true} disableServer={true} onPlayerInput={undefined} onComplete={undefined} parentDiv={parentDiv} level={getLevel(GRID_WITH_ONLY_HOLE_AND_MOVABLE, { leastMoves: 5 })}></Game>
        },
        {
          header: <div>Congratulations on completing the tutorial.</div>,
          duration: -1,
          body: <></>
        },
      ];

      const curTutorial = tutorialMap[tutorialStep];

      ReactToLevel(curTutorial);

    }
  }, [tutorialStep, onNextClick, ReactToLevel, height]);

  //  const tooltipClass = 'tooltip bg-gray-200 text-gray-800 rounded text-center p-5';

  return (
    <Page title={'Pathology'}>

      <div className='overflow-hidden position-fixed w-full justify-center items-center text-center'>

        {header}
        {domLoaded && body?.key && (
          <div>
            <div id='game-container' className='overflow-hidden justify-center' style={{ height: height * 0.5 }}>
              {body}
            </div>
          </div>
        )}
        <div className='p-2'>
          {nextButton && <button type="button" className='inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-4xl leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out' onClick={() => onNextClick()}>Next</button>}
        </div>
      </div>
    </Page>
  );
}
