import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import { EnrichedLevel } from '../models/db/level';
import { getFormattedDifficulty } from './difficultyDisplay';
import EnrichedLevelLink from './enrichedLevelLink';
import FormattedUser from './formattedUser';

interface LatestLevelsTableProps {
  levels: EnrichedLevel[];
}

export default function LatestLevelsTable({ levels }: LatestLevelsTableProps) {
  const { windowSize } = useContext(PageContext);

  // magic number
  const isCollapsed = windowSize.width / 2 < 600;
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  const rows = [
    <tr key={'latest-levels-header'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
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
    rows.push(
      <tr key={`latest-levels-${levels[i]._id}`}>
        <td>
          <FormattedUser user={levels[i].userId} />
        </td>
        <td style={{ height: Dimensions.TableRowHeight }}>
          <EnrichedLevelLink level={levels[i]} />
        </td>
        {isCollapsed ? null : <>
          <td style={{ width: 175 }}>
            {getFormattedDifficulty(levels[i])}
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
