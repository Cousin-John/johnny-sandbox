# GCP Cloud Run Deployment Guide

This guide explains how to deploy the tracing-poc service to Google Cloud Run with full observability using Google Cloud Trace and Google Cloud Logging.

## Code Changes Made for GCP

### 1. **Environment-Aware Configuration**
The service now automatically detects whether it's running locally or in GCP and configures observability accordingly:

- **Local Development**: Uses Tempo + Loki (existing setup)
- **GCP Cloud Run**: Uses Google Cloud Trace + Google Cloud Logging

### 2. **Updated Dependencies**
Added GCP-specific packages to `package.json`:
```json
"@google-cloud/opentelemetry-cloud-trace-exporter": "^2.1.0",
"@google-cloud/logging-winston": "^5.3.0"
```

### 3. **Smart Tracing Configuration** (`src/tracing.ts`)
- **GCP Detection**: Uses `K_SERVICE` and `GOOGLE_CLOUD_PROJECT` environment variables
- **Dual Exporters**: 
  - Local: OTLP to Tempo
  - GCP: Google Cloud Trace exporter
- **Enhanced Resource Attributes**: Includes Cloud Run specific metadata

### 4. **Smart Logging Configuration** (`src/utils/logger.ts`)
- **GCP Detection**: Same environment variable logic
- **Dual Transports**:
  - Local: Console with pretty formatting
  - GCP: Google Cloud Logging with proper trace correlation
- **Trace Correlation**: Uses GCP-specific log fields for trace linking

## Prerequisites

### GCP Project Setup
1. **Enable APIs**:
   ```bash
   gcloud services enable run.googleapis.com --project ${PROJECT_ID}
   gcloud services enable cloudtrace.googleapis.com --project ${PROJECT_ID}
   gcloud services enable logging.googleapis.com --project ${PROJECT_ID}
   gcloud services enable artifactregistry.googleapis.com --project ${PROJECT_ID}
   ```

2. **Create Artifact Registry Repository** (if not exists):
   ```bash
   gcloud artifacts repositories create tracing-poc-ts \
     --repository-format=docker \
     --location=northamerica-northeast2 \
     --description="Docker repository for tracing-poc" \
     --project ${PROJECT_ID}
   ```

3. **Set Default Region** (optional):
   ```bash
   gcloud config set run/region northamerica-northeast2 --project ${PROJECT_ID}
   ```

### IAM Permissions
Your deployment account needs these roles:
- `Cloud Run Admin`
- `Cloud Trace Agent`  
- `Logging Agent`
- `Artifact Registry Reader`
- `Artifact Registry Writer`

## Manual Deployment Steps

### Step 1: Build and Push Container
```bash
# Set your project ID
export REGION="northamerica-northeast2"
export PROJECT_ID="lawlabs-closer-staging"
export GAR_REPO="tracing-poc-ts"
export SERVICE_NAME="tracing-poc"
export IMAGE_TAG="latest"

# Build the container
docker buildx build --platform linux/amd64 -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${GAR_REPO}/${SERVICE_NAME}:${IMAGE_TAG} .

# Configure Docker for GAR
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Push to Google Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${GAR_REPO}/${SERVICE_NAME}:${IMAGE_TAG}
```

### Step 2: Deploy to Cloud Run
```bash
gcloud run deploy ${SERVICE_NAME} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${GAR_REPO}/${SERVICE_NAME}:${IMAGE_TAG} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},OTEL_SERVICE_NAME=${SERVICE_NAME},SERVICE_VERSION=${IMAGE_TAG},GOOGLE_CLOUD_REGION=${REGION},LOG_LEVEL=info" \
  --cpu 1 \
  --memory 512Mi \
  --max-instances 10 \
  --concurrency 80 \
  --project ${PROJECT_ID}
```

### Step 3: Get Service URL
```bash
export SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --format 'value(status.url)' \
  --project ${PROJECT_ID})

echo "Service deployed at: ${SERVICE_URL}"
```

## Testing the Deployment

### 1. Generate Traces and Logs
```bash
# Make some requests to generate data
curl ${SERVICE_URL}/data1
curl ${SERVICE_URL}/data2
curl ${SERVICE_URL}/health
```

### 2. View Traces in Cloud Console
1. Go to [Cloud Trace](https://console.cloud.google.com/traces)
2. Select your project
3. You should see traces for your service calls
4. Click on a trace to see detailed span information

### 3. View Logs in Cloud Console
1. Go to [Cloud Logging](https://console.cloud.google.com/logs)
2. Use this query to find your service logs:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="tracing-poc"
   ```
3. Look for structured logs with trace IDs

### 4. Test Trace-Log Correlation
1. In Cloud Trace, click on a trace
2. Click "View in Logs Explorer" (if available)
3. Or manually search logs using the trace ID:
   ```
   trace="projects/YOUR_PROJECT/traces/TRACE_ID"
   ```

## Environment Variables

The service automatically detects GCP environment, but you can override with these variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | Auto-detected |
| `OTEL_SERVICE_NAME` | Service name for tracing | `tracing-poc` |
| `SERVICE_VERSION` | Service version | `1.0.0` |
| `LOG_LEVEL` | Logging level | `info` |
| `GOOGLE_CLOUD_REGION` | GCP region | Auto-detected |

## Monitoring & Observability

### Cloud Trace Features
- **Automatic trace collection** from OpenTelemetry
- **Service map** showing request flow
- **Latency analysis** and performance insights
- **Error tracking** with stack traces

### Cloud Logging Features  
- **Structured JSON logs** with metadata
- **Trace correlation** - jump from traces to logs
- **Log-based metrics** and alerting
- **Full-text search** across all logs

### Key Log Fields for GCP
```json
{
  "message": "Processing request for /data1",
  "severity": "INFO",
  "timestamp": "2025-06-04T16:07:42.884Z",
  "logging.googleapis.com/trace": "projects/PROJECT_ID/traces/TRACE_ID",
  "logging.googleapis.com/spanId": "SPAN_ID",
  "logging.googleapis.com/trace_sampled": true,
  "service": "tracing-poc",
  "method": "GET",
  "path": "/data1"
}
```

## Local Development

The service continues to work locally with your existing setup:

```bash
# Local development still uses Tempo + Loki
docker-compose up -d
npm run dev

# Logs will show:
# Environment: Local Development  
# Using OTLP exporter to: http://tempo:4318
```

## Troubleshooting

### Missing Traces
- Check that Cloud Trace API is enabled
- Verify service account has `Cloud Trace Agent` role
- Look for error messages in startup logs

### Missing Logs  
- Check that Cloud Logging API is enabled
- Verify service account has `Logging Agent` role
- Check log level configuration

### Trace-Log Correlation Not Working
- Ensure `GOOGLE_CLOUD_PROJECT` is set correctly
- Verify trace IDs match between traces and logs
- Check log field format: `logging.googleapis.com/trace`

## Cost Considerations

- **Cloud Trace**: First 2.5M spans/month free, then $0.20 per 1M spans
- **Cloud Logging**: First 50GB/month free, then $0.50 per GB
- **Cloud Run**: Pay per request, no idle charges

## Next Steps

1. **Set up Alerting**: Create log-based metrics and alerts
2. **Custom Metrics**: Add application-specific metrics
3. **Error Reporting**: Integrate with Google Error Reporting
4. **APM Dashboard**: Create custom dashboards in Cloud Monitoring

## Architecture Diagram

```
Local Development:
┌─────────────┐    ┌─────────┐    ┌─────────┐
│ Node.js App │────│  Tempo  │────│ Grafana │
│             │    │ (traces)│    │         │
│             │────│  Loki   │────│         │
└─────────────┘    └─────────┘    └─────────┘

GCP Cloud Run:
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│ Cloud Run   │────│ Cloud Trace  │────│ Cloud Console│
│ Service     │    │              │    │              │
│             │────│ Cloud Logging│────│              │
└─────────────┘    └──────────────┘    └──────────────┘
``` 