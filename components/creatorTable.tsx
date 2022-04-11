import React, { useContext } from 'react';
import Level from '../models/db/level';
import Link from 'next/link';
import Pack from '../models/db/pack';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import useStats from '../hooks/useStats';

interface CreatorTableProps {
  creator: User;
  levels: Level[];
  packs: Pack[];
  user: User;
}

export default function CreatorTable({ creator, levels, packs, user }: CreatorTableProps) {
  const { stats } = useStats();
  const { windowSize } = useContext(PageContext);
  const maxTableWidth = windowSize.width - 40;
  const rowHeight = 45;

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: rowHeight }}>
        Packs
      </th>
      <th style={{
        borderLeft: '1px solid',
        borderColor: 'var(--bg-color-4)',
      }}>
        Levels
      </th>
    </tr>
  ];
  
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];

    if (pack.userId !== creator._id) {
      continue;
    }

    const formattedLevels = [];

    for (let j = 0; j < levels.length; j++) {
      const level = levels[j];

      if (level.packId._id !== pack._id) {
        continue;
      }

      const stat = stats?.find(stat => stat.levelId === level._id);
  
      formattedLevels.push(
        <div key={`${i}-${j}`}>
          <Link href={`/level/${level._id}`} passHref>
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
          <Link href={`/pack/${pack._id}`} passHref>
            <a className='font-bold underline'>
              {pack.name}
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
          {`${user.name}'s levels:`}
        </a>
      </Link>
    }
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
