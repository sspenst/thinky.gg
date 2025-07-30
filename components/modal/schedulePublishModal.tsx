import isPro from '@root/helpers/isPro';
import useProStatsUser, { ProStatsUserType } from '@root/hooks/useProStatsUser';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '.';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import FormattedAuthorNote from '../formatted/formattedAuthorNote';
import { TimeFilter } from '../profile/profileInsights';
import isNotFullAccountToast from '../toasts/isNotFullAccountToast';

interface SchedulePublishModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function SchedulePublishModal({ closeModal, isOpen, level }: SchedulePublishModalProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [publishDateTime, setPublishDateTime] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { user } = useContext(AppContext);
  const router = useRouter();

  // Get follower activity data for best time recommendations
  const { proStatsUser: followerData, isLoading: isLoadingFollowers } = useProStatsUser(
    user,
    ProStatsUserType.FollowerActivityPatterns,
    TimeFilter.ALL,
    !isPro(user)
  );

  // Get current datetime in local timezone for min attribute
  const now = new Date();
  const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const minDateTime = nowLocal.toISOString().slice(0, 16);

  // Calculate max datetime (1 month from now)
  const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const maxLocal = new Date(maxDate.getTime() - maxDate.getTimezoneOffset() * 60000);
  const maxDateTime = maxLocal.toISOString().slice(0, 16);

  // Get best time suggestion if available (from profile insights)
  const getBestTimeToPublish = () => {
    if (followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && followerData[ProStatsUserType.FollowerActivityPatterns].followerCount >= 5) {
      const recommendations = followerData[ProStatsUserType.FollowerActivityPatterns].recommendations;

      return `${recommendations.bestDayLabel}s at ${recommendations.bestTimeLabel}`;
    }

    return 'Build your following to get personalized recommendations';
  };

  // Get available timezones for the dropdown
  const timezones = useMemo(() => {
    const commonTimezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'UTC'
    ];

    // Add user's current timezone if not in common list
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!commonTimezones.includes(userTz)) {
      commonTimezones.unshift(userTz);
    }

    return commonTimezones.map(tz => ({
      value: tz,
      label: tz.replace('_', ' ').replace('/', ' / ')
    }));
  }, []);

  // Auto-set the optimal publish time when the modal opens or follower data loads
  useEffect(() => {
    if (isOpen && !publishDateTime) {
      // Calculate the next optimal publish time
      let optimalTime;

      if (followerData && followerData[ProStatsUserType.FollowerActivityPatterns] && followerData[ProStatsUserType.FollowerActivityPatterns].followerCount >= 5) {
        const recommendations = followerData[ProStatsUserType.FollowerActivityPatterns].recommendations;
        const bestDay = recommendations.bestDay; // 0 = Sunday, 1 = Monday, etc.
        const bestHour = recommendations.bestHour; // 0-23

        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();

        // Calculate days until the next optimal day
        let daysUntilOptimal = bestDay - currentDay;

        if (daysUntilOptimal < 0) {
          daysUntilOptimal += 7; // Next week
        } else if (daysUntilOptimal === 0 && currentHour >= bestHour) {
          daysUntilOptimal = 7; // Same day but hour has passed, so next week
        }

        // Create the optimal publish date
        const optimalDate = new Date(now);

        optimalDate.setDate(now.getDate() + daysUntilOptimal);
        optimalDate.setHours(bestHour, 0, 0, 0); // Set to the best hour with 0 minutes/seconds

        // Convert to local datetime-local format
        const localDateTime = new Date(optimalDate.getTime() - optimalDate.getTimezoneOffset() * 60000);

        optimalTime = localDateTime.toISOString().slice(0, 16);
      } else {
        // Default to tomorrow at 2 PM if no recommendations available
        const tomorrow = new Date();

        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        const localDateTime = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000);

        optimalTime = localDateTime.toISOString().slice(0, 16);
      }

      setPublishDateTime(optimalTime);
    }
  }, [isOpen, publishDateTime, followerData, isLoadingFollowers]);

  // Reset the publishDateTime when modal closes so it gets recalculated next time
  useEffect(() => {
    if (!isOpen && publishDateTime) {
      setPublishDateTime('');
    }
  }, [isOpen]);

  const handleSchedule = () => {
    if (!publishDateTime) {
      toast.error('Please select a publish date and time');

      return;
    }

    if (level.leastMoves === 0) {
      toast.error('You must test the level and set a move count before scheduling publish');

      return;
    }

    setIsScheduling(true);
    toast.dismiss();
    toast.loading('Scheduling level for publish...');

    // Convert local datetime to UTC ISO string
    const publishDate = new Date(publishDateTime);
    const publishAt = publishDate.toISOString();

    fetch(`/api/schedule-publish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publishAt }),
    }).then(async res => {
      if (res.status === 401) {
        isNotFullAccountToast('Scheduling a level publish');
      } else if (res.status === 403) {
        toast.dismiss();
        toast.error('Scheduled publishing is a Pro feature');
      } else if (res.status === 200) {
        const response = await res.json();

        closeModal();

        toast.dismiss();
        toast.success(`Level scheduled to publish on ${new Date(response.publishAt).toLocaleString()}`);

        // Redirect to drafts page to show the scheduled level
        router.push('/drafts');
      } else {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp.error);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error scheduling level publish');
    }).finally(() => {
      setIsScheduling(false);
    });
  };

  if (!isPro(user)) {
    return (
      <Modal
        closeModal={closeModal}
        disabled={false}
        isOpen={isOpen}
        title='Schedule Publishing (Pro Feature)'
      >
        <div className='flex flex-col gap-4'>
          <div className='text-center'>
            <div className='text-6xl mb-4'>⏰</div>
            <h3 className='text-lg font-bold mb-2'>Schedule Your Level Publishing</h3>
            <p className='text-gray-400 mb-4'>
              Schedule your levels to publish at optimal times when your followers are most active.
              This Pro feature helps maximize engagement and reach.
            </p>
          </div>
          
          <div className='bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-4 border border-purple-500/30'>
            <h4 className='font-bold text-purple-300 mb-2'>Pro Features Include:</h4>
            <ul className='text-sm text-gray-300 space-y-1'>
              <li>• Schedule levels up to 1 month in advance</li>
              <li>• Get optimal timing recommendations based on follower activity</li>
              <li>• Automatic publishing at your chosen time</li>
              <li>• Cancel or reschedule anytime before publishing</li>
            </ul>
          </div>
          <div className='text-center'>
            <Link
              href='/pro'
              className='inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200'
              onClick={closeModal}
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      closeModal={closeModal}
      confirmText='Schedule'
      disabled={isScheduling || !publishDateTime || level.leastMoves === 0}
      isOpen={isOpen}
      onConfirm={handleSchedule}
      title='Schedule Level Publishing'
    >
      <div className='break-words space-y-4'>
        <div>
          <span className='font-bold'>Level:</span> {level.name}
          <br />
          <span className='font-bold'>Moves:</span> {level.leastMoves}
        </div>
        {!level.authorNote ? null : (
          <div>
            <span className='font-bold'>Author Note:</span>
            <br />
            <FormattedAuthorNote authorNote={level.authorNote} />
          </div>
        )}
        {level.leastMoves === 0 && (
          <div className='bg-amber-500/20 rounded-lg p-3 border border-amber-500/30'>
            <div className='flex items-start gap-2'>
              <span className='text-amber-400 text-lg'>⚠️</span>
              <div>
                <h4 className='font-medium text-amber-300'>Level Not Ready</h4>
                <p className='text-sm text-gray-300'>
                  You must test this level and set a move count before scheduling it for publish.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className='space-y-4 border-t border-gray-600 pt-4'>
          <div>
            <label htmlFor='publishDateTime' className='block text-sm font-medium mb-2'>
              Publish Date & Time
            </label>
            <input
              type='datetime-local'
              id='publishDateTime'
              value={publishDateTime}
              onChange={(e) => setPublishDateTime(e.target.value)}
              min={minDateTime}
              max={maxDateTime}
              className='w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white'
            />
            <p className='text-xs text-gray-400 mt-1'>
              Schedule up to 1 month in advance.
            </p>
          </div>
          <div>
            <label htmlFor='timezone' className='block text-sm font-medium mb-2'>
              Timezone
            </label>
            <select
              id='timezone'
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className='w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white'
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <div className='bg-blue-500/20 rounded-lg p-3 border border-blue-500/30'>
            <div className='flex items-start gap-2'>
              <span className='text-blue-400 text-lg'>💡</span>
              <div>
                <h4 className='font-medium text-blue-300'>Best Time to Publish</h4>
                <p className='text-sm text-gray-300'>
                  Based on your followers&apos; activity, the optimal time is <strong>{getBestTimeToPublish()}</strong>.
                </p>
                <Link
                  href={`/profile/${user?.name}/insights?subtab=creator&timeFilter=all`}
                  className='text-blue-400 hover:text-blue-300 text-sm underline'
                  target='_blank'
                >
                  View detailed insights →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
