import classNames from 'classnames';
import React from 'react';

export interface TableColumn<T> {
  id: string;
  name?: React.ReactNode;
  selector: (row: T) => React.ReactNode;
  sortable?: boolean;
  style?: React.CSSProperties | undefined;
}

interface ConditionalStyle<T> {
  style: React.CSSProperties;
  when: (row: T) => boolean;
}

interface PaginationProps {
  itemsPerPage: number;
  onChangePage: (page: number) => void;
  page: number;
  totalItems: number;
}

function Pagination({ itemsPerPage, onChangePage, page, totalItems }: PaginationProps) {
  const start = (page - 1) * itemsPerPage + 1;
  const end = Math.min(page * itemsPerPage, totalItems);
  const lastPage = Math.ceil(totalItems / itemsPerPage);
  const buttonClassName = 'w-10 h-10 rounded-full flex justify-center items-center pagination-button transition disabled:opacity-50';

  return (
    <div className='h-14 w-full flex justify-center items-center'>
      <button
        className={buttonClassName}
        disabled={page <= 1}
        onClick={() => onChangePage(1)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          aria-hidden='true'
          role='presentation'
          fill='currentColor'
        >
          <path d='M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z' />
          <path fill='none' d='M24 24H0V0h24v24z' />
        </svg>
      </button>
      <button
        className={buttonClassName}
        disabled={page <= 1}
        onClick={() => onChangePage(page - 1)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          aria-hidden='true'
          role='presentation'
          fill='currentColor'
        >
          <path d='M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' />
          <path d='M0 0h24v24H0z' fill='none' />
        </svg>
      </button>
      <span className='mx-4 text-[13px]'>
        {`${start}-${end} of ${totalItems}`}
      </span>
      <button
        className={buttonClassName}
        disabled={page >= lastPage}
        onClick={() => onChangePage(page + 1)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          aria-hidden='true'
          role='presentation'
          fill='currentColor'
        >
          <path d='M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z' />
          <path d='M0 0h24v24H0z' fill='none' />
        </svg>
      </button>
      <button
        className={buttonClassName}
        disabled={page >= lastPage}
        onClick={() => onChangePage(lastPage)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          aria-hidden='true'
          role='presentation'
          fill='currentColor'
        >
          <path d='M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z' />
          <path fill='none' d='M0 0h24v24H0V0z' />
        </svg>
      </button>
    </div>
  );
}

interface DataTableProps<T> {
  conditionalRowStyles?: ConditionalStyle<T>[];
  columns: TableColumn<T>[];
  data?: T[];
  itemsPerPage: number;
  noDataComponent: JSX.Element;
  onChangePage: (page: number) => void;
  onSort: (columnId: string) => void;
  page: number;
  sortBy: string;
  sortDir: 'desc' | 'asc';
  totalItems: number;
}

export default function DataTable<T>({
  conditionalRowStyles,
  columns,
  data,
  itemsPerPage,
  noDataComponent,
  onChangePage,
  onSort,
  page,
  sortBy,
  sortDir,
  totalItems,
}: DataTableProps<T>) {
  if (!data) return (<>Loading...</>);

  return (<>
    <div className='grid text-[13px] overflow-x-auto' style={{
      gridTemplateColumns: `repeat(${columns.length}, auto)`,
    }}>
      {columns.map(column => {
        return (
          <div
            className='truncate flex items-center h-10 px-2 border-b'
            key={`column-${column.id}-header`}
            style={{
              minWidth: '100px',
              borderColor: 'var(--bg-color-4)',
              ...column.style,
            }}
          >
            <div
              className={classNames('flex items-center font-semibold text-sm truncate', { 'cursor-pointer hover:opacity-50': column.sortable })}
              onClick={() => column.sortable ? onSort(column.id) : undefined}
            >
              <div>{column.name}</div>
              <span className='ml-1'>{sortBy !== column.id ? null : sortDir === 'desc' ? '▼' : '▲'}</span>
            </div>
          </div>
        );
      })}
      {data.map((row, i) => columns.map(column => {
        const customStyle = { ...column.style };

        if (conditionalRowStyles) {
          for (const style of conditionalRowStyles) {
            if (style.when(row)) {
              Object.assign(customStyle, style.style);
            }
          }
        }

        return (
          <div
            className='truncate flex items-center px-2'
            key={`column-${column.id}`}
            style={{
              minHeight: '32px',
              minWidth: '50px',
              backgroundColor: i % 2 === 0 ? 'var(--bg-color-3)' : 'var(--bg-color-2)',
              ...customStyle,
            }}
          >
            {column.selector(row)}
          </div>
        );
      }))}
    </div>
    {data.length === 0 ? noDataComponent :
      <Pagination
        itemsPerPage={itemsPerPage}
        onChangePage={onChangePage}
        page={page}
        totalItems={totalItems}
      />
    }
  </>);
}
