import { pino } from 'pino';
import isLocal from '../lib/isLocal';

const devLoggerOptions = {
  level: 'info',
  transport: {
    target: 'pino-pretty'
  },
};

/* istanbul ignore next */
export const logger = pino({
  ...(isLocal() ? devLoggerOptions : {}),
});
