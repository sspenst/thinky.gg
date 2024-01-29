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

// Development logger options
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

// Production logger options
const prodLoggerOptions = {
  level: 'info',
  format: format.combine(
    format.errors({ stack: true }), // Ensure error stack traces are included
    errorStackTracerFormat(), // Use custom error stack tracer format
    format.json() // Format logs as JSON
  ),
  transports: [
    new transports.Console(),
    // Add additional transports for production if needed
  ],
};

// Check if the environment is production and choose the appropriate logger options
const options = process.env.NODE_ENV === 'production' ? prodLoggerOptions : devLoggerOptions;

// Create the logger
const logger = createLogger(options);

export { logger };
