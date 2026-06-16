#!/bin/bash
TEST_FILE="$1"
OUT_DIR="$2"
BASENAME=$(basename "$TEST_FILE" .js)
OUTFILE="$OUT_DIR/${BASENAME}.out"
EXIT_FILE="$OUT_DIR/${BASENAME}.exit"

cd /home/aicrm/workspace/AICRM/docs/testing
timeout 120 node "$TEST_FILE" > "$OUTFILE" 2>&1
EXIT_CODE=$?
echo "$EXIT_CODE" > "$EXIT_FILE"
