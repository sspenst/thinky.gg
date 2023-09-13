/* istanbul ignore file */

import winston, { createLogger, format, transports } from 'winston';
import isLocal from '../lib/isLocal';

const errorStackTracerFormat = winston.format(info => {
  if (info.meta && info.meta instanceof Error) {
    info.message = `${info.message} ${info.meta.stack}`;
  }

  return info;
});

const loggerObj = { logger: {
  info: (message: any, meta?: any) => console.info(message, meta),
  error: (message: any, meta?: any) => console.error(message, meta),
  warn: (message: any, meta?: any) => console.warn(message, meta),
} };

async function makeLogger() {
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

  if (!isLocal() && process.env.NODE_ENV !== 'test') {
  // dynamically import newrelic formatter @newrelic/winston-enricher
    const newrelicFormatter = (await import('@newrelic/winston-enricher')).default;
    const newrelicWinstonFormatter = newrelicFormatter(winston);

    options = {
      ...devLoggerOptions,
      level: 'info',
      format: format.combine(
        winston.format.splat(),
        format.errors({ stack: true }),
        newrelicWinstonFormatter(),
      ),
    };
  }

  loggerObj.logger = createLogger({
    ...options
  });
}

makeLogger();
export const logger = loggerObj.logger;
