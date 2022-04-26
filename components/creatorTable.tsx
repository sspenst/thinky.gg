import React, { useContext } from 'react';
import Level from '../models/db/level';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import World from '../models/db/world';
import useStats from '../hooks/useStats';

interface CreatorTableProps {
  creator: User;
  levels: Level[];
  user: User;
  worlds: World[];
}

export default function CreatorTable({ creator, levels, user, worlds }: CreatorTableProps) {
  const { stats } = useStats();
  const { windowSize } = useContext(PageContext);
  const maxTableWidth = windowSize.width - 40;
  const rowHeight = 45;
  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: rowHeight }}>
        World
      </th>
      <th style={{
        borderLeft: '1px solid',
        borderColor: 'var(--bg-color-4)',
      }}>
        Level
      </th>
    </tr>
  ];
  
  for (let i = 0; i < worlds.length; i++) {
    const world = worlds[i];

    if (world.userId !== creator._id) {
      continue;
    }

    const formattedLevels = [];
    let levelsComplete = 0;
    let levelCount = 0;

    for (let j = 0; j < levels.length; j++) {
      const level = levels[j];

      if (level.worldId._id !== world._id) {
        continue;
      }

      levelCount += 1;

      const stat = stats?.find(stat => stat.levelId === level._id);
      
      if (stat && stat.complete) {
        levelsComplete += 1;
      }
  
      formattedLevels.push(
        <div key={`${i}-${j}`}>
          <Link href={`/level/${level._id}`} passHref prefetch={false}>
            <a
              className='font-bold underline'
              style={{
                color: stat ? stat.complete ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
              }}
            >
              {level.name}
            </a>
          </Link>
        </div>
      );
    }

    rows.push(
      <tr key={i}>
        <td
          style={{
            height: rowHeight,
            padding: 10,
            textAlign: 'left',
            verticalAlign: 'top',
          }}
        >
          <Link href={`/world/${world._id}`} passHref prefetch={false}>
            <a
              className='font-bold underline'
              style={{
                color: levelsComplete !== 0 ? levelsComplete === levelCount ?
                  'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
              }}
            >
              {world.name}
            </a>
          </Link>
        </td>
        <td style={{
          borderLeft: '1px solid',
          borderColor: 'var(--bg-color-4)',
          padding: 10,
          textAlign: 'left',
        }}>
          {formattedLevels}
        </td>
      </tr>
    );
  }

  return (<>
    <div className='text-lg'>
      {
        creator.isOfficial ? 
        <>
          {`${user.name}'s `}
          <Link href={`/creator/${creator._id}`} passHref>
            <a className='font-bold underline'>
              {creator.name}
            </a>
          </Link>
          {' levels:'}
        </>
        :
        <Link href={`/creator/${user._id}`} passHref>
          <a className='font-bold underline'>
            {`${user.name}'s custom levels:`}
          </a>
        </Link>
      }
    </div>
    <table style={{
      margin: '20px auto',
      maxWidth: maxTableWidth,
    }}>
      <tbody>
        {rows}
      </tbody>
    </table>
  </>);
}
