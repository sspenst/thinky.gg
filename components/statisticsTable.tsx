import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import FormattedUser from './formattedUser';

// type alias for User with additional statistics properties
export type UserWithCount = User & {
  rank?: number;
  rating?: number;
  reviewAvg: number;
  reviewCount: number;
};

type UserTableColumn = {
  format: (user: UserWithCount) => number | string;
  name: string;
}

interface StatisticsTableProps {
  columns: UserTableColumn[];
  title: string;
  users: (User | UserWithCount)[];
}

export default function StatisticsTable({ columns, title, users }: StatisticsTableProps) {
  const { user, windowSize } = useContext(PageContext);
  const numWidth = 50;
  const maxTableWidth = windowSize.width - 2 * Dimensions.TableMargin;
  const tableWidth = maxTableWidth > 400 ? 400 : maxTableWidth;

  const rows = [
    <tr key={'statistics-header'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th style={{ height: Dimensions.TableRowHeight, width: numWidth }}>
        #
      </th>
      <th>
        Username
      </th>
      {columns.map(column => (
        <th key={`statistics-header-column-${column.name}`}>
          {column.name}
        </th>
      ))}
    </tr>
  ];

  for (let i = 0; i < users.length; i++) {
    const isYou = user && users[i]._id === user._id;

    rows.push(
      <tr key={`statistics-row-${users[i]._id}`} style={isYou ? { background: 'var(--bg-color-3)' } : {}}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          {(users[i] as UserWithCount).rank || i + 1}
        </td>
        <td>
          <FormattedUser user={users[i]} />
        </td>
        {columns.map(column => (
          <td key={`statistics-row-${users[i]._id}-column-${column.name}`}>
            {column.format(users[i] as UserWithCount)}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div>
      <h1 className='flex justify-center text-lg font-bold'>{title}</h1>
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
