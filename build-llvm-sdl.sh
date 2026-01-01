#! /bin/bash
if [ -z "$1" ]; then
  echo "Usage: $0 <test-name>"
  exit 1
fi
complect -b llvm -f fixtures/${1}.cplct -o output/${1}.ll
clang output/${1}.ll -s -lSDL2 -lm -o output/${1}
# ./output/${1}