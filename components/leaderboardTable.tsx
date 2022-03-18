import React, { useContext } from 'react';
import User from '../models/data/pathology/user';
import { WindowSizeContext } from './windowSizeContext';

interface LeaderboardTableProps {
  user: User | undefined;
  users: User[];
}

export default function LeaderboardTable({ user, users }: LeaderboardTableProps) {
  const windowSize = useContext(WindowSizeContext);
  const rowHeight = 45;
  const numWidth = 50;
  const maxTableWidth = windowSize.width - 40;
  const tableWidth = maxTableWidth > 350 ? 350 : maxTableWidth;

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: rowHeight, width: numWidth }}>
        #
      </th>
      <th>
        Username
      </th>
      <th style={{ width: numWidth }}>
        ✓
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

    const isYou = user && users[i].name === user.name;

    rows.push(
      <tr key={i} style={isYou ? { background: 'var(--bg-color-3)' }: {}}>
        <td style={{ height: rowHeight }}>
          {rank}
        </td>
        <td>
          {users[i].name}
        </td>
        <td>
          {users[i].score}
        </td>
      </tr>
    );
  }

  return (
    <div
      className={'hide-scroll'}
      style={{
        height: windowSize.height,
        overflowY: 'scroll',
        width: windowSize.width,
      }}
    >
      <table style={{
        margin: '20px auto',
        width: tableWidth,
      }}>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}
