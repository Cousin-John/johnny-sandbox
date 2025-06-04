# Cloud Revision Tags

A utility script to display Cloud Run service revision tags with their deployment timestamps.

## Requirements

- `gcloud` CLI tool
- `jq` command-line JSON processor

## Usage

### Set environment variables

You can set these variables individually before running the script:

```bash
# Your Cloud Run service name - closer-admin-v2
CLOUD_RUN_SERVICE="closer-admin-v2"
```

```bash
# Your Cloud Run service name - closer-api-large
CLOUD_RUN_SERVICE="closer-api-large"
```

```bash
# Your Cloud Run service name - closer-api-v2
CLOUD_RUN_SERVICE="closer-api-v2"
```

```bash
# Your Cloud Run service name - closer-documizer
CLOUD_RUN_SERVICE="closer-documizer"
```

```bash
# Your Cloud Run service name - closer-pdf-api
CLOUD_RUN_SERVICE="closer-pdf-api"
```

```bash
# Your Cloud Run service name - closer-web
CLOUD_RUN_SERVICE="closer-web"
```

```bash
# Your Cloud Run service name - closer-webdav
CLOUD_RUN_SERVICE="closer-webdav"
```

```bash
# Your Cloud Run service name - closer-word
CLOUD_RUN_SERVICE="closer-word"
```

```bash
# Region where your service is deployed
CLOUD_RUN_REGION="northamerica-northeast1"
# Your Google Cloud project ID
CLOUD_RUN_PROJECT="closer-production-321417"
```

### Run the script

Then run the script using the environment variables:

```bash
./cloud-revision-tags.sh $CLOUD_RUN_SERVICE $CLOUD_RUN_REGION $CLOUD_RUN_PROJECT
```

Or provide values directly:

```bash
./cloud-revision-tags.sh my-service us-central1 my-project
```

## What it does

This script:

1. Extracts tag-to-revision mappings for your Cloud Run service
2. Fetches all revisions with their creation timestamps
3. Produces a report showing all tagged revisions and when they were last deployed

## Example output

```
REVISION TAG                             LAST DEPLOYED        
---------------------------------------- --------------------
staging                                  2023-05-15T14:32:10Z
prod                                     2023-05-10T09:15:22Z

Total unique tags: 2
```

## Error handling

- Checks for required dependencies
- Validates command-line arguments
- Gracefully exits if no tagged revisions are found 