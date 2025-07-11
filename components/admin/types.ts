import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { ParsedUrlQuery } from 'querystring';

export interface AdminQuery extends ParsedUrlQuery {
  levelId?: string;
  userId?: string;
  tab?: string;
}

export type Tab = 'users' | 'levels' | 'system' | 'config';

export interface ConnectedUser {
  _id: string;
  name: string;
  email?: string;
  roles: string[];
  ts?: number;
  last_visited_at?: number;
  publishedLevelsCount: number;
  reviewsCount: number;
}

export interface ConnectedUsersData {
  users: ConnectedUser[];
  distinctIPs: string[];
  distinctEmailDomains: string[];
  numUsers: number;
  numDistinctIPs: number;
  numDistinctEmailDomains: number;
}

export interface SystemVariable {
  _id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminCommand {
  command: string;
  confirm?: boolean;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  dangerous?: boolean;
}

export interface AdminPageProps {
  adminQuery: AdminQuery;
  level: Level | null;
  user: User | null;
}
