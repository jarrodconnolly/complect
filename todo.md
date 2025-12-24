# Things To Do

## Immediate (Next Up Changes)
* Review how to use line/col info in TokenizerError & ASTError (available from preprocessing tokens)
* Refactor _transform in babel-ast into smaller methods (#handleInitialState, #handleVariableDeclaration, etc.) for better readability
* Improve variable names (e.g., #ifMode → #blockNestingLevel, #ifBlockStatements → #statementStacks)
* Implement proper expression parser for assignments to handle simple values (e.g., support `f = 5` in addition to `f = i % 3`) - this may require changing the FSM to a more flexible parser

## Short-term
* Combine operators between preprocessor's isOperator() and tokenizer's operators.js for single source of truth and consistency
* Review use of Streams vs. passing data between layers (consider if synchronous data passing is simpler for a toy compiler)

## Medium-term (Multiple AST/Backend Support)
* Adapt architecture for pluggable AST/backends:
  - Abstract AST generation (e.g., via factory pattern or config) to allow switchable backends
  - Keep Babel AST as default JS backend
  - Add Binaryen AST for WebAssembly (WASM) output (start in llvm-test/ or new file)
  - Evaluate and add LLVM backend if feasible (consider complexity vs. educational value)
  - Implement custom AST and interpreter for educational purposes (focus on interpretation first, then code generation)
* Update README to reflect multi-backend support and current limitations (e.g., simple expressions only)

## Long-term
* Explore compiler optimization passes
* Build custom code generation for specific architectures beyond JS/WASM