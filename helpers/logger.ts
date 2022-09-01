import newrelicFormatter from '@newrelic/winston-enricher';
import winston, { createLogger, format, transports } from 'winston';
import isLocal from '../lib/isLocal';

const devLoggerOptions = {
  level: 'info',
  format: format.combine(
    format.colorize(),
    format.simple()
  ),
  transports: [
    new transports.Console()
  ]
};
const newrelicWinstonFormatter = newrelicFormatter(winston);

const prodLoggerOptions = {
  ...devLoggerOptions,
  level: 'error',
  format: format.combine(
    newrelicWinstonFormatter()
  )
};

/* istanbul ignore next */
export const logger = createLogger({
  ...(isLocal() ? devLoggerOptions : prodLoggerOptions),
});
