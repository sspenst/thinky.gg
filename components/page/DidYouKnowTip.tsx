import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useRef } from 'react';

export default function DidYouKnowTip({ reqUser }: { reqUser: User }) {
  const tips = [
    <>Every level in Pathology comes from a level editor. Start building <Link className='underline' href='/create'>here</Link>.</>,
    <>Use <Link className='underline' href='/search'>advanced search</Link> to find levels that suit your taste.</>,
    <>Compete in <Link className='underline' href='/multiplayer'>real-time multiplayer</Link>. Race to solve puzzles against others!</>,
    <>See your <Link className='underline' href={`/profile/${reqUser.name}/achievements`}>earned and potential achievements</Link>.</>,
    <>Create collections of levels, like your favorites, <Link className='underline' href={`/profile/${reqUser.name}/collections`}>here</Link>.</>,
    <>Join our active <Link className='underline' href='https://discord.gg/kpfdRBt43v'>Discord</Link> to connect with other players and level creators.</>,
    <>You can customize your profile picture, bio, and more on <Link className='underline' href={`/profile/${reqUser.name}`}>your profile</Link>.</>,
    <>Every level in the game has a review rating. Learn how these are calculated <Link className='underline' href='https://github.com/sspenst/pathology/wiki/Level-Review-Score'>here</Link>.</>,
    <>Pathology has a long history and its own lingo / terminology (pipes, locks, etc...). You learn about them in the Pathology <Link className='underline' href='https://github.com/sspenst/pathology/wiki/Glossary'>glossary</Link>.</>,
    <>We have an iOS and Android app! Check it out: <Link className='underline' href='https://apps.apple.com/app/pathology-block-pushing-game/id1668925562'>iOS</Link> and <Link className='underline' href='https://play.google.com/store/apps/details?id=com.pathology.gg'>Android</Link>.</>,
    <>Follow level creators by clicking their username to visit their profile.</>,
    <>Go Pro for features like Checkpoints, Redo, and community time comparisons. <Link className='underline' href='/settings/proaccount'>Learn more</Link>.</>,
    <>You can customize your notification preference in your <Link className='underline' href='/settings/notifications'>notifications settings</Link>.</>
  ] as JSX.Element[];

  const randomTip = useRef(tips[Math.floor(Math.random() * tips.length)]);

  return (
    <div className='flex flex-col items-center justify-center  text-center '>
      <h2 className='text-2xl font-bold mb-2'>Did You Know?</h2>

      <span className=''>{randomTip.current}</span>
    </div>
  );
}
