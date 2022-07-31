import React, { useContext, useState } from 'react';
import Dimensions from '../constants/dimensions';
import FormattedUser from './formattedUser';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import useUser from '../hooks/useUser';

// define UserWithCount as a type alias for User with a count property
export type UserWithCount = User & { count: number, avg: number };
interface ReviewerLeaderboardTableProps {
  users: UserWithCount[];
}

export default function ReviewLeaderboardTable({ users }: ReviewerLeaderboardTableProps) {
  const { user } = useUser();
  const { windowSize } = useContext(PageContext);
  const numWidth = 50;
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;
  const tableWidth = maxTableWidth > 400 ? 400 : maxTableWidth;

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: Dimensions.TableRowHeight, width: numWidth }}>
        #
      </th>
      <th>
        Username
      </th>
      <th>
        Reviews written
      </th>
      <th>
        Avg Score
      </th>

    </tr>
  ];

  let prevRank = 0;

  for (let i = 0; i < users.length; i++) {
    let rank = i + 1;

    // account for matching rank
    if (i === 0 || users[i].score !== users[i - 1].score) {
      prevRank = rank;
    } else {
      rank = prevRank;
    }

    const isYou = user && users[i]._id === user._id;

    rows.push(
      <tr key={i} style={isYou ? { background: 'var(--bg-color-3)' } : {}}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          {rank}
        </td>
        <td>
          <FormattedUser user={users[i]}/>
        </td>
        <td>
          {users[i].count}
        </td>
        <td>
          {users[i].avg.toFixed(2)}
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
