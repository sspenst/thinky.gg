import Role from '@root/constants/role';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import User from '../../models/db/user';
import ProfileInsightsCreatorDashboard from './profileInsightsCreatorDashboard';
import ProfileInsightsPeerComparisons from './profileInsightsPeerComparisons';
import ProfileInsightsPerformanceOverview from './profileInsightsPerformanceOverview';
import ProfileInsightsTimeAnalytics from './profileInsightsTimeAnalytics';

interface ProfileInsightsProps {
  reqUser: User | null;
  user: User;
}

export enum InsightsTab {
  PERFORMANCE = 'performance',
  PEERS = 'peers',
  TIME = 'time',
  CREATOR = 'creator',
}

// Map tab enums to user-friendly URL parameter names
const TAB_URL_MAPPING = {
  [InsightsTab.PERFORMANCE]: 'overview',
  [InsightsTab.PEERS]: 'comparisons',
  [InsightsTab.TIME]: 'activity',
  [InsightsTab.CREATOR]: 'creator',
} as const;

// Reverse mapping for URL to tab enum
const URL_TAB_MAPPING = Object.entries(TAB_URL_MAPPING).reduce((acc, [key, value]) => {
  acc[value] = key as InsightsTab;

  return acc;
}, {} as Record<string, InsightsTab>);

export enum TimeFilter {
  WEEK = '7d',
  MONTH = '30d',
  YEAR = '1y',
  ALL = 'all',
}

interface TabConfig {
  id: InsightsTab;
  label: string;
  description: string;
  component: React.ComponentType<{ user: User; reqUser: User | null; timeFilter: TimeFilter }>;
  showForCreators?: boolean;
}

const TABS: TabConfig[] = [
  {
    id: InsightsTab.PERFORMANCE,
    label: '📊 Performance Overview',
    description: 'Track your overall progress and key metrics',
    component: ProfileInsightsPerformanceOverview,
  },
  {
    id: InsightsTab.PEERS,
    label: '⚔️ Peer Comparisons',
    description: 'See how you stack up against other players',
    component: ProfileInsightsPeerComparisons,
  },
  {
    id: InsightsTab.TIME,
    label: '⏰ Time Analytics',
    description: 'Analyze your solving patterns and time investment',
    component: ProfileInsightsTimeAnalytics,
  },
  {
    id: InsightsTab.CREATOR,
    label: '🎨 Creator Dashboard',
    description: 'Insights about levels you\'ve created',
    component: ProfileInsightsCreatorDashboard,
    showForCreators: true,
  },
];

export default function ProfileInsights({ reqUser, user }: ProfileInsightsProps) {
  const { game } = useContext(AppContext);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<InsightsTab>(InsightsTab.PERFORMANCE);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(TimeFilter.ALL);
  const [isInitialized, setIsInitialized] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (tab: InsightsTab) => {
    setActiveTab(tab);
    // Keep current path, update subtab query parameter (avoiding conflict with dynamic route)
    const { subdomain, tab: routeTab, name, ...cleanQuery } = router.query;
    const newQuery = { ...cleanQuery, subtab: TAB_URL_MAPPING[tab], timeFilter };

    router.push(
      {
        pathname: router.asPath.split('?')[0],
        query: newQuery
      },
      undefined,
      { shallow: true }
    );
  };

  // Update URL when time filter changes
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    // Keep current path, just update time filter query param
    const { subdomain, tab: routeTab, name, ...cleanQuery } = router.query;
    const newQuery = { ...cleanQuery, timeFilter: filter };

    router.push(
      {
        pathname: router.asPath.split('?')[0],
        query: newQuery
      },
      undefined,
      { shallow: true }
    );
  };

  // Initialize from URL query parameters when router is ready
  useEffect(() => {
    if (!router.isReady) return;

    console.log('🔍 Router query:', router.query);
    console.log('🔍 Router pathname:', router.pathname);
    console.log('🔍 Router asPath:', router.asPath);
    console.log('🔍 All query keys:', Object.keys(router.query));

    // Check for tab parameter conflict (dynamic route vs query param)
    const routeTabArray = router.query.tab;
    const queryTabParam = router.query.tab;

    console.log('🔍 Route tab array:', routeTabArray);
    console.log('🔍 Is tab an array?', Array.isArray(routeTabArray));

    // Get subtab from query parameter (avoiding conflict with dynamic route 'tab')
    const urlSubtab = router.query.subtab as string;

    console.log('🔍 URL subtab parameter:', urlSubtab);
    console.log('🔍 URL_TAB_MAPPING:', URL_TAB_MAPPING);

    if (urlSubtab && URL_TAB_MAPPING[urlSubtab]) {
      console.log('✅ Setting tab to:', URL_TAB_MAPPING[urlSubtab]);
      setActiveTab(URL_TAB_MAPPING[urlSubtab]);
    } else {
      console.log('⚠️ No valid subtab found, defaulting to PERFORMANCE');
      setActiveTab(InsightsTab.PERFORMANCE);
    }

    // Initialize time filter from URL query
    const urlTimeFilter = router.query.timeFilter as string;

    if (urlTimeFilter && Object.values(TimeFilter).includes(urlTimeFilter as TimeFilter)) {
      setTimeFilter(urlTimeFilter as TimeFilter);
    } else {
      setTimeFilter(TimeFilter.ALL);
    }

    setIsInitialized(true);
  }, [router.isReady, router.query.subtab, router.query.timeFilter, router.asPath]);

  // Update state when URL changes (for navigation)
  useEffect(() => {
    if (!isInitialized) return;

    const urlSubtab = router.query.subtab as string;

    if (urlSubtab && URL_TAB_MAPPING[urlSubtab] && URL_TAB_MAPPING[urlSubtab] !== activeTab) {
      setActiveTab(URL_TAB_MAPPING[urlSubtab]);
    }

    const urlTimeFilter = router.query.timeFilter as string;

    if (urlTimeFilter && Object.values(TimeFilter).includes(urlTimeFilter as TimeFilter) && urlTimeFilter !== timeFilter) {
      setTimeFilter(urlTimeFilter as TimeFilter);
    }
  }, [router.query.subtab, router.query.timeFilter, isInitialized, activeTab, timeFilter]);

  const isAdmin = reqUser?.roles?.includes(Role.ADMIN);
  const hasAccess = isPro(reqUser) || isAdmin;

  if (!hasAccess) {
    return (
      <div className='text-center text-lg break-words'>
        Get <Link href='/pro' className='text-blue-300'>
          {game.displayName} Pro
        </Link> to unlock additional insights for {user.name}.
      </div>
    );
  }

  // Filter tabs based on whether user has created levels
  const availableTabs = TABS.filter(tab =>
    !tab.showForCreators || (user.config?.calcLevelsCreatedCount && user.config?.calcLevelsCreatedCount > 0)
  );

  const activeTabConfig = availableTabs.find(tab => tab.id === activeTab) || availableTabs[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Admin Disclaimer */}
      {isAdmin && reqUser?._id !== user._id && (
        <div className='bg-yellow-900 border border-yellow-600 rounded-lg p-3 text-center'>
          <p className='text-yellow-200 text-sm'>
            🔒 <strong>Admin View:</strong> You&apos;re viewing {user.name}&apos;s insights with admin privileges.
            This view may show additional data not visible to the profile owner.
          </p>
        </div>
      )}
      {/* Tab Navigation */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap gap-2 justify-center'>
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time Filter */}
        <div className='flex items-center justify-center gap-4'>
          <span className='text-sm text-gray-400'>Time Period:</span>
          <div className='flex gap-1 bg-gray-800 rounded-lg p-1'>
            {Object.values(TimeFilter).map((filter) => (
              <button
                key={filter}
                onClick={() => handleTimeFilterChange(filter)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  timeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {filter === TimeFilter.WEEK ? 'Last 7 days' :
                  filter === TimeFilter.MONTH ? 'Last 30 days' :
                    filter === TimeFilter.YEAR ? 'Last year' : 'All time'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Description */}
        <p className='text-center text-sm text-gray-400'>
          {activeTabConfig.description}
        </p>
      </div>
      {/* Tab Content */}
      <div className='w-full'>
        <ActiveComponent user={user} reqUser={reqUser} timeFilter={timeFilter} />
      </div>
    </div>
  );
}
