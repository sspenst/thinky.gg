import { AppContext } from '@root/contexts/appContext';
import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useContext, useRef } from 'react';

interface DidYouKnowTipProps {
  reqUser: User | null;
}

export default function DidYouKnowTip({ reqUser }: DidYouKnowTipProps) {
  const { game } = useContext(AppContext);
  const tips = [
    <>Every level in {game.displayName} was created in the level editor! You can start building <Link className='underline' href='/drafts'>here</Link>.</>,
    <>Use <Link className='underline' href='/search'>advanced search</Link> to find levels that suit your taste.</>,
    <>Compete in <Link className='underline' href='/multiplayer'>real-time multiplayer</Link>. Race to solve puzzles against others!</>,
    <>Join our active <Link className='underline' href='https://discord.gg/kpfdRBt43v'>Discord</Link> to connect with other players and level creators.</>,
    <>Every level in the game has a review rating. Learn how these are calculated <Link className='underline' href='https://github.com/sspenst/thinky.gg/wiki/Level-Review-Score'>here</Link>.</>,
    <>Level difficulties are calculated automatically! Learn more about it <Link className='underline' href='https://github.com/sspenst/thinky.gg/wiki/Level-Difficulty-System'>here</Link>.</>,
    <>{game.displayName} has a long history and its own lingo / terminology (pipes, locks, etc...). You learn about them in the {game.displayName} <Link className='underline' href='https://github.com/sspenst/thinky.gg/wiki/Glossary'>glossary</Link>.</>,
    <>We have an iOS and Android app! Check it out: <Link className='underline' href='https://apps.apple.com/app/pathology-block-pushing-game/id1668925562'>iOS</Link> and <Link className='underline' href='https://play.google.com/store/apps/details?id=com.pathology.gg'>Android</Link>.</>,
    <>Follow level creators by clicking their username to visit their profile.</>,
    <>Go Pro for features like Checkpoints, Redo, and community time comparisons. <Link className='underline' href='/pro'>Learn more</Link>.</>,
    <>You can customize your notification preferences in your <Link className='underline' href='/settings#notifications'>notifications settings</Link>.</>,
    <>See your <Link className='underline' href={reqUser ? `/profile/${reqUser.name}/achievements` : '/login'}>earned and potential achievements</Link>.</>,
    <>Create collections of levels, like your favorites, <Link className='underline' href={reqUser ? `/profile/${reqUser.name}/collections` : '/login'}>here</Link>.</>,
    <>You can customize your profile picture, bio, and more on <Link className='underline' href={reqUser ? `/profile/${reqUser.name}` : '/login'}>your profile</Link>.</>,
  ] as JSX.Element[];

  const randomTip = useRef(tips[Math.floor(Math.random() * tips.length)]);

  return (
    <div className='flex flex-col items-center justify-center text-center'>
      <h2 className='text-xl font-bold mb-2'>Did You Know?</h2>
      <span>{randomTip.current}</span>
    </div>
  );
}
