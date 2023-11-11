import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import React from 'react';
import User from '../../models/db/user';
import ProfileInsightsLevelPlayLog from './profileInsightsLevelPlayLog';
import ProfileInsightsMostSolves from './profileInsightsMostSolves';
import ProfileInsightsRecords from './profileInsightsRecords';
import ProfileInsightsScoreChart from './profileInsightsScoreChart';
import ProfileInsightsSolveTimeComparison from './profileInsightsSolveTimeComparison';

interface ProfileInsightsProps {
  reqUser: User | null;
  user: User;
}

export default function ProfileInsights({ reqUser, user }: ProfileInsightsProps) {
  if (!isPro(reqUser)) {
    return (
      <div className='text-center text-lg break-words'>
        Get <Link href='/settings/pro' className='text-blue-300'>
          Pathology Pro
        </Link> to unlock additional insights for {user.name}.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 text-center justify-center items-center w-full'>
      <ProfileInsightsRecords user={user} />
      <ProfileInsightsScoreChart user={user} />
      <div className='flex flex-row gap-3'>
        <ProfileInsightsLevelPlayLog user={user} />
        <ProfileInsightsMostSolves user={user} />
      </div>

      {reqUser?._id === user._id && <ProfileInsightsSolveTimeComparison user={user} />}
    </div>
  );
}
