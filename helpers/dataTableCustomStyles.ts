import { TableStyles } from 'react-data-table-component-sspenst';

// https://github.com/jbetancur/react-data-table-component/blob/master/src/DataTable/styles.ts
export const DATA_TABLE_CUSTOM_STYLES: TableStyles = {
  subHeader: {
    style: {
      backgroundColor: 'var(--bg-color)',
      color: 'var(--color)',
    },
  },
  headRow: {
    style: {
      backgroundColor: 'var(--bg-color)',
      color: 'var(--color)',
      borderBottomColor: 'var(--bg-color-4)',
    },
  },
  rows: {
    style: {
      backgroundColor: 'var(--bg-color-2)',
      color: 'var(--color)',
    },
    stripedStyle: {
      backgroundColor: 'var(--bg-color-3)',
      color: 'var(--color)',
    },
  },
  pagination: {
    style: {
      backgroundColor: 'var(--bg-color)',
      color: 'var(--color)',
    },
    pageButtonsStyle: {
      fill: 'var(--color)',
      '&:disabled': {
        fill: 'var(--bg-color-4)',
      },
      '&:hover:not(:disabled)': {
        backgroundColor: 'var(--bg-color-3)',
      },
      '&:focus': {
        backgroundColor: 'var(--bg-color-3)',
      },
    }
  },
  noData: {
    style: {
      backgroundColor: 'var(--bg-color)',
      color: 'var(--color)',
    },
  },
  progress: {
    style: {
      backgroundColor: 'var(--bg-color)',
      color: 'var(--color)',
    },
  },
};
