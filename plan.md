
## Final Plan for Next Phase: Building a Custom Intermediate AST (IR) for Multi-Backend Support

With the README done, let's outline the implementation plan for generalizing the AST to support pluggable backends (Babel JS, LLVM, Binaryen WASM, custom interpreter). We'll follow **Option 1** from our earlier analysis: Build a custom IR first, then translate to target ASTs. This keeps parsing logic shared and enables easy backend additions.

### Phase Goals
- Decouple AST construction from Babel specifics.
- Enable backends like LLVM (inspired by llvm.js) and WASM.
- Maintain line/column propagation for error reporting.
- Keep the codebase educational and modular.

### Step-by-Step Implementation Plan

#### 1. **Define the Intermediate Representation (IR) Classes** (1-2 days)
   - Create `lib/ast/ir-nodes.js`: Define abstract AST node classes for Complect's language features.
   - Base classes: `Node` (with `loc` for line/column), `Program`, `Statement`, `Expression`.
   - Specific nodes: `VariableDeclaration`, `AssignmentExpression`, `BinaryExpression`, `IfStatement`, `WhileStatement`, `PrintStatement`, etc.
   - Example:
     ```javascript
     export class VariableDeclaration extends Statement {
       constructor(identifier, value, loc) {
         super(loc);
         this.identifier = identifier; // string or Identifier node
         this.value = value; // Expression
       }
     }
     ```
   - Ensure IR is backend-agnostic (e.g., no JS-specific assumptions).

#### 2. **Refactor BabelAST into IR Builder + Babel Translator** (2-3 days)
   - Extract parsing logic from babel-ast.js into `lib/ast/ast-builder.js`: A new class that builds IR from tokens using the same state machine.
   - Create `lib/backends/babel-translator.js`: Translates IR to Babel AST (e.g., `IR.VariableDeclaration` → `t.variableDeclaration`).
   - Update compiler.js to use `ASTBuilder` for IR, then `BabelTranslator` for Babel AST.
   - Test: Ensure output matches current Babel backend.

#### 3. **Add LLVM Backend** (3-4 days)
   - Create `lib/backends/llvm-translator.js`: Translates IR to LLVM IR strings (e.g., using llvm.js as a template).
   - Handle LLVM specifics: Modules, functions, variables, control flow.
   - Update compiler.js for backend selection (e.g., via config).
   - Test: Compile simple Complect code to LLVM IR and verify with `lli` or similar.

#### 4. **Add Binaryen (WASM) Backend** (2-3 days)
   - Create `lib/backends/binaryen-translator.js`: Translates IR to Binaryen AST for WASM output.
   - Integrate Binaryen library for WASM generation.
   - Test: Output WASM modules from Complect code.

#### 5. **Add Custom Interpreter Backend** (2-3 days)
   - Create `lib/backends/interpreter.js`: Evaluates IR directly (e.g., `VariableDeclaration` sets a runtime variable).
   - Implement a simple runtime environment (scope, execution).
   - Test: Run Complect code without external compilation.

#### 6. **Backend Configuration and CLI Updates** (1 day)
   - Add backend selection to compiler.js (e.g., `--backend babel|llvm|wasm|interpreter`).
   - Update cli.js to pass backend option.
   - Update tests for multiple backends.

#### 7. **Testing, Documentation, and Polish** (2-3 days)
   - Update all tests to cover IR building and translations.
   - Add integration tests for backends.
   - Update README.md with backend usage examples.
   - Ensure line/column errors propagate through IR.

### Timeline and Milestones
- **Total Time**: ~2-3 weeks (part-time).
- **Milestone 1**: IR classes + Babel refactor (Week 1).
- **Milestone 2**: LLVM backend (Week 2).
- **Milestone 3**: WASM + Interpreter backends, config, tests (Week 3).
- **Risks**: LLVM/Binaryen integration may require learning curves; start with simple backends.
- **Dependencies**: Install `binaryen` npm package for WASM.

This plan builds on your current solid foundation, making Complect a true multi-target compiler. Ready to start with Step 1? I can provide code snippets for the IR classes! 🚀

Made changes.