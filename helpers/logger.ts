import { pino } from 'pino';
import isLocal from '../lib/isLocal';

const devLoggerOptions = {
  level: 'info',
  transport: {
    target: 'pino-pretty'
  },
};
let _logger: any = null;

if (isLocal()) {
  _logger = pino(devLoggerOptions);
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nrPino = require('@newrelic/pino-enricher');

  _logger = nrPino({
    serviceName: 'api',
    serviceVersion: '1.0.0',
    logLevel: 'info',
    enabled: true,
    pino: pino(),
  });
}

export const logger = _logger;
