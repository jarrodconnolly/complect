#! /bin/bash
if [ -z "$1" ]; then
  echo "Usage: $0 <test-name>"
  exit 1
fi
complect -b babel -f fixtures/${1} -o output/${1}.js
node output/${1}.js