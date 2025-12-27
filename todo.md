# Things To Do (Not Completed Things)

## Immediate (Next Up Changes)
* **Language Grammar Enhancements**:
  - Add array support (declaration, indexing, operations)
  - Add file I/O operations (read/write files)
  - Add break/continue statements for loop control
  - Support for more complex expressions and control flow
* Review how to use line/col info in TokenizerError & ASTError (available from preprocessing tokens)

## Short-term
* Add more built-in functions and standard library capabilities
* Improve error messages and debugging support

## Standard Library Functions
* **Math Functions**: abs, sqrt, pow, sin, cos, tan, floor, ceil, round, min, max, random, randomInt
* **String Functions**: length, substring, indexOf, replace, toUpper, toLower, trim, charAt
* **Type Conversion**: int, float, string
* **Utility Functions**: now, sleep, assert, typeOf
* **I/O Functions**: readFile, writeFile, appendFile, readLines

## Medium-term (Multiple AST/Backend Support)
* Explore compiler optimization passes
* Build custom code generation for specific architectures beyond JS/WASM
* Combine operators between preprocessor's isOperator() and tokenizer's operators.js for single source of truth and consistency
* Implement proper expression parser for assignments to handle simple values (e.g., support `f = 5` in addition to `f = i % 3`) - this may require changing the FSM to a more flexible parser

## Long-term
* Add type system and static analysis
* Performance benchmarking and optimization
* Package management and ecosystem tools
* Add Binaryen AST for WebAssembly (WASM) output (start in llvm-test/ or new file)