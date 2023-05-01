import Dimensions from '@root/constants/dimensions';
import { UserAndSum } from '@root/contexts/levelContext';
import { DATA_TABLE_CUSTOM_STYLES } from '@root/helpers/dataTableCustomStyles';
import User from '@root/models/db/user';
import React from 'react';
import DataTable from 'react-data-table-component';
import FormattedUser from '../formattedUser';

interface UserAndValueRankTableProps {
    data: UserAndSum[];
    reqUser?: User;
    valueHeader: string;
}

export default function UserAndValueRankTable({ data, reqUser, valueHeader }: UserAndValueRankTableProps) {
  return <DataTable
    columns={[
      {
        name: '#',
        cell: (row: UserAndSum, index: number) => index + 1,

        width: '50px',

      },
      {
        name: 'User',
        cell: (row: UserAndSum) => <FormattedUser size={Dimensions.AvatarSizeSmall} user={row.user} />,
        minWidth: '200px',
      },
      {
        name: valueHeader,
        selector: (row) => row.sum,
      },
    ]}
    conditionalRowStyles={[{
      when: row => row?.user._id === reqUser?._id,
      style: {
        backgroundColor: 'var(--bg-color-4)',
      },
    }]}
    customStyles={DATA_TABLE_CUSTOM_STYLES}
    data={data}
    dense
    noDataComponent={
      <div className='p-3'>
  Nothing to display...
      </div>
    }
    striped
  />;
}
