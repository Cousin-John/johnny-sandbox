# OpenTelemetry Tracing POC for GCP Cloud Run

This is a proof of concept demonstrating OpenTelemetry tracing with Google Cloud Trace in a Node.js application.

## Prerequisites

- Node.js 16 or higher
- Docker and Docker Compose
- Google Cloud account with Cloud Trace API enabled (for GCP deployment)
- GCP credentials (for local development)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up GCP credentials for local development:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
```

## Development

### Running Locally

Run the application in development mode:
```bash
npm run dev
```

### Running with Docker Compose

Run the application with Jaeger tracing:
```bash
docker compose up --build
```

This will start:
- The tracing-poc service on http://localhost:3000
- Jaeger UI on http://localhost:16686

You can view traces in the Jaeger UI by:
1. Opening http://localhost:16686
2. Selecting "tracing-poc" from the service dropdown
3. Clicking "Find Traces"

## Building and Running

Build the application:
```bash
npm run build
```

Run the built application:
```bash
npm start
```

## Testing the Endpoints

The service exposes the following endpoints:

- `GET /data1` - Returns the first dataset
- `GET /data2` - Returns the second dataset
- `GET /health` - Health check endpoint

Test with curl:
```bash
curl http://localhost:3000/data1
curl http://localhost:3000/data2
curl http://localhost:3000/health
```

## Tracing

The application automatically creates traces for all requests. Each request will:
1. Check for a `traceparent` header
2. Create a new trace if none exists
3. Create spans for the request and data operations
4. Export traces to Jaeger (when running with Docker Compose) or Google Cloud Trace (when deployed to GCP)

## Cloud Run Deployment

To deploy to Cloud Run:

1. Build the Docker image:
```bash
docker build -t gcr.io/[PROJECT_ID]/tracing-poc .
```

2. Push to Google Container Registry:
```bash
docker push gcr.io/[PROJECT_ID]/tracing-poc
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy tracing-poc \
  --image gcr.io/[PROJECT_ID]/tracing-poc \
  --platform managed \
  --allow-unauthenticated
```

Note: Make sure the Cloud Run service account has the `Cloud Trace Agent` role. 