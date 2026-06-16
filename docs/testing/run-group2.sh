#!/bin/bash
D="/home/aicrm/workspace/AICRM/docs/testing"
R="$D/results"
for f in test-activity-reminders test-activity-trends test-ai-recommendations test-backup-restore test-bulk-operations test-communication-timeline test-contact-duplicate-detection; do
  timeout 120 node "$D/$f.js" > "$R/${f}.out" 2>&1
  echo $? > "$R/${f}.exit"
done
