#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[INFO] $(date +'%T') - $*"
}

log "Starting: $0 $*"

# deps
for cmd in gcloud jq; do
  command -v $cmd &>/dev/null || { echo "[ERROR] $cmd missing"; exit 1; }
done
log "Checked dependencies"

# args
[ $# -eq 3 ] || { echo "Usage: $0 SERVICE REGION PROJECT"; exit 1; }
SERVICE=$1; REGION=$2; PROJECT=$3
log "Args → SERVICE=$SERVICE, REGION=$REGION, PROJECT=$PROJECT"

# temp files
map_file=$(mktemp); ts_file=$(mktemp)
trap 'rm -f "$map_file" "$ts_file"' EXIT
log "Temp files → map=$map_file ts=$ts_file"

# 1) build tag→revision map
log "Step 1: extracting tag→revision mappings"
gcloud run services describe "$SERVICE" \
    --platform=managed --region="$REGION" --project="$PROJECT" \
    --format=json \
  | jq -r '
      .spec.traffic[]
      | select(.tag != null)
      | "\(.tag):\(.revisionName | sub(".*/";""))"
    ' > "$map_file"
map_count=$(wc -l < "$map_file")
log "Step 1 complete: found $map_count mappings"
[ "$map_count" -gt 0 ] || { log "No tagged revisions → exit"; exit 0; }

# 2) fetch *all* revisions for that service (with timestamps)
log "Step 2: fetching all revisions for service (no OR filter!)"
log "Command: gcloud run revisions list --service=$SERVICE ..."
log "Step 2 START"
gcloud run revisions list \
    --platform=managed --region="$REGION" --project="$PROJECT" \
    --service="$SERVICE" \
    --format="value(metadata.name,metadata.creationTimestamp)" \
  > "$ts_file"
ts_count=$(wc -l < "$ts_file")
log "Step 2 END: fetched $ts_count revision timestamps"

# 3) join & print
log "Step 3: joining and printing report"
printf "%-40s %-20s\n" "REVISION TAG" "LAST DEPLOYED"
printf "%-40s %-20s\n" "----------------------------------------" "--------------------"
while IFS=: read -r tag rev; do
  ts=$(awk -v r="$rev" '$1==r{print $2}' "$ts_file")
  [ -z "$ts" ] && ts="Unknown"
  printf "%-40s %s\n" "$tag" "$ts"
done < "$map_file"

echo
echo "Total unique tags: $map_count"
log "Done"
