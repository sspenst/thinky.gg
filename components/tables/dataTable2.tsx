import classNames from 'classnames';
import React from 'react';

export interface TableColumn2<T> {
  id: string;
  name: string;
  selector: (row: T) => JSX.Element;
  sortable?: boolean;
  style?: React.CSSProperties | undefined;
}

interface DataTable2Props<T> {
  columns: TableColumn2<T>[];
  data: T[];
  onSort: (columnId: string) => void;
  sortBy: string;
  sortDir: 'desc' | 'asc';
}

export default function DataTable2<T>({ columns, data, onSort, sortBy, sortDir }: DataTable2Props<T>) {
  return (<>
    <div className='grid text-xs overflow-x-auto' style={{
      gridTemplateColumns: `repeat(${columns.length}, auto)`,
    }}>
      {/* TODO: keys */}
      {columns.map(column => {
        return (
          <div className='truncate flex items-center h-10 px-2 border-b' style={{
            minWidth: '100px',
            ...column.style,
            borderColor: 'var(--bg-color-4)',
          }}>
            <div
              className={classNames('font-semibold text-sm truncate', { 'cursor-pointer hover:opacity-50': column.sortable })}
              onClick={() => onSort(column.id)}
            >
              <span>{column.name}</span>
              <span className='ml-1'>{sortBy !== column.id ? null : sortDir === 'desc' ? '▼' : '▲'}</span>
            </div>
          </div>
        );
      })}
      {data.map((row, i) => columns.map(column => {
        return (
          <div className='truncate flex items-center h-8 px-2' style={{
            minWidth: '50px',
            ...column.style,
            backgroundColor: i % 2 === 0 ? 'var(--bg-color-3)': 'var(--bg-color-2)',
          }}>
            {column.selector(row)}
          </div>
        );
      }))}
    </div>
    {/* TODO: pagination (separate component?) */}
  </>);
}