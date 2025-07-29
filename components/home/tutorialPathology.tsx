/* istanbul ignore file */

import { createPopper, Instance, Placement } from '@popperjs/core';
import styles from '@root/components/level/Controls.module.css';
import { directionToVector } from '@root/constants/direction';
import TileType from '@root/constants/tileType';
import { GameState } from '@root/helpers/gameStateHelpers';
import classNames from 'classnames';
import { ArrowBigDown, Trophy } from 'lucide-react';
import { Types } from 'mongoose';
import Link from 'next/link';
import { JSX, useCallback, useContext, useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import { TimerUtil } from '../../helpers/getTs';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Position from '../../models/position';
import BasicLayout from '../level/basicLayout';
import Controls from '../level/controls';
import GameRefactored from '../level/game-refactored';
import { dropConfetti } from '../page/confetti';
import Page from '../page/page';
import DismissToast from '../toasts/dismissToast';
import SteppedUsernameSelector from '../forms/steppedUsernameSelector';

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
  onMove?: (gameState: GameState) => void;
  onSolve?: () => void;
  // number of steps back using the previous button
  prevSteps?: number;
  tooltips?: Tooltip[];
}

interface TutorialPathologyProps {
  recaptchaPublicKey?: string | null;
}

export default function TutorialPathology({ recaptchaPublicKey }: TutorialPathologyProps) {
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

  const globalTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isNextButtonDisabled, setIsNextButtonDisabled] = useState(false);
  const [isPrevButtonDisabled, setIsPrevButtonDisabled] = useState(false);
  const { mutateUser, user, deviceInfo } = useContext(AppContext);
  const [popperInstance, setPopperInstance] = useState<Instance | null>(null);
  const popperUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const [showNiceJob, setShowNiceJob] = useState(false);
  const [tooltips, setTooltips] = useState<Tooltip[] | undefined>(undefined);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialStepIndexMax, setTutorialStepIndexMax] = useState(0);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const isLoggedIn = !!user;

  // Inline signup state
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  

  const LEVEL_1 = '000000\n040000\n000000\n000030\n000000';
  const WALL_INTRO = '00000\n00100\n40100\n00103\n00000';
  const MULTIPLE_ENDS = '0000100\n0400000\n0001003\n0000000\n0100030\n0000000\n0303000';
  const MOVABLE_INTRO = '400\n000\n120\n000\n300';
  const MOVABLE_EXPLAIN = '410100\n002200\n010103\n000110';
  const MOVABLE_EXPLAIN_END_COVER = '00100\n04232\n01010\n00000';
  const RESTRICTED_MOVABLES = '00000\n060E0\n00000\n0D0I0\n00000';
  const RESTRICTED_MOVABLES_EXPLAIN = '4010010\n070C000\n0010013';
  const HOLES_INTRO = '000010\n080053\n000010\n004011';


  // Inline signup function
  const handleInlineSignup = useCallback(async () => {
    if (!username || !email || !password) return;

    // Handle reCAPTCHA logic
    if (recaptchaPublicKey) {
      if (!showRecaptcha) {
        setShowRecaptcha(true);
        return;
      }

      if (!recaptchaToken) {
        toast.error('Please complete the recaptcha');
        return;
      }

      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    }

    setIsSigningUp(true);
    toast.loading('Creating account...');

    try {
      const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';
      const utm_source = window.localStorage.getItem('utm_source') || '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        name: username,
        email,
        password,
        tutorialCompletedAt: parseInt(tutorialCompletedAt),
        utm_source: utm_source
      };

      if (recaptchaToken) {
        body.recaptchaToken = recaptchaToken;
      }

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Account created! Welcome to Pathology!');
        mutateUser();
        
        // Redirect to play page after successful signup
        window.location.href = '/play';
      } else {
        const errorData = await response.json();
        toast.dismiss();
        toast.error(errorData.error || 'Failed to create account');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  }, [username, email, password, mutateUser, recaptchaPublicKey, showRecaptcha, recaptchaToken]);

  // Auto-submit when reCAPTCHA token is received
  useEffect(() => {
    if (recaptchaToken.length > 0) {
      handleInlineSignup();
    }
  }, [handleInlineSignup, recaptchaToken]);

  useEffect(() => {
    if (tutorialStepIndex > tutorialStepIndexMax) {
      setTutorialStepIndexMax(tutorialStepIndex);
    }
  }, [tutorialStepIndex, tutorialStepIndexMax]);

  const initializeTooltip = useCallback((tooltips: Tooltip[] | undefined) => {
    setTooltips(tooltips);

    if (tooltips && tooltips.length > 0) {
      // loop every 1ms until DOM has loaded, then show all tooltips
      const popperI = setInterval(() => {
        if (!tooltips || tooltips.length === 0) {
          return;
        }

        tooltips.forEach((tooltip, index) => {
          const tooltipEl = document.getElementById(`tooltip-${index}`);

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

          setPopperInstance(instance);
        });

        clearInterval(popperI);
      }, 1);
    } else {
      setPopperInstance(null);
    }
  }, []);

  const niceJob = useCallback(() => {
    // set opacity of tooltip to 0
    const tooltipEl = document.getElementById('tooltip');

    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.display = 'none';
    }

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
      sessionStorage.setItem('tutorialStep-Pathology', (tutorialStepIndex + 1).toString());
      setTutorialStepIndex(i => i + 1);
    }, 1500);
  }, [tutorialStepIndex]);

  const prevControl = useCallback((disabled = false) => new Control(
    'control-prev',
    () => {
      setTutorialStepIndex(i => i - 1);
      sessionStorage.setItem('tutorialStep-Pathology', (tutorialStepIndex - 1).toString());
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
      sessionStorage.setItem('tutorialStep-Pathology', (tutorialStepIndex + 1).toString());
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
        header: <div className='flex flex-row items-center gap-4'>
          <div><div className='text-3xl'>Pathology</div>
            <div className='text-xl'>Starting at the pink block, reach the white exit block in the <b>shortest</b> number of steps.</div>
          </div>
          {deviceInfo.isMobile && <video autoPlay loop muted playsInline className='w-80 h-40 rounded-xl' src='https://i.imgur.com/7sYpgCt.mp4' />}
        </div>,
        key: 'tutorial-level-1',
        level: getLevel(LEVEL_1, { leastMoves: 5 }),
        onMove: (gameState: GameState) => {
          const undoButton = document.getElementById('btn-undo') as HTMLButtonElement;

          // get manhattan distance to the exit
          const manhattanDistance = Math.abs(gameState.pos.x - 4) + Math.abs(gameState.pos.y - 3);
          const tooltipEl = document.getElementById('tooltip-0');

          if (tooltipEl) {
            tooltipEl.innerHTML = 'Good!';
            // add fade out class
            tooltipEl.classList.add('fadeOut');
          }

          // fade out all tooltips
          let msg = 'Wrong way!';

          if (manhattanDistance <= 5) {
            msg = manhattanDistance + ' steps left!';

            if (manhattanDistance <= 0) {
              msg = 'You get the idea!';
            }
          }

          // change the tooltip-1 title to 'Almost there!'
          const tooltipEl2 = document.getElementById('tooltip-1');

          // NB: advanced undo notification for the very first level
          // notify the user to undo if they have gone past the exit (too far right or down)
          // or if they have gone left or up at any point
          if (gameState.pos.x > 4 || gameState.pos.y > 3 || gameState.moves.some(move => {
            const pos = directionToVector(move.direction);

            return pos.equals(new Position(-1, 0)) || pos.equals(new Position(0, -1));
          })) {
            msg = 'Wrong way!';
            undoButton?.classList.add(styles['highlight-red']);
          } else {
            undoButton?.classList.remove(styles['highlight-red']);
          }

          if (tooltipEl2) {
            tooltipEl2.innerHTML = msg;

            // add fade out class
            if (manhattanDistance <= 0) {
              tooltipEl2.classList.add('fadeOut');
            }
          }
        },
        onSolve: niceJob,
        tooltips: [
          {
            target: '#player',
            title: <div className='flex'>
              {
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(typeof window !== 'undefined' ? navigator.userAgent : '') === false ? (
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    xmlnsXlink='http://www.w3.org/1999/xlink'
                    width='100'
                    height='68'
                    version='1'
                  >
                    <defs>
                      <linearGradient id='shadow'>
                        <stop offset='0' stopColor='#fff' stopOpacity='1' />
                        <stop offset='1' stopColor='#000' stopOpacity='1' />
                      </linearGradient>
                      <linearGradient
                        id='shadow1'
                        x1='50'
                        x2='50'
                        y1='1'
                        y2='15.383'
                        gradientUnits='userSpaceOnUse'
                        spreadMethod='pad'
                        xlinkHref='#shadow'
                      />
                      <linearGradient
                        id='shadow2'
                        x1='0'
                        x2='15.829'
                        y1='34.283'
                        y2='49.895'
                        gradientUnits='userSpaceOnUse'
                        spreadMethod='pad'
                        xlinkHref='#shadow'
                      />
                    </defs>
                    <rect
                      id='up'
                      width='31'
                      height='31'
                      x='34.5'
                      y='1.5'
                      fill='url(#shadow1)'
                      fillOpacity='1'
                      stroke='#000'
                      strokeDasharray='none'
                      strokeDashoffset='0'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeMiterlimit='4'
                      strokeOpacity='1'
                      strokeWidth='1'
                      rx='5.75'
                      ry='5.75'
                    />
                    <rect
                      id='left'
                      width='31'
                      height='31'
                      x='1.5'
                      y='34.5'
                      fill='url(#shadow2)'
                      fillOpacity='1'
                      stroke='#000'
                      strokeDasharray='none'
                      strokeDashoffset='0'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeMiterlimit='4'
                      strokeOpacity='1'
                      strokeWidth='1'
                      rx='5.75'
                      ry='5.75'
                    />
                    <use
                      width='100'
                      height='66'
                      x='0'
                      y='0'
                      transform='matrix(.99943 0 0 .99942 .028 33.01)'
                      xlinkHref='#up'
                    />
                    <use
                      width='100'
                      height='66'
                      x='0'
                      y='0'
                      transform='matrix(-1 0 0 1 100 0)'
                      xlinkHref='#left'
                    />
                    <path
                      id='up_arrow'
                      fill='#fff'
                      fillOpacity='0.5'
                      stroke='none'
                      strokeDasharray='none'
                      strokeDashoffset='0'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeMiterlimit='4'
                      strokeOpacity='1'
                      strokeWidth='1'
                      d='M45.778 9h8.444C58.436 9.445 58 13.5 58 16.655c.074 3.469.587 7.603-3.778 8.345h-8.444C41.453 24.524 42 20.258 42 17.034 41.905 13.63 41.537 9.72 45.778 9zm-1.056 11.708l10.556-.125-5.39-9.07-5.166 9.195z'
                    />
                    <use
                      width='100'
                      height='66'
                      x='0'
                      y='0'
                      transform='rotate(-90 50.25 50.25)'
                      xlinkHref='#up_arrow'
                    />
                    <use
                      width='100'
                      height='66'
                      x='0'
                      y='0'
                      transform='matrix(1 0 0 -1 0 67.5)'
                      xlinkHref='#up_arrow'
                    />
                    <use
                      width='100'
                      height='66'
                      x='0'
                      y='0'
                      transform='rotate(90 49.75 50.25)'
                      xlinkHref='#up_arrow'
                    />
                  </svg>
                ) : (
                  <div>Your player</div>
                )}
            </div>,
            dir: 'bottom',
            canClose: true,
          },
          { canClose: true, target: '.tile-type-3', title: <div>Move the Player here in 5 moves</div>, dir: 'bottom' },
        ],
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-wall-header' className='text-3xl fadeIn'>Try getting to the exit now.</div>,
        key: 'tutorial-wall',
        level: getLevel(WALL_INTRO, { leastMoves: 7 }),
        onSolve: niceJob,
        tooltips: [
          { canClose: true, target: '.tile-type-1', title: <div>You are not able to go through walls</div> },
        ],
        onMove: (gameState: GameState) => {
          const tooltipEl = document.getElementById('tooltip-0');
          const manhattanDistance = Math.abs(gameState.pos.x - 4) + Math.abs(gameState.pos.y - 3);

          if (tooltipEl && manhattanDistance <= 0) {
            // add fade out class
            tooltipEl.classList.add('fadeOut');
            tooltipEl.innerHTML = 'Good!';
          }
        },
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-ends-header' className='text-3xl fadeIn'>There can be multiple exits.</div>,
        key: 'tutorial-ends',
        level: getLevel(MULTIPLE_ENDS, { leastMoves: 6 }),
        onSolve: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-movable-header' className='text-3xl fadeIn'>Blocks with borders can be pushed by the player.</div>,
        key: 'tutorial-movable',
        level: getLevel(MOVABLE_INTRO, { leastMoves: 6 }),
        onSolve: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-movable-explain-header' className='text-3xl fadeIn'>You can only push one block at a time.</div>,
        key: 'tutorial-movable-explain',
        level: getLevel(MOVABLE_EXPLAIN, { leastMoves: 11 }),
        onSolve: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div className='text-3xl'>Blocks can cover exits.</div>,
        key: 'tutorial-movable-explain-end-cover',
        level: getLevel(MOVABLE_EXPLAIN_END_COVER, { leastMoves: 8 }),
        onSolve: niceJob,
      },
      {
        gameClasses: 'fadeIn',
        gameGrid: true,
        header: <div key='tutorial-restricted-movables-explain-header' className='text-3xl fadeIn'>Find the path through these restricted blocks!</div>,
        key: 'tutorial-restricted-movables-explain',
        level: getLevel(RESTRICTED_MOVABLES_EXPLAIN, { leastMoves: 12 }),
        onSolve: niceJob,
      },
      {
        gameGrid: true,
        header: <div key='tutorial-holes-intro' className='text-3xl fadeIn'>
          <div>
            <div className='text-3xl mb-2'>Lastly, holes.</div>
            <div className='text-xl'>Holes can be filled with any block to create a bridge.</div>
          </div>
        </div>,
        key: 'tutorial-holes-intro',
        level: getLevel(HOLES_INTRO, { leastMoves: 9 }),
        tooltips: [
          { target: '.tile-type-5', title: <div className='flex flex-col items-center'>Hole <ArrowBigDown /></div> },
        ],
        onMove: () => {
          const tooltipEl = document.getElementById('tooltip-0');

          if (tooltipEl) {
            // add fade out class
            tooltipEl.classList.add('fadeOut');
          }
        },
        onSolve: niceJob,
      },
      {
        header: <div className='flex flex-col gap-6 max-w-md mx-auto'>
          <div className='text-center'>
            <Trophy className='mx-auto mb-3 text-yellow-400' size={40} />
            <div className='text-2xl font-bold mb-1 text-white fadeIn'>
              Great work!
            </div>
            <div className='text-base text-gray-300 fadeIn' style={{ animationDelay: '0.2s' }}>
              You&apos;ve completed the tutorial
            </div>
          </div>
          {isLoggedIn ? (
            <div className='text-center'>
              <Link
                href='/chapter/1'
                className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg text-center transition-colors duration-200 fadeIn inline-block'
                style={{
                  pointerEvents: 'all',
                  animationDelay: '0.4s'
                }}
              >
                Start Campaign →
              </Link>
            </div>
          ) : (
            <>
              <div className='bg-gray-800 rounded-lg p-4 fadeIn' style={{ animationDelay: '0.4s' }}>
                <div className='text-center mb-3'>
                  <div className='text-sm text-gray-400 mb-1'>Join thousands of players</div>
                  <div className='text-white font-medium'>Don&apos;t lose your progress!</div>
                </div>
                <div className='space-y-2 text-sm text-gray-300'>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-400 rounded-full' />
                    <span>Save your solutions & compete on leaderboards</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-400 rounded-full' />
                    <span>Track your solving stats & improvement</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-400 rounded-full' />
                    <span>Unlock achievements & new puzzles</span>
                  </div>
                </div>
              </div>
              {!showEmailSignup ? (
                <div className='space-y-3'>
                  <button
                    onClick={() => {
                      sessionStorage.setItem('oauth_redirect', window.location.pathname);
                      window.location.href = '/api/auth/discord';
                    }}
                    className='w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-4 px-4 rounded-lg transition-colors duration-200 fadeIn'
                    style={{
                      pointerEvents: 'all',
                      animationDelay: '0.6s'
                    }}
                  >
                    <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                      <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                    </svg>
                    Continue with Discord
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.setItem('oauth_redirect', window.location.pathname);
                      window.location.href = '/api/auth/google';
                    }}
                    className='w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-4 rounded-lg border border-gray-300 transition-colors duration-200 fadeIn'
                    style={{
                      pointerEvents: 'all',
                      animationDelay: '0.7s'
                    }}
                  >
                    <svg className='w-5 h-5' viewBox='0 0 24 24'>
                      <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                      <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                      <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                      <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                    </svg>
                    Continue with Google
                  </button>
                  <button
                    onClick={() => setShowEmailSignup(true)}
                    className='w-full bg-gray-700 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors duration-200 fadeIn text-sm'
                    style={{
                      pointerEvents: 'all',
                      animationDelay: '0.8s'
                    }}
                    type='button'
                  >
                    Sign up with email instead
                  </button>
                  <div className='text-center'>
                    <Link
                      href='/play-as-guest'
                      className='text-gray-400 hover:text-gray-300 text-sm underline transition-colors duration-200 fadeIn'
                      style={{
                        pointerEvents: 'all',
                        animationDelay: '0.9s'
                      }}
                    >
                      Continue as guest
                    </Link>
                  </div>
                </div>
              ) : (
                <div className='fadeIn'>
                  <SteppedUsernameSelector
                    username={username}
                    setUsername={setUsername}
                    onUsernameConfirmed={() => {}}
                    className='w-full'
                    usernameFieldProps={{
                      className: 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      labelClassName: 'text-sm font-medium text-white'
                    }}
                  >
                    <div>
                      <label className='block text-sm font-medium text-white mb-2' htmlFor='tutorial-email'>Email</label>
                      <input
                        id='tutorial-email'
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder='Email'
                        className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-white mb-2' htmlFor='tutorial-password'>Password</label>
                      <input
                        id='tutorial-password'
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Password (8+ characters)'
                        className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div className='flex justify-center'>
                      {recaptchaPublicKey && showRecaptcha ? (
                        <ReCAPTCHA
                          onChange={(token) => {
                            setRecaptchaToken(token ?? '');
                          }}
                          ref={recaptchaRef}
                          sitekey={recaptchaPublicKey}
                        />
                      ) : (
                        <button
                          onClick={() => handleInlineSignup()}
                          disabled={!email || !password || password.length < 8 || isSigningUp}
                          className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200'
                        >
                          {isSigningUp ? 'Creating Account...' : 'Create Account & Continue'}
                        </button>
                      )}
                    </div>
                    <div className='flex justify-center'>
                      <span
                        onClick={() => setShowEmailSignup(false)}
                        className='text-gray-400 hover:text-gray-300 text-sm underline transition-colors duration-200 cursor-pointer'
                      >
                        Back to social login
                      </span>
                    </div>
                    <div className='text-center'>
                      <Link
                        href='/play-as-guest'
                        className='text-gray-400 hover:text-gray-300 text-sm underline transition-colors duration-200'
                      >
                        Continue as guest
                      </Link>
                    </div>
                  </SteppedUsernameSelector>
                </div>
              )}
            </>
          )}
        </div>,
      },
    ] as TutorialStep[];
  }, [deviceInfo.isMobile, isLoggedIn, niceJob, showEmailSignup, username, email, password, isSigningUp, handleInlineSignup, recaptchaPublicKey, showRecaptcha, recaptchaToken]);

  useEffect(() => {
    const sessionStorageTutorialStep = sessionStorage.getItem('tutorialStep-Pathology');

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
          sessionStorage.setItem('tutorialStep-Pathology', (getTutorialSteps().length - 1).toString());

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
    setPopperInstance(null);

    const tutorialSteps = getTutorialSteps();
    const tutorialStep = tutorialSteps[tutorialStepIndex];

    setIsNextButtonDisabled(!!tutorialStep.isNextButtonDisabled);
    setIsPrevButtonDisabled(false);
    initializeTooltip(tutorialStep.tooltips);

    // mark tutorial as completed on the last step
    if (tutorialSteps.length - 1 === tutorialStepIndex) {
      // Trigger confetti celebration only once
      if (!hasTriggeredConfetti) {
        setTimeout(() => {
          dropConfetti();
        }, 500);
        setHasTriggeredConfetti(true);
      }

      if (isLoggedIn) {
        putTutorialCompletedAt(TimerUtil.getTs());
        window.localStorage.removeItem('tutorialCompletedAt');
      } else {
        localStorage.setItem('tutorialCompletedAt', '' + TimerUtil.getTs());
      }
    }
  }, [getTutorialSteps, initializeTooltip, isLoggedIn, putTutorialCompletedAt, tutorialStepIndex, hasTriggeredConfetti]);

  const tutorialStep = getTutorialSteps()[tutorialStepIndex];

  useEffect(() => {
    setTimeout(() => {
      const nextId = document.getElementById('control-next') as HTMLButtonElement;

      // if nextId doesn't have class pointer-events-none
      if (nextId) {
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
  const isLastStep = tutorialStepIndex === getTutorialSteps().length - 1;

  if (tutorialStepIndex !== 0) {
    // Make prev button more muted on last step
    const mutedPrevControl = new Control(
      'control-prev',
      () => {
        setTutorialStepIndex(i => i - 1);
        sessionStorage.setItem('tutorialStep-Pathology', (tutorialStepIndex - 1).toString());
      },
      <div className={`flex justify-center ${isLastStep ? 'opacity-40 text-xs' : ''}`}>
        <svg xmlns='http://www.w3.org/2000/svg' width={isLastStep ? '16' : '24'} height={isLastStep ? '16' : '24'} fill='currentColor' className='bi bi-arrow-left-short' viewBox='0 0 16 16'>
          <path fillRule='evenodd' d='M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z' />
        </svg>
        <span className='pr-2 self-center'>
          Prev
        </span>
      </div>,
      isPrevButtonDisabled,
    );
    controls.push(mutedPrevControl);
  }

  if (!isLastStep) {
    // when you are the furthest you have been in the tutorial (tutorialStepIndexMax) and it is a level, you must complete the level to continue and so the next button is disabled
    // if you come back to this step after beating the level the next button should be enabled
    const atIncompleteLevel = !tutorialStep.isNextButtonDisabled && tutorialStep.gameGrid && tutorialStepIndex === tutorialStepIndexMax;

    controls.push(skipControl());
    !tutorialStep.onSolve && controls.push(nextControl(isNextButtonDisabled || atIncompleteLevel));
  } else {
    // Muted restart button on final step
    controls.push(new Control(
      'restart',
      () => {
        setTutorialStepIndex(0);
        return;
      },
      <button onClick={() => setTutorialStepIndex(0)} className='opacity-40 text-xs'>
        Restart Tutorial
      </button>,
      false,
    ));
  }

  return (
    <Page hideFooter={deviceInfo.isMobile} isFullScreen={!!tutorialStep.editorGrid || !!tutorialStep.gameGrid} title={'Tutorial'}>
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
              onMove={(gameState: GameState) => {
                const restartButton = document.getElementById('btn-restart') as HTMLButtonElement;

                // show restart notification if they have reached the exit in too many moves
                if (gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.Exit && gameState.moves.length > (tutorialStep.level?.leastMoves ?? 0)) {
                  restartButton?.classList.add(styles['highlight-red']);
                } else {
                  restartButton?.classList.remove(styles['highlight-red']);
                }

                if (tutorialStep.key !== 'tutorial-level-1') {
                  const undoButton = document.getElementById('btn-undo') as HTMLButtonElement;

                  // show undo notification if they have made too many moves
                  if (gameState.moves.length > (tutorialStep.level?.leastMoves ?? 0)) {
                    undoButton?.classList.add(styles['highlight-red']);
                  } else {
                    undoButton?.classList.remove(styles['highlight-red']);
                  }
                }

                if (tutorialStep.onMove) {
                  tutorialStep.onMove(gameState);
                }
              }}
              onSolve={tutorialStep.onSolve}
            />
          </div>
        )}
        {tooltips && tooltips.map((tooltip, index) => (
          <div
            key={`tooltip-${tutorialStepIndex}-${index}`}
            className='bg-white rounded-lg text-black p-3 font-bold justify-center opacity-90 z-30 fadeIn'
            id={`tooltip-${index}`}
            role='tooltip'
            style={{
              animationDelay: '0.5s',
              display: 'block',
            }}
          >
            <div className='flex'>
              {tooltip.title}
              {tooltip.canClose && <DismissToast onClick={() => {
                const newTooltips = tooltips.filter((_, i) => i !== index);

                if (newTooltips.length === 0) {
                  setTooltips(undefined);
                } else {
                  setTooltips(newTooltips);
                }
              }} />}
            </div>
            <div id='arrow' data-popper-arrow />
          </div>
        ))}
      </div>
    </Page>
  );
}
