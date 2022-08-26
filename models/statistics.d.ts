import { UserWithCount } from '../components/statisticsTable';
import User from './db/user';

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
