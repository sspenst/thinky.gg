import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import User from '../../models/db/user';
import Role from '@root/constants/role';
import ProfileInsightsPerformanceOverview from './profileInsightsPerformanceOverview';
import ProfileInsightsPeerComparisons from './profileInsightsPeerComparisons';
import ProfileInsightsTimeAnalytics from './profileInsightsTimeAnalytics';
import ProfileInsightsLevelMastery from './profileInsightsLevelMastery';
import ProfileInsightsCreatorDashboard from './profileInsightsCreatorDashboard';

interface ProfileInsightsProps {
  reqUser: User | null;
  user: User;
}

export enum InsightsTab {
  PERFORMANCE = 'performance',
  PEERS = 'peers',
  TIME = 'time',
  MASTERY = 'mastery',
  CREATOR = 'creator',
}

// Map tab enums to user-friendly URL parameter names
const TAB_URL_MAPPING = {
  [InsightsTab.PERFORMANCE]: 'overview',
  [InsightsTab.PEERS]: 'comparisons', 
  [InsightsTab.TIME]: 'activity',
  [InsightsTab.MASTERY]: 'mastery',
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
    label: 'Performance Overview',
    description: 'Track your overall progress and key metrics',
    component: ProfileInsightsPerformanceOverview,
  },
  {
    id: InsightsTab.PEERS,
    label: 'Peer Comparisons',
    description: 'See how you stack up against other players',
    component: ProfileInsightsPeerComparisons,
  },
  {
    id: InsightsTab.TIME,
    label: 'Time Analytics',
    description: 'Analyze your solving patterns and time investment',
    component: ProfileInsightsTimeAnalytics,
  },
  {
    id: InsightsTab.MASTERY,
    label: 'Level Mastery',
    description: 'Track your progression through difficulty levels',
    component: ProfileInsightsLevelMastery,
  },
  {
    id: InsightsTab.CREATOR,
    label: 'Creator Dashboard',
    description: 'Insights about levels you\'ve created',
    component: ProfileInsightsCreatorDashboard,
    showForCreators: true,
  },
];

export default function ProfileInsights({ reqUser, user }: ProfileInsightsProps) {
  const { game } = useContext(AppContext);
  const router = useRouter();
  
  // Initialize tab from URL query or default to PERFORMANCE
  const getInitialTab = (): InsightsTab => {
    const urlTab = router.query.tab as string;
    return URL_TAB_MAPPING[urlTab] || InsightsTab.PERFORMANCE;
  };
  
  // Initialize time filter from URL query or default to ALL
  const getInitialTimeFilter = (): TimeFilter => {
    const urlTimeFilter = router.query.timeFilter as string;
    return Object.values(TimeFilter).includes(urlTimeFilter as TimeFilter)
      ? (urlTimeFilter as TimeFilter)
      : TimeFilter.ALL;
  };
  
  const [activeTab, setActiveTab] = useState<InsightsTab>(getInitialTab());
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(getInitialTimeFilter());
  
  // Update URL when tab changes
  const handleTabChange = (tab: InsightsTab) => {
    setActiveTab(tab);
    const newQuery = { ...router.query, tab: TAB_URL_MAPPING[tab] };
    router.push(
      {
        pathname: router.asPath.split('?')[0], // Use asPath without query params
        query: newQuery
      },
      undefined,
      { shallow: true }
    );
  };
  
  // Update URL when time filter changes
  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    const newQuery = { ...router.query, timeFilter: filter };
    router.push(
      {
        pathname: router.asPath.split('?')[0], // Use asPath without query params
        query: newQuery
      },
      undefined,
      { shallow: true }
    );
  };
  
  // Update tab and time filter when URL changes
  useEffect(() => {
    const urlTab = router.query.tab as string;
    if (urlTab && URL_TAB_MAPPING[urlTab]) {
      setActiveTab(URL_TAB_MAPPING[urlTab]);
    }
    
    const urlTimeFilter = router.query.timeFilter as string;
    if (urlTimeFilter && Object.values(TimeFilter).includes(urlTimeFilter as TimeFilter)) {
      setTimeFilter(urlTimeFilter as TimeFilter);
    }
  }, [router.query.tab, router.query.timeFilter]);

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
    !tab.showForCreators || (user.calc_levels_created_count && user.calc_levels_created_count > 0)
  );

  const activeTabConfig = availableTabs.find(tab => tab.id === activeTab) || availableTabs[0];
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className='flex flex-col gap-6 w-full'>
      {/* Admin Disclaimer */}
      {isAdmin && reqUser?._id !== user._id && (
        <div className='bg-yellow-900 border border-yellow-600 rounded-lg p-3 text-center'>
          <p className='text-yellow-200 text-sm'>
            🔒 <strong>Admin View:</strong> You're viewing {user.name}'s insights with admin privileges. 
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