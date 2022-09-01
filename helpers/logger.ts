import newrelicFormatter from '@newrelic/winston-enricher';
import winston, { createLogger, format, transports } from 'winston';
import isLocal from '../lib/isLocal';

const devLoggerOptions = {
  level: 'info',
  format: format.combine(
    format.errors({ stack: true }),
    format.colorize(),

    format.simple(),

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
    winston.format.splat(),
    newrelicWinstonFormatter()
  )
};

/* istanbul ignore next */
export const logger = createLogger({
  ...(isLocal() ? devLoggerOptions : prodLoggerOptions),
});
