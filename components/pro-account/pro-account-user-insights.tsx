import React from 'react';
import User from '../../models/db/user';

export const ProAccountUserInsights = ({ user }: {user: User}) => {
  return (
    <div className='text-center'>
      <h1 className='font-bold'>Insights for {user.name}</h1>
      <div>
        <h2>Creator Insights</h2>
      </div>

    </div>

  );
};
