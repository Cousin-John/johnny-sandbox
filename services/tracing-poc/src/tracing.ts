import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { logger } from './utils/logger';

// Determine if we're running in GCP
const isGCP = process.env.K_SERVICE !== undefined || process.env.GOOGLE_CLOUD_PROJECT !== undefined;
const serviceName = process.env.OTEL_SERVICE_NAME || 'tracing-poc';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

logger.info(`=== Tracing Configuration ===`);
logger.info(`Environment: ${isGCP ? 'GCP Cloud Run' : 'Local Development'}`);
logger.info(`Service: ${serviceName}`);
logger.info(`Version: ${serviceVersion}`);

// Configure the resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: isGCP ? 'production' : 'development',
  ...(isGCP && {
    [SemanticResourceAttributes.CLOUD_PROVIDER]: 'gcp',
    [SemanticResourceAttributes.CLOUD_PLATFORM]: 'gcp_cloud_run',
    [SemanticResourceAttributes.CLOUD_REGION]: process.env.GOOGLE_CLOUD_REGION,
  }),
});

// Configure trace exporter based on environment
let traceExporter;

if (isGCP) {
  // Use Google Cloud Trace exporter for GCP
  logger.info(`Using Google Cloud Trace exporter`);
  logger.info(`Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  
  traceExporter = new TraceExporter({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
} else {
  // Use OTLP exporter for local development (Tempo)
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://tempo:4318';
  logger.info(`Using OTLP exporter to: ${otlpEndpoint}`);
  logger.info(`Target OTLP URL: ${otlpEndpoint}/v1/traces`);
  
  traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });
}

// Initialize the SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-grpc': {
        enabled: false,
      },
    }),
  ],
});

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => logger.info('Tracing terminated'))
    .catch((error) => logger.error('Error terminating tracing', { error }))
    .finally(() => process.exit(0));
});

export default sdk;

export const shutdownTracing = () => {
  return sdk
    .shutdown()
    .then(() => logger.info('Tracing terminated'))
    .catch((error) => logger.error('Error terminating tracing', { error }));
}; 