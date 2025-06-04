import winston from 'winston';
import { trace } from '@opentelemetry/api';
import { LoggingWinston } from '@google-cloud/logging-winston';

// Determine if we're running in GCP
const isGCP = process.env.K_SERVICE !== undefined || process.env.GOOGLE_CLOUD_PROJECT !== undefined;
const serviceName = process.env.OTEL_SERVICE_NAME || 'tracing-poc';

// Create a temporary logger for initialization messages
const initLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message }) => `${level}: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

initLogger.info(`=== Logging Configuration ===`);
initLogger.info(`Environment: ${isGCP ? 'GCP Cloud Run' : 'Local Development'}`);
initLogger.info(`Service: ${serviceName}`);

// Custom format to include trace information for both local and GCP
const traceFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    
    if (isGCP) {
      // GCP Cloud Logging format for trace correlation
      // Format: projects/PROJECT_ID/traces/TRACE_ID
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (projectId) {
        info['logging.googleapis.com/trace'] = `projects/${projectId}/traces/${spanContext.traceId}`;
        info['logging.googleapis.com/spanId'] = spanContext.spanId;
        info['logging.googleapis.com/trace_sampled'] = spanContext.traceFlags === 1;
      }
    }
    
    // Also include for local development and as metadata
    info.traceID = spanContext.traceId;
    info.spanID = spanContext.spanId;
    info.service = serviceName;
  }
  return info;
});

// Create transports based on environment
const transports: winston.transport[] = [];

if (isGCP) {
  // Use Google Cloud Logging for GCP
  initLogger.info(`Adding Google Cloud Logging transport`);
  initLogger.info(`Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  
  const loggingWinston = new LoggingWinston({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resource: {
      type: 'cloud_run_revision',
      labels: {
        service_name: serviceName,
        revision_name: process.env.K_REVISION || 'unknown',
        configuration_name: process.env.K_CONFIGURATION || 'unknown',
        project_id: process.env.GOOGLE_CLOUD_PROJECT || 'unknown',
        location: process.env.GOOGLE_CLOUD_REGION || 'unknown',
      },
    },
  });
  
  transports.push(loggingWinston);
} else {
  // Use console for local development
  initLogger.info(`Adding console transport for local development`);
  
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, traceID, spanID, ...meta }) => {
          const traceInfo = traceID ? ` [traceID=${traceID}] [spanID=${spanID}]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]${traceInfo}: ${message}${metaStr}`;
        })
      )
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    traceFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: serviceName,
    environment: isGCP ? 'production' : 'development',
    version: process.env.SERVICE_VERSION || '1.0.0',
  },
  transports,
});

export default logger; 