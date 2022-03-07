import React, { useContext } from 'react';
import Color from '../constants/color';
import LeaderboardEntry from '../models/leaderboardEntry';
import User from '../models/data/pathology/user';
import { WindowSizeContext } from './windowSizeContext';

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[];
  user: User | undefined;
}

export default function LeaderboardTable({ leaderboard, user }: LeaderboardTableProps) {
  const windowSize = useContext(WindowSizeContext);
  const rows = [
    <tr key={-1} style={{ backgroundColor: Color.BackgroundMenu }}>
      <th style={{ height: '50px', width: '50px' }}>
        #
      </th>
      <th>
        Username
      </th>
      <th style={{ width: '50px' }}>
        ✓
      </th>
    </tr>
  ];

  let prevRank = 0;

  for (let i = 0; i < leaderboard.length; i++) {
    let rank = i + 1;

    // account for matching rank
    if (i === 0 || leaderboard[i].completed !== leaderboard[i - 1].completed) {
      prevRank = rank;
    } else {
      rank = prevRank;
    }

    const isYou = user && leaderboard[i].name === user.name;

    rows.push(
      <tr key={i} style={isYou ? { background: 'rgb(60 104 49)' }: {}}>
        <td style={{ height: '50px' }}>
          {rank}
        </td>
        <td>
          {leaderboard[i].name}
        </td>
        <td>
          {leaderboard[i].completed}
        </td>
      </tr>
    );
  }

  return (
    <div style={{
      height: windowSize.height,
      overflowY: 'scroll',
      width: windowSize.width,
    }}>
      <table style={{
        margin: '20px auto',
        width: '350px',
      }}>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}
