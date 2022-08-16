import Link from 'next/link';
import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import useStats from '../hooks/useStats';
import Level from '../models/db/level';
import { EnrichedLevelServer } from '../pages/search';
import FormattedUser from './formattedUser';

interface LatestLevelsTableProps {
  levels: EnrichedLevelServer[];
}

export default function LatestLevelsTable({ levels }: LatestLevelsTableProps) {
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
    const level = levels[i];

    rows.push(
      <tr key={i}>
        <td>
          <FormattedUser user={levels[i].userId}/>
        </td>
        <td style={{ height: Dimensions.TableRowHeight }}>
          <Link href={`/level/${levels[i].slug}`} passHref>
            <a
              className='font-bold underline'
              style={{
                color: level.userMoves ? level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
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
