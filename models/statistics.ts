import User from './db/user';
import { UserWithCount } from '../components/statisticsTable';

type Statistics = {
  currentlyOnlineCount: number;
  newUsers: User[];
  registeredUsersCount: number;
  topRecordBreakers: User[];
  topReviewers: UserWithCount[];
  topScorers: User[];
  totalAttempts: number;
}

export default Statistics;
