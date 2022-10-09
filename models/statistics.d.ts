import { UserWithCount } from '../components/statisticsTable';
import User from './db/user';

type Statistics = {
  currentlyOnlineCount: number;
  newUsers: User[];
  registeredUsersCount: number;
  topFollowedUsers: UserWithCount[];
  topLevelCreators: UserWithCount[];
  topRecordBreakers: User[];
  topReviewers: UserWithCount[];
  topScorers: User[];
  totalAttempts: number;
  totalLevelsCount: number;
}

export default Statistics;
