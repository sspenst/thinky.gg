/* istanbul ignore file */

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
let options = devLoggerOptions;

if (!isLocal()) {
//  const newrelicWinstonFormatter = newrelicFormatter(winston);

  options = {
    ...devLoggerOptions,
    level: 'info',
    format: format.combine(
      winston.format.splat(),
    //  newrelicWinstonFormatter(),
    ),
  };
}

export const logger = createLogger({
  ...options,
});
