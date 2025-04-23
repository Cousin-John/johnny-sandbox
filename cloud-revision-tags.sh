#!/bin/bash

# —————————————————————————————————————————
# Usage: ./cloud-revision-tags.sh SERVICE [REGION] [PROJECT]
# Examples:
#   ./cloud-revision-tags.sh my-service
#   ./cloud-revision-tags.sh my-service us-central1
#   ./cloud-revision-tags.sh my-service us-central1 my-gcp-project
# —————————————————————————————————————————

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if required parameters are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <service-name> <region> <project-id>"
    echo "Example: $0 closer-api-large northamerica-northeast1 closer-production-321417"
    exit 1
fi

SERVICE="$1"
REGION="$2"
PROJECT="$3"

# Set up gcloud command
GCLOUD=(gcloud run services describe "$SERVICE" --platform managed --region "$REGION" --project "$PROJECT")

# Get traffic configuration in YAML format
output=$("${GCLOUD[@]}" --format="yaml(spec.traffic)")

# Check if the command was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to get service information. Please check your parameters and permissions."
    exit 1
fi

# Create temporary files
revisions_file=$(mktemp)
tags_file=$(mktemp)
trap 'rm -f "$revisions_file" "$tags_file"' EXIT

# Extract all revision names and their tags
while IFS= read -r line; do
    if [[ $line =~ tag:[[:space:]]*(.+)$ ]]; then
        tag="${BASH_REMATCH[1]}"
        # Clean up the tag (remove quotes and extra spaces)
        tag=$(echo "$tag" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')
        
        # Get the revision name from the next line
        revision_line=$(echo "$output" | grep -A 1 "tag: $tag" | grep "revisionName:" | head -n 1)
        if [[ $revision_line =~ revisionName:[[:space:]]*(.+)$ ]]; then
            revision="${BASH_REMATCH[1]}"
            # Extract just the revision name without the full path
            revision_name=$(basename "$revision")
            echo "$revision_name:$tag" >> "$tags_file"
            echo "$revision_name" >> "$revisions_file"
        fi
    fi
done <<< "$output"

# Print header
printf "%-40s %-20s\n" "REVISION TAG" "LAST DEPLOYED"
printf "%-40s %-20s\n" "----------------------------------------" "--------------------"

# Process each revision
while IFS=: read -r revision_name tag; do
    # Get revision creation time
    creation_time=$(gcloud run revisions describe "$revision_name" --platform managed --region "$REGION" --project "$PROJECT" --format="value(metadata.creationTimestamp)" 2>/dev/null)
    
    if [[ -n "$creation_time" ]]; then
        # Extract date components using sed for macOS compatibility
        year=$(echo "$creation_time" | sed 's/^\([0-9]\{4\}\)-.*/\1/')
        month=$(echo "$creation_time" | sed 's/^[0-9]\{4\}-\([0-9]\{2\}\)-.*/\1/')
        day=$(echo "$creation_time" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-\([0-9]\{2\}\).*/\1/')
        time=$(echo "$creation_time" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T\([0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}\).*/\1/')
        printf "%-40s %s-%s-%s %s\n" "$tag" "$year" "$month" "$day" "$time"
    else
        printf "%-40s %s\n" "$tag" "Unknown"
    fi
done < "$tags_file"

# Calculate totals
total_tags=$(wc -l < "$tags_file")
total_revisions=$total_tags

# Print summary
echo
echo "Total unique tags: $total_tags"
echo "Total tagged revisions: $total_revisions" 