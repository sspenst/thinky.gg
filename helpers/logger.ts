import { pino } from 'pino';
import isLocal from '../lib/isLocal';

const devLoggerOptions = {
  level: 'info',
  transport: {
    target: 'pino-pretty'
  },
};

export const logger = pino({
  ...(isLocal() ? devLoggerOptions : {}),
});
