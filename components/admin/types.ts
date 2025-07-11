import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { ParsedUrlQuery } from 'querystring';

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
  count: number;
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
  label: string;
  command: string;
  icon?: any;
  dangerous?: boolean;
  confirm?: boolean;
}

export interface AdminQuery {
  levelId?: string;
  userId?: string;
  tab?: Tab;
  [key: string]: string | undefined;
}

export interface AdminPageProps {
  adminQuery: AdminQuery;
  level: Level | null;
  user: User | null;
}

export type Tab = 'users' | 'levels' | 'system' | 'config' | 'reports';
