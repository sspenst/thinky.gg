import Dimensions from '@root/constants/dimensions';
import { Game } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import { ArrowRight, Lock, Sparkles, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import getPngDataClient from '../../helpers/getPngDataClient';

interface ChapterSelectCardBaseProps {
  complete?: boolean;
  disabled?: boolean;
  disabledStr?: string;
  game: Game;
  href: string;
  id: string;
  levelData: string;
  subtitle?: string;
  title: React.ReactNode;
  compact?: boolean;
  highlight?: boolean;
}

export function ChapterSelectCardBase({
  complete,
  disabled,
  disabledStr,
  game,
  href,
  id,
  levelData,
  subtitle,
  title,
  compact,
  highlight,
}: ChapterSelectCardBaseProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    setBackgroundImage(getPngDataClient(game.id, levelData));
  }, [game.id, levelData]);

  if (compact) {
    return (<>
      <div className='relative inline-block align-middle max-w-full group' style={{
        width: 320,
      }}>
        <div className='relative'>
          {/* Dynamic Floating Island Effect based on state */}
          <div className={classNames(
            'absolute -inset-4 blur-3xl transition-all duration-700 opacity-60',
            complete ? 'bg-gradient-to-r from-green-500/40 to-emerald-500/40' :
            disabled ? 'bg-gradient-to-r from-gray-600/30 to-gray-500/30' :
            highlight ? 'bg-gradient-to-r from-yellow-500/40 to-orange-500/40 animate-pulse' :
            'bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40'
          )} />
          
          {/* Main card container */}
          <div className='relative rounded-3xl overflow-hidden border border-white/30 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl shadow-2xl hover:shadow-3xl group-hover:scale-[1.02] group-hover:border-white/40 transform transition-all duration-500' style={{
            height: Dimensions.OptionHeightSmall + 30,
          }}>
            {/* Animated gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-tr from-purple-600/10 via-transparent to-cyan-600/10 opacity-60 group-hover:opacity-80 transition-opacity duration-500' />
            
            {/* Level preview background with animation */}
            <div
              className={classNames(
                'absolute inset-0 bg-cover bg-center transition-all duration-700',
                !disabled ? 'group-hover:scale-110 group-hover:opacity-30' : ''
              )}
              style={{
                backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
                opacity: disabled ? 0.1 : 0.2,
                filter: 'blur(1px)',
              }}
            />
            
            {/* Shimmer effect */}
            {!disabled && (
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
            )}
            
            <Link
              className={classNames(
                'flex items-center h-full w-full relative rounded-3xl p-6',
                disabled ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer',
              )}
              href={disabled ? '' : href}
              id={id}
              passHref
            >
              {/* Decorative orb */}
              <div className='absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl' />
              
              {/* Status badge */}
              <div className='absolute top-4 right-4'>
                {complete ? (
                  <div className='p-3 bg-gradient-to-br from-green-400/30 to-emerald-500/30 backdrop-blur-xl rounded-2xl border border-green-400/30'>
                    <Trophy className='w-6 h-6 text-green-300' style={{ filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' }} />
                  </div>
                ) : disabled ? (
                  <div className='p-3 bg-gradient-to-br from-gray-500/30 to-gray-600/30 backdrop-blur-xl rounded-2xl border border-gray-500/30'>
                    <Lock className='w-6 h-6 text-gray-400' />
                  </div>
                ) : highlight ? (
                  <div className='p-3 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 backdrop-blur-xl rounded-2xl border border-yellow-400/30 animate-pulse'>
                    <Sparkles className='w-6 h-6 text-yellow-300' style={{ filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.6))' }} />
                  </div>
                ) : (
                  <div className='p-3 bg-gradient-to-br from-purple-400/30 to-pink-500/30 backdrop-blur-xl rounded-2xl border border-purple-400/30'>
                    <Zap className='w-6 h-6 text-purple-300' style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' }} />
                  </div>
                )}
              </div>
              
              {disabled && (
                <>
                  {/* Enhanced lock overlay with pattern */}
                  <div className='absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-900/90 backdrop-blur-md rounded-3xl' />
                  <div className='absolute inset-0 opacity-10'>
                    <div className='w-full h-full' style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px)',
                    }} />
                  </div>
                </>
              )}
              
              <div className={classNames('font-bold break-words flex-1 flex flex-col justify-center gap-2 relative z-10', disabled ? 'opacity-50' : '')}>
                <div className={classNames(
                  'text-2xl font-black tracking-tight',
                  complete ? 'text-green-300' : 'text-white'
                )}>
                  {title}
                </div>
                {subtitle && (
                  <div className='text-sm text-gray-300 font-medium tracking-wide uppercase opacity-80'>
                    {subtitle}
                  </div>
                )}
                
                {/* Progress indicator for non-disabled cards */}
                {!disabled && !complete && (
                  <div className='flex items-center gap-2 mt-2'>
                    <span className='text-xs text-purple-300 font-semibold'>START JOURNEY</span>
                    <ArrowRight className='w-4 h-4 text-purple-300 animate-pulse' />
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
      {disabled && disabledStr &&
        <div className='flex justify-center -mt-3 relative z-20'>
          <div className='inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur-xl border border-red-500/40 rounded-2xl shadow-lg'>
            <Lock className='w-4 h-4 text-red-300' />
            <span className='text-sm font-semibold text-red-200 tracking-wide'>
              {disabledStr}
            </span>
          </div>
        </div>
      }
    </>);
  }

  return (<>
    <div className='relative inline-block align-middle max-w-full group' style={{
      width: 380,
    }}>
      <div className='relative'>
        {/* Dynamic Floating Island Effect based on state */}
        <div className={classNames(
          'absolute -inset-6 blur-3xl transition-all duration-700 opacity-70',
          complete ? 'bg-gradient-to-r from-green-500/50 to-emerald-500/50' :
          disabled ? 'bg-gradient-to-r from-gray-600/40 to-gray-500/40' :
          highlight ? 'bg-gradient-to-r from-yellow-500/50 to-orange-500/50 animate-pulse' :
          'bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50'
        )} />
        
        {/* Main card container */}
        <div className='relative rounded-3xl overflow-hidden border-2 border-white/40 bg-gradient-to-br from-white/15 to-white/8 backdrop-blur-xl shadow-2xl hover:shadow-3xl group-hover:scale-[1.02] group-hover:border-white/50 transform transition-all duration-500' style={{
          height: Dimensions.OptionHeightLarge,
        }}>
          {/* Animated gradient overlay */}
          <div className='absolute inset-0 bg-gradient-to-tr from-purple-600/15 via-transparent to-cyan-600/15 opacity-70 group-hover:opacity-90 transition-opacity duration-500' />
          
          {/* Level preview background with animation */}
          <div
            className={classNames(
              'absolute inset-0 bg-cover bg-center transition-all duration-700 mix-blend-soft-light',
              !disabled ? 'group-hover:scale-110 group-hover:opacity-40' : ''
            )}
            style={{
              backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
              opacity: disabled ? 0.15 : 0.25,
              filter: 'blur(0.5px)',
            }}
          />
          
          {/* Shimmer effect */}
          {!disabled && (
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200' />
          )}
          
          {/* Decorative elements */}
          <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400' />
          <div className='absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-full blur-3xl' />
          
          <Link
            className={classNames(
              'flex items-center justify-center h-full w-full relative rounded-3xl p-8 pt-12',
              disabled ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer',
            )}
            href={disabled ? '' : href}
            id={id}
            passHref
          >
            {/* Status badge */}
            <div className='absolute top-6 right-6'>
              {complete ? (
                <div className='p-4 bg-gradient-to-br from-green-400/40 to-emerald-500/40 backdrop-blur-xl rounded-3xl border border-green-400/40 shadow-lg'>
                  <Trophy className='w-8 h-8 text-green-300' style={{ filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.8))' }} />
                </div>
              ) : disabled ? (
                <div className='p-4 bg-gradient-to-br from-gray-500/40 to-gray-600/40 backdrop-blur-xl rounded-3xl border border-gray-500/40'>
                  <Lock className='w-8 h-8 text-gray-400' />
                </div>
              ) : highlight ? (
                <div className='p-4 bg-gradient-to-br from-yellow-400/40 to-orange-500/40 backdrop-blur-xl rounded-3xl border border-yellow-400/40 animate-pulse shadow-lg'>
                  <Sparkles className='w-8 h-8 text-yellow-300' style={{ filter: 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.8))' }} />
                </div>
              ) : (
                <div className='p-4 bg-gradient-to-br from-purple-400/40 to-pink-500/40 backdrop-blur-xl rounded-3xl border border-purple-400/40 shadow-lg'>
                  <Zap className='w-8 h-8 text-purple-300' style={{ filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))' }} />
                </div>
              )}
            </div>
            
            {disabled && (
              <>
                {/* Enhanced lock overlay with pattern */}
                <div className='absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 backdrop-blur-lg rounded-3xl' />
                <div className='absolute inset-0 opacity-10'>
                  <div className='w-full h-full' style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,.05) 40px, rgba(255,255,255,.05) 80px)',
                  }} />
                </div>
              </>
            )}
            
            <div className={classNames('font-bold break-words flex-1 flex flex-col justify-center items-center gap-3 relative z-10 py-6', disabled ? 'opacity-50' : '')}>
              <div className={classNames(
                'text-4xl font-black tracking-tight text-center',
                complete ? 'text-green-300' : 'text-white'
              )} style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
                {title}
              </div>
              {subtitle && (
                <div className='text-lg text-gray-200 font-semibold tracking-wide uppercase opacity-90 text-center'>
                  {subtitle}
                </div>
              )}
              
            
            </div>
          </Link>
        </div>
      </div>
    </div>
    {disabled && disabledStr &&
      <div className='flex justify-center -mt-4 relative z-20'>
        <div className='inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-900/50 to-orange-900/50 backdrop-blur-xl border border-red-500/50 rounded-2xl shadow-xl'>
          <Lock className='w-5 h-5 text-red-300' />
          <span className='text-base font-bold text-red-200 tracking-wide'>
            {disabledStr}
          </span>
        </div>
      </div>
    }
  </>);
}

interface ChapterSelectCardProps {
  chapter: number;
  chapterUnlocked?: number;
  href?: string;
  titleOverride?: string;
  highlight?: boolean;
}

export default function ChapterSelectCard({ chapter, chapterUnlocked, href, titleOverride, highlight }: ChapterSelectCardProps) {
  const { game } = useContext(AppContext);

  switch (chapter) {
  case 0:
    return (
      <ChapterSelectCardBase
        game={game}
        href={href ?? '/tutorial'}
        id='tutorial'
        levelData={'00000000\n00000000\n00000000\n00000000'}
        title={titleOverride || 'Start'}
      />
    );
  case 1:
    return (
      <ChapterSelectCardBase
        game={game}
        complete={!!chapterUnlocked && chapterUnlocked > 1}
        href={href ?? '/chapter/1'}
        id='chapter1'
        levelData={'50000000\n00000100\n02000000\n00000020'}
        subtitle={'Grassroots'}
        title={titleOverride || 'Chapter 1'}
        highlight={highlight}
      />
    );
  case 2:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 2}
        disabled={chapterUnlocked ? chapterUnlocked < 2 : false}
        disabledStr={'Complete Chapter 1 to unlock'}
        game={game}
        href={href ?? '/chapter/2'}
        id='chapter2'
        levelData={'005E0C00\n0G070005\n10005010\n005100I0'}
        subtitle={'Into the Depths'}
        title={titleOverride || 'Chapter 2'}
      />
    );
  case 3:
    return (
      <ChapterSelectCardBase
        complete={!!chapterUnlocked && chapterUnlocked > 3}
        disabled={chapterUnlocked ? chapterUnlocked < 3 : false}
        disabledStr={'Complete Chapter 2 to unlock'}
        game={game}
        href={href ?? '/chapter/3'}
        id='chapter3'
        levelData={'B519F0G0\n10JH5H52\n75F02J08\n02050B10'}
        subtitle={'Brain Busters'}
        title={titleOverride || 'Chapter 3'}
      />
    );
  case 4:
    return (
      <ChapterSelectCardBase
        disabled={false}
        game={game}
        href={'/ranked'}
        id='chapter4'
        levelData={'65G9F3G5\nG1J5GH3I\n53FF251G\nJ1I5H505'}
        title={titleOverride || 'Ranked'}
      />
    );
  default:
    return null;
  }
}
