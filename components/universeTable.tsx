import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import useStats from '../hooks/useStats';

interface UniverseTableProps {
  levels: Level[];
  user: User;
}

export default function UniverseTable({ levels, user }: UniverseTableProps) {
  const { stats } = useStats();
  const { windowSize } = useContext(PageContext);
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;
  const formattedLevels = [];
  let completeLevels = 0;

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const stat = stats?.find(stat => stat.levelId === level._id);

    if (stat && stat.complete) {
      completeLevels += 1;
    }

    formattedLevels.push(
      <div key={`${i}`}>
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

  return (<>
    <div className='text-lg'>
      <Link href={`/universe/${user._id}`} passHref>
        <a
          className='font-bold underline'
          style={{
            color: completeLevels === 0 ? undefined :
              completeLevels === levels.length ? 'var(--color-complete)' : 'var(--color-incomplete)',
          }}
        >
          {`${user.name}'s levels (${completeLevels}/${levels.length}):`}
        </a>
      </Link>
    </div>
    <table style={{
      margin: `${Dimensions.TableMargin}px auto`,
      maxWidth: maxTableWidth,
    }}>
      <tbody>
        <tr>
          <td style={{
            borderTop: '1px solid var(--bg-color-4)',
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            padding: 10,
            textAlign: 'left',
          }}>
            {formattedLevels}
          </td>
        </tr>
      </tbody>
    </table>
  </>);
}
