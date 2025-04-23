#!/usr/bin/env bash
set -euo pipefail

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

# Show help if requested
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    cat <<-EOF
Usage: $0 SERVICE [REGION] [PROJECT]

Analyzes manually assigned revision tags across Cloud Run service revisions.
These tags live in the service's traffic spec, not on the revision metadata.

Arguments:
  SERVICE    Name of the Cloud Run service (required)
  REGION     GCP region (optional)
  PROJECT    GCP project ID (optional)

Examples:
  $0 my-service
  $0 my-service us-central1
  $0 my-service us-central1 my-gcp-project
EOF
    exit 0
fi

# Validate required SERVICE parameter
if [[ $# -lt 1 ]]; then
    echo "Error: SERVICE parameter is required"
    echo "Use --help for usage information"
    exit 1
fi

SERVICE=$1
REGION=${2:-}
PROJECT=${3:-}

# build gcloud command to list all traffic entries (tag + revisionName)
GCLOUD=(gcloud run services describe "$SERVICE" --platform managed)
[[ -n $REGION  ]] && GCLOUD+=(--region  "$REGION")
[[ -n $PROJECT ]] && GCLOUD+=(--project "$PROJECT")
GCLOUD+=(--format="json(spec.traffic)")

# Initialize arrays
declare -a TAG_LIST
declare -a UNIQUE_TAGS
declare -a TAG_COUNTS

# Run the command and process JSON output
output=$("${GCLOUD[@]}" 2>/dev/null)

# Extract tags from JSON using jq if available, otherwise use grep
if command -v jq &> /dev/null; then
    # Use jq to extract tags (more reliable)
    while IFS= read -r tag; do
        [[ -n "$tag" ]] && [[ "$tag" != "null" ]] && TAG_LIST+=("$tag")
    done < <(echo "$output" | jq -r '.spec.traffic[] | select(.tag != null) | .tag')
else
    # Fallback to grep/sed for systems without jq
    while IFS= read -r line; do
        if [[ "$line" =~ \"tag\":\ *\"([^\"]+)\" ]]; then
            tag="${BASH_REMATCH[1]}"
            [[ -n "$tag" ]] && TAG_LIST+=("$tag")
        fi
    done < <(echo "$output")
fi

# Check if we got any tags at all
if [[ ${#TAG_LIST[@]} -eq 0 ]]; then
    echo "No revision tags found for service '$SERVICE'"
    echo "This means no revisions have been manually tagged for direct access"
    exit 0
fi

# Count occurrences of each tag
for tag in "${TAG_LIST[@]}"; do
    found=0
    for i in "${!UNIQUE_TAGS[@]}"; do
        if [[ "${UNIQUE_TAGS[$i]}" == "$tag" ]]; then
            TAG_COUNTS[$i]=$((TAG_COUNTS[$i] + 1))
            found=1
            break
        fi
    done
    if [[ $found -eq 0 ]]; then
        UNIQUE_TAGS+=("$tag")
        TAG_COUNTS+=(1)
    fi
done

# Sort tags by count descending (simple bubble sort)
for ((i=0; i<${#UNIQUE_TAGS[@]}; i++)); do
    for ((j=i+1; j<${#UNIQUE_TAGS[@]}; j++)); do
        if (( TAG_COUNTS[i] < TAG_COUNTS[j] )); then
            # swap counts
            tmp=${TAG_COUNTS[i]}; TAG_COUNTS[i]=${TAG_COUNTS[j]}; TAG_COUNTS[j]=$tmp
            # swap tags
            tmp=${UNIQUE_TAGS[i]}; UNIQUE_TAGS[i]=${UNIQUE_TAGS[j]}; UNIQUE_TAGS[j]=$tmp
        fi
    done
done

# Output summary
printf "\n%-25s %s\n" "REVISION TAG" "COUNT"
printf "%-25s %s\n" "------------" "-----"
for i in "${!UNIQUE_TAGS[@]}"; do
    printf "%-25s %d\n" "${UNIQUE_TAGS[$i]}" "${TAG_COUNTS[$i]}"
done

echo
echo "Total unique tags: ${#UNIQUE_TAGS[@]}"
echo "Total tagged revisions: ${#TAG_LIST[@]}" 