#!/bin/bash
D="/home/aicrm/workspace/AICRM/docs/testing"
R="$D/results"
for f in test-contact-timeline test-contact-timeline-v2 test-csv-import-export test-email-templates test-kanban test-keyboard-shortcuts test-lead-csv; do
  timeout 120 node "$D/$f.js" > "$R/${f}.out" 2>&1
  echo $? > "$R/${f}.exit"
done
