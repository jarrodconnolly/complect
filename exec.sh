#! /bin/bash
if [ -z "$1" ]; then
  echo "Usage: $0 <test-name>"
  exit 1
fi
complect -b llvm -f fixtures/${1} -o output/${1}.ll
llc output/${1}.ll -o output/${1}.s
clang output/${1}.ll -s -o output/${1}
./output/${1}
valgrind --tool=memcheck --leak-check=full ./output/${1} 2>&1 | grep -E "(allocs| frees| allocated| lost)"

