#!/bin/bash
D="/home/aicrm/workspace/AICRM/docs/testing"
R="$D/results"
for f in test-verification-core test-verification-session verify-core-features verify-session-start verify-timeline test-add-contact test-activity-due-date-tracking; do
  timeout 120 node "$D/$f.js" > "$R/${f}.out" 2>&1
  echo $? > "$R/${f}.exit"
done
