import React, { useContext, useState } from 'react';
import Dimensions from '../constants/dimensions';
import FormattedUser from './formattedUser';
import { PageContext } from '../contexts/pageContext';
import User from '../models/db/user';
import useUser from '../hooks/useUser';

// define UserWithCount as a type alias for User with a count property
export type UserWithCount = User & { count: number, avg: number };
interface TableProps {
  columns: any[];
  items: any[];
}

export default function BasicUserTable({ items, columns }: TableProps) {
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
      {columns.map((column, i) => (
        <th key={i}>
          {column.name}
        </th>
      ))}

    </tr>
  ];

  for (let i = 0; i < items.length; i++) {

    const isYou = user && items[i]._id === user._id;

    rows.push(
      <tr key={i} style={isYou ? { background: 'var(--bg-color-3)' } : {}}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          {i + 1}
        </td>
        <td>
          <FormattedUser user={items[i]}/>
        </td>
        {columns.map((column, j) => (
          <td key={j}>
            {column.format(items[i])}
          </td>
        ))}

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
