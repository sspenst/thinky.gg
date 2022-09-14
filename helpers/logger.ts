/* istanbul ignore file */

import newrelicFormatter from '@newrelic/winston-enricher';
import winston, { createLogger, format, transports } from 'winston';
import isLocal from '../lib/isLocal';

const errorStackTracerFormat = winston.format(info => {
  if (info.meta && info.meta instanceof Error) {
    info.message = `${info.message} ${info.meta.stack}`;
  }

  return info;
});

const devLoggerOptions = {
  level: 'info',
  format: format.combine(
    format.errors({ stack: true }),
    format.colorize(),
    errorStackTracerFormat(),
    format.simple(),
  ),
  transports: [
    new transports.Console(),
  ],
};

const newrelicWinstonFormatter = newrelicFormatter(winston);

const prodLoggerOptions = {
  ...devLoggerOptions,
  level: 'error',
  format: format.combine(
    winston.format.splat(),
    newrelicWinstonFormatter(),
  ),
};

export const logger = createLogger({
  ...(isLocal() ? devLoggerOptions : prodLoggerOptions),
});
