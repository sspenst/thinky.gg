import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import FormattedUser from './formattedUser';
import Level from '../models/db/level';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import useStats from '../hooks/useStats';

interface LatestLevelsTableProps {
  levels: Level[];
}

export default function LatestLevelsTable({ levels }: LatestLevelsTableProps) {
  const { stats } = useStats();
  const { windowSize } = useContext(PageContext);

  // magic number
  const isCollapsed = windowSize.width / 2 < 600;
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: Dimensions.TableRowHeight }}>
        Author
      </th>
      <th>
        Name
      </th>
      {isCollapsed ? null : <>
        <th>
          Difficulty
        </th>
        <th>
          Date
        </th>
      </>}
    </tr>
  ];

  for (let i = 0; i < levels.length; i++) {
    const stat = stats?.find(stat => stat.levelId === levels[i]._id);

    rows.push(
      <tr key={i}>
        <td>
          <FormattedUser center={false} user={levels[i].userId}/>
        </td>
        <td style={{ height: Dimensions.TableRowHeight }}>
          <Link href={`/level/${levels[i].slug}`} passHref>
            <a
              className='font-bold underline'
              style={{
                color: stat ? stat.complete ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
              }}
            >
              {levels[i].name}
            </a>
          </Link>
        </td>
        {isCollapsed ? null : <>
          <td>
            {levels[i].points}
          </td>
          <td style={{ minWidth: 150 }}>
            {getFormattedDate(levels[i].ts)}
          </td>
        </>}
      </tr>
    );
  }

  return (
    <div className='table-padding'>
      <table
        style={{
          margin: `${Dimensions.TableMargin}px auto`,
          maxWidth: maxTableWidth,
        }}
      >
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}
