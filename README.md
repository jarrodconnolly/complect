# Complect - A Toy Compiler

<img src="https://i.imgur.com/NLVzU2tm.png" alt="Complect Logo"/>

Complect is a toy compiler developed in Node.js. It operates as an async generator-based compiler, processing code incrementally with push-like data flow for efficiency and modularity. Complect supports multiple backends: transpilation to JavaScript using Babel AST, and compilation to LLVM IR for native code generation. The pluggable backend architecture enables easy addition of WebAssembly, custom interpreters, and other targets.

Recent additions include math functions (sin, cos), SDL graphics integration for 2D/3D rendering, and a rotating 3D cube demo showcasing perspective projection and real-time animation.

The initial implementation of this compiler was created to support a talk I presented at **OpenJS World 2022**. You can find the contents of this talk here. [Slides](https://static.sched.com/hosted_files/openjsworld2022/78/OpenJSW%20World%202022.pdf) [Video](https://youtu.be/aPHf_-N2yTU)

## Demo

Below is an example of the `fixtures/sdl-cube` demo application compiled with the LLVM backend, linked with sdl2. We have graphics.

<img src="rotating.gif" alt="Rotating Cube Demo" height="300" />

## Stages
- Preprocessor: Transforms an input stream into a sequence of preprocessing tokens yielded incrementally.
- Tokenizer: Converts the sequence of preprocessing tokens into a sequence of tokens yielded incrementally.
- Abstract Syntax Tree (AST): Generates an intermediate representation (IR) from the sequence of tokens.
- Output: Pluggable backends convert IR to JavaScript (via Babel AST) or LLVM IR for native compilation.

## Design
Complect utilizes a handcrafted parser and lexer to give developers fine-grained control over the compilation process. The parser in Complect is a top-down parser of the LL(1) type, chosen for its simplicity and efficiency in parsing.

### Key Design Elements
- Handcrafted Parser and Lexer: Complect's components are manually written, unlike tools-generated parsers and lexers. This allows for greater customization and optimization specific to the language's needs.

- Top-Down Parsing (LL(1)): Complect's choice of a top-down parser of the LL(1) type is not arbitrary. This parsing method, which proceeds from left to right and produces a leftmost derivation with a single token lookahead, is known for its efficiency and simplicity. The grammar of the Complect language has been meticulously designed to facilitate this type of parsing, ensuring that parsing decisions can be made with minimal lookahead.

- Async Generator-Based Compilation: The compiler processes code using async generators, yielding tokens and AST nodes incrementally for efficiency and modularity. This design supports asynchronous processing and easier debugging, with stages pushing data to the next via iteration (e.g., preprocessor yields tokens to tokenizer). While not a pure stream, it balances performance for large inputs with simplicity for a toy compiler.

- LLVM IR Generation: Complect can generate LLVM Intermediate Representation for native code compilation using clang or llc.

- Modular AST Generation: The architecture supports pluggable backends via an intermediate representation (IR), enabling output to JavaScript, LLVM IR, WebAssembly, or custom interpreters.

- Full Language Support: Both backends support the complete Complect language including integers, strings, arithmetic, concatenation, comparisons, and control flow.

### Future
- Additional backends: WebAssembly (Binaryen), custom interpreters
- Compiler optimization passes
- Enhanced language features

## Usage
### CLI
You can use Complect as a command-line tool. The entry point of the application is `bin/cli.js`.

```bash
# Show help
complect --help

# Compile from stdin to stdout (default: babel backend)
cat program | complect

# Compile from file to stdout
complect --file program

# Compile to specific backend
complect --file program --backend llvm

# Compile to file
complect --file program --output program.js
complect --file program --backend llvm --output program.ll
```

#### LLVM IR Usage
When using the LLVM backend, Complect generates LLVM Intermediate Representation (.ll) files that can be compiled to native binaries:

```bash
# Generate LLVM IR
complect --file fib --backend llvm --output fib.ll

# Compile to assembly (for inspection)
llc fib.ll -o fib.s

# Compile to executable binary
clang fib.ll -o fib

# Run the binary
./fib
```

### Testing
Tests are written using Node's built-in test module.
`npm run test`

### Linting
Linting is done using ESLint.
`npm run lint`

## Language
Complect is a simple, procedural programming language designed for educational and experimental purposes. It emphasizes clarity, modularity, and low-level control, with a focus on compiling to efficient native code via LLVM IR. The language supports integers, strings, arithmetic, comparisons, control flow, functions, and a growing standard library for math, graphics (via SDL), and utilities.

Key features include:
- **Variables and Expressions**: Dynamic typing with integer and string support. Expressions handle binary operations with operator precedence and unary minus.
- **Control Flow**: Conditional statements (`if`/`endif`) and loops (`as`/`repeat`).
- **Functions**: User-defined functions with parameters and return values.
- **Standard Library**: Built-in functions for math (e.g., `sin`, `cos`), graphics (SDL commands), and I/O.
- **Backends**: Full support for JavaScript (Babel) and LLVM IR generation.

The language is evolving—new stdlib functions and features (e.g., arrays, file I/O) will be added incrementally, with this documentation updated accordingly.

### Grammar
Complect's grammar is designed for LL(1) parsing (top-down, left-to-right with single-token lookahead) to keep the parser simple and efficient. Programs consist of statements, which can include variable declarations, assignments, control structures, function calls, and stdlib commands. Expressions follow operator precedence rules.

#### Keywords and Syntax
Below is a reference for all supported keywords, their parameters, and usage. Parameters are positional unless noted.

- **`make <identifier> <expression>`**: Declares and initializes a variable. E.g., `make x 5` creates `x` with value 5.
- **`assign <identifier> <expression>`**: Assigns a value to a variable. E.g., `assign x 10`.
- **`<identifier> = <expression>`**: Assigns the result of an expression to a variable. E.g., `x = y + 1`.
- **`if <expression>` ... `endif`**: Conditional block. Executes if the expression is non-zero. E.g., `if x > 0 ... endif`.
- **`as <expression>` ... `repeat`**: Loop (while-like). Repeats while the expression is true. E.g., `as i < 10 ... i = i + 1 repeat`.
- **`print <expression>`**: Outputs the expression's value to stdout. E.g., `print "Hello"`.
- **`free <identifier>`**: Deallocates a variable (for memory management in LLVM backend).
- **`func <identifier> <parameters>` ... `end`**: Defines a function. Parameters are identifiers. E.g., `func add x y ... return result end`.
- **`return <identifier>`**: Returns a value from a function. E.g., `return result`.
- **`call <identifier> <arguments> [into <identifier>]`**: Calls a function. `into` assigns the return value. E.g., `call add 1 2 into sum`.
- **`sin <angle> <scale>`**: Computes sine of angle (degrees) scaled by scale. Returns integer. E.g., `sin 90 1000` → 1000.
- **`cos <angle> <scale>`**: Computes cosine of angle (degrees) scaled by scale. Returns integer. E.g., `cos 0 1000` → 1000.

#### SDL Graphics Keywords (Standard Library)
Complect integrates SDL2 for graphics and events. These are stdlib functions, not core keywords, but treated as such in parsing.

- **`sdlInit`**: Initializes SDL. No parameters.
- **`sdlWindow <width> <height> <title>`**: Creates a window. E.g., `sdlWindow 800 600 "Demo"`.
- **`sdlRenderer`**: Creates a renderer for the window. No parameters.
- **`sdlSetColor <r> <g> <b>`**: Sets drawing color (0-255). E.g., `sdlSetColor 255 0 0`.
- **`sdlClear`**: Clears the screen with the current color.
- **`sdlDrawLine <x1> <y1> <x2> <y2>`**: Draws a line between points.
- **`sdlPresent`**: Updates the display with drawn content.
- **`sdlDelay <ms>`**: Pauses execution for milliseconds.
- **`sdlEvents`**: Polls and handles SDL events (e.g., window close).

#### Expressions and Operator Precedence
Expressions combine literals, variables, and operators. Precedence (highest to lowest):
1. **Unary Minus**: `-<expression>` (e.g., `-x`).
2. **Multiplicative**: `*`, `/`, `%` (left-associative).
3. **Additive**: `+`, `-` (left-associative).
4. **Comparisons**: `==`, `!=`, `<`, `>`, `<=`, `>=` (left-associative).

Examples:
- `x = a + b * c` → `x = a + (b * c)`
- `y = -x / 2` → Unary minus applied first.
- Literals: Integers (e.g., `42`), strings (e.g., `"hello"`).

#### Program Structure
- Programs are sequences of statements.
- Functions can be defined anywhere and called after definition.
- No global scope for variables (each function has its own scope).
- Comments are not supported (keep code simple).

#### Limitations and Notes
- No arrays, objects, or advanced types yet.
- Parentheses are not supported for expression grouping; expressions follow strict operator precedence.
- Error messages include line/column info for debugging.
- Grammar is extensible—new keywords/functions will be added here as the stdlib grows.

### FizzBuzz in Complect
```
make i 1
make f 0
make b 0
make output ''

as i <= 16
  f = i % 3
  b = i % 5
  assign output ''
  if f == 0
    output = output + 'Fizz'
  endif
  if b == 0
    output = output + 'Buzz'
  endif
  if output == ''
    output = output + i
  endif
  print output
  i = i + 1
repeat
```
## Author
Complect is created by Jarrod Connolly.

## License
MIT License

See [LICENSE](LICENSE) for the full license text.