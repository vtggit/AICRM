#!/bin/bash
D="/home/aicrm/workspace/AICRM/docs/testing"
R="$D/results"
for f in test-lead-scoring test-pdf-export test-quick-activity-logging test-revenue-summary test-version-display debug-contact-create debug-contact-create-detailed; do
  timeout 120 node "$D/$f.js" > "$R/${f}.out" 2>&1
  echo $? > "$R/${f}.exit"
done
