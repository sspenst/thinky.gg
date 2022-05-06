import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import useUser from '../hooks/useUser';

interface LeaderboardTableProps {
  users: User[];
}

export default function LeaderboardTable({ users }: LeaderboardTableProps) {
  const { user } = useUser();
  const { windowSize } = useContext(PageContext);
  const numWidth = 50;
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;
  const tableWidth = maxTableWidth > 350 ? 350 : maxTableWidth;

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: Dimensions.TableRowHeight, width: numWidth }}>
        #
      </th>
      <th>
        Username
      </th>
      <th style={{
        color: 'var(--color-complete)',
        width: numWidth,
      }}>
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

    const isYou = user && users[i]._id === user._id;

    rows.push(
      <tr key={i} style={isYou ? { background: 'var(--bg-color-3)' }: {}}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          {rank}
        </td>
        <td>
          <Link href={`/profile/${users[i]._id}`} passHref>
            <a className='font-bold underline'>
              {users[i].name}
            </a>
          </Link>
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
