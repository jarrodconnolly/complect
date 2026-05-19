# Things To Do (Not Completed Things)

## Immediate (Next Up Changes)
* **Hoist alloca to function entry block in LLVM translator**:
  - `CreateAlloca` is called inline wherever `make` appears in `translateStatement`. In LLVM,
    alloca instructions outside the function entry block are dynamic stack allocations - they grow
    the stack on every execution of that block. A `make x 0` inside a loop body allocates a new
    4-byte stack slot on every iteration and never releases it until the function returns.
  - At small loop counts (e.g. 160x100 fire buffer) this is invisible. At 640x400 with a nested
    inner loop running ~254,000 iterations and ~12 `make` statements each, the stack grows by
    ~12MB per frame, which exceeds the Linux 8MB stack limit and causes a segfault.
  - Fix: emit all alloca instructions at the start of the function entry block. Options:
    - Pre-scan the function body (and nested scopes) to collect all variable names before
      generating any instructions, emit one alloca per name in the entry block, then translate
      the body with only stores/loads for those names.
    - Or use LLVM's `mem2reg` pass (already available via optimization passes) which promotes
      allocas to SSA registers - but only works if allocas are in the entry block to begin with.
  - Workaround (current): pre-declare all loop variables before the first loop in the source
    program, using `make x 0` at the function top and `x = value` inside loops.
* **True Global Variable Scope via LLVM GlobalVariable**:
  - Variables declared at program level (outside any function) are currently compiled as `alloca`
    instructions inside `main()`. LLVM values are function-scoped (SSA), so they cannot be
    referenced from any other function. `this.variables.clear()` in `translateFunctionDeclaration`
    is intentional, not accidental - there is no quick fallback fix.
  - Correct approach:
    - Track whether translation is currently inside a function body (e.g. `this.inFunction` flag)
    - Program-level scalar `make x 0`: emit `llvm.GlobalVariable` of `i32` type; store initial
      value in `main` at startup
    - Program-level dynamic array `make arr[size]`: emit `llvm.GlobalVariable` of `i8*` (pointer
      type), initialized to null; in `main`, call `malloc(size * 4)` and store result into global
    - Store globals in `this.variables` as `{ type, value: globalVar, isGlobal: true }`
    - Every load/store path in the translator must check `isGlobal`: if true, emit a `load` of
      the `GlobalVariable` first to get the current pointer/value, then operate on that
    - `translateFunctionDeclaration`: instead of `this.variables.clear()`, build a new map
      containing only global entries, then add function parameters on top
  - Risk: Medium. Every variable access path needs the `isGlobal` branch. Arrays are trickier
    than scalars (pointer indirection adds a step to every read and write). Existing programs
    (no functions) are unaffected if globals are correctly gated on the flag.
* **Language Grammar Enhancements**:
  - Add array literal initialization syntax (e.g. `make pal[256] = [0, 0, 0, 60, 101, ...]`)
    so fixed lookup tables do not require hundreds of individual assignment statements.
    Palette arrays, sine tables, and similar constant data are common in graphics programs.
  - Add array support (declaration, indexing, operations)
  - Add file I/O operations (read/write files)
  - Add break/continue statements for loop control
  - Support for more complex expressions and control flow
* Review how to use line/col info in TokenizerError & ASTError (available from preprocessing tokens)

## Short-term
* Add more built-in functions and standard library capabilities
* Improve error messages and debugging support

## Standard Library Functions
* **Math Functions**: abs, sqrt, pow, tan, floor, ceil, round, min, max, random, randomInt
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