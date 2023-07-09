import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import { UserAndSum } from '@root/contexts/levelContext';
import { DATA_TABLE_CUSTOM_STYLES } from '@root/helpers/dataTableCustomStyles';
import React, { useContext } from 'react';
import DataTable from 'react-data-table-component-sspenst';
import FormattedUser from '../formattedUser';

interface UserAndSumTableProps {
  data: UserAndSum[];
  sumName: string;
}

export default function UserAndSumTable({ data, sumName }: UserAndSumTableProps) {
  const { user } = useContext(AppContext);

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
        name: sumName,
        selector: (row) => row.sum,
      },
    ]}
    conditionalRowStyles={[{
      when: row => row?.user._id === user?._id,
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
