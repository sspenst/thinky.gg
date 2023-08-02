import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import React from 'react';
import User from '../../models/db/user';
import ProfileInsightsLevelPlayLog from './profileInsightsLevelPlayLog';
import ProfileInsightsMostCompletions from './profileInsightsMostCompletions';
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
        Get <Link href='/settings/proaccount' className='text-blue-300'>
          Pathology Pro
        </Link> to unlock additional insights for {user.name}.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 text-center justify-center items-center w-full'>
      <ProfileInsightsLevelPlayLog user={user} />
      <ProfileInsightsMostCompletions user={user} />
      <ProfileInsightsScoreChart user={user} />
      {reqUser?._id === user._id && <ProfileInsightsSolveTimeComparison user={user} />}
    </div>
  );
}
