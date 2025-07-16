import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import { useContext } from 'react';
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
  const { game } = useContext(AppContext);

  if (!isPro(reqUser)) {
    return (
      <div className='text-center text-lg break-words'>
        Get <Link href='/pro' className='text-blue-300'>
          {game.displayName} Pro
        </Link> to unlock additional insights for {user.name}.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 text-center justify-center items-center w-full'>
      <ProfileInsightsScoreChart user={user} />
      <ProfileInsightsRecords user={user} />
      <div className='flex flex-col md:flex-row gap-3'>
        <ProfileInsightsLevelPlayLog user={user} />
        <ProfileInsightsMostSolves user={user} />
      </div>
      {reqUser?._id === user._id && <ProfileInsightsSolveTimeComparison user={user} />}
    </div>
  );
}
