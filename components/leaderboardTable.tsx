import React, { useContext, useState } from 'react';
import Dimensions from '../constants/dimensions';
import FormattedUser from './formattedUser';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import useUser from '../hooks/useUser';

interface LeaderboardTableProps {
  users: User[];
}

const enum SortBy {
  Records,
  Score,
}

export default function LeaderboardTable({ users }: LeaderboardTableProps) {
  const [sortBy, setSortBy] = useState(SortBy.Score);
  const { user } = useUser();
  const { windowSize } = useContext(PageContext);
  const numWidth = 50;
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;
  const tableWidth = maxTableWidth > 400 ? 400 : maxTableWidth;

  const sorted_users = users.sort((a, b) => {
    const stat1 = sortBy === SortBy.Records ? a.calc_records : a.score;
    const stat2 = sortBy === SortBy.Records ? b.calc_records : b.score;

    if (stat1 === stat2 && a.ts && b.ts) {
      return a.ts < b.ts ? 1 : -1;
    }

    return stat1 < stat2 ? 1 : -1;
  });

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: Dimensions.TableRowHeight, width: numWidth }}>
        #
      </th>
      <th>
        Username
      </th>
      <th style={{
        width: numWidth,
      }}>
        <button
          className='font-bold'
          onClick={() => setSortBy(SortBy.Score)}
          title='Levels completed'
        >
          <span style={{ color: 'var(--color-complete)' }}>✓</span>
          {sortBy === SortBy.Score ? <span>↓</span> : null}
        </button>
      </th>
      <th style={{
        width: numWidth,
      }}>
        <button
          className='font-bold'
          onClick={() => setSortBy(SortBy.Records)}
          title='Records set (excluding their own levels)'
        >
          🥇
          {sortBy === SortBy.Records ? <span>↓</span> : null}
        </button>
      </th>
    </tr>
  ];

  let prevRank = 0;

  for (let i = 0; i < sorted_users.length; i++) {
    let rank = i + 1;

    // account for matching rank
    if (i === 0 || sorted_users[i].score !== sorted_users[i - 1].score) {
      prevRank = rank;
    } else {
      rank = prevRank;
    }

    const isYou = user && sorted_users[i]._id === user._id;

    rows.push(
      <tr key={i} style={isYou ? { background: 'var(--bg-color-3)' } : {}}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          {rank}
        </td>
        <td>
          <FormattedUser user={sorted_users[i]}/>
        </td>
        <td>
          {sorted_users[i].score}
        </td>
        <td>
          {sorted_users[i].calc_records}
        </td>
      </tr>
    );
  }

  return (
    <div>
      <table style={{
        margin: `${Dimensions.TableMargin}px auto`,
        width: tableWidth,
      }}>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}
