// Import necessary modules from 'winston'
import winston, { createLogger, format, transports } from 'winston';

// Function to format error stack traces
const errorStackTracerFormat = winston.format(info => {
  if (info instanceof Error) {
    return {
      ...info,
      message: `${info.message} ${info.stack}`,
    };
  }

  return info;
});

// Custom format to add timestamp and service info
const customFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  errorStackTracerFormat(),
  format.printf(({ timestamp, level, message, ...meta }) => {
    // Add service info for better log organization
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'thinky-backend',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    };

    return JSON.stringify(logEntry);
  })
);

// Development logger options
const devLoggerOptions = {
  level: 'debug', // More verbose in development
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

// Production logger options
const prodLoggerOptions = {
  level: 'info',
  format: customFormat, // Use enhanced JSON format
  transports: [
    new transports.Console(),
    // Optional: Add file transport as backup
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' })
  ],
};

// Check if the environment is production and choose the appropriate logger options
const options = process.env.NODE_ENV === 'production' ? prodLoggerOptions : devLoggerOptions;

// Create the logger
const logger = createLogger(options);

export { logger };
