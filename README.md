# Complect - A Toy Compiler

<img src="https://i.imgur.com/NLVzU2tm.png" alt="Complect Logo"/>

Complect is a toy compiler developed in Node.js. It operates as a stream-based compiler, processing code as a continuous stream of data. Currently, Complect functions primarily as a transpiler, converting Complect code into JavaScript using the Babel Abstract Syntax Tree (AST). Future enhancements will include support for additional ASTs, enabling compilation to WebAssembly (WASM) and other targets.

The initial implementation of this compiler was created to support a talk I presented at **OpenJS World 2022**. You can find the contents of this talk here. [Slides](https://static.sched.com/hosted_files/openjsworld2022/78/OpenJSW%20World%202022.pdf) [Video](https://youtu.be/aPHf_-N2yTU)

## Stages
- Preprocessor: Transforms an input stream into a stream of preprocessing tokens.
- Tokenizer: Converts the stream of preprocessing tokens into a stream of tokens.
- Abstract Syntax Tree (AST): Generates an AST from the stream of tokens, currently utilizing Babel.
- Output: The Babel AST outputs code in JavaScript.

## Design
Complect utilizes a handcrafted parser and lexer to give developers fine-grained control over the compilation process. The parser in Complect is a top-down parser of the LL(1) type, chosen for its simplicity and efficiency in parsing.

### Key Design Elements
- Handcrafted Parser and Lexer: Complect's components are manually written, unlike tools-generated parsers and lexers. This allows for greater customization and optimization specific to the language's needs.

- Top-Down Parsing (LL(1)): Complect's choice of a top-down parser of the LL(1) type is not arbitrary. This parsing method, which proceeds from left to right and produces a leftmost derivation with a single token lookahead, is known for its efficiency and simplicity. The grammar of the Complect language has been meticulously designed to facilitate this type of parsing, ensuring that parsing decisions can be made with minimal lookahead.

- Stream-Based Compilation: The compiler processes code as a data stream, enhancing efficiency and memory usage. This will also allow easier insertion of future optimization layers.

- Babel AST Integration: Complect currently generates an Abstract Syntax Tree (AST) using Babel, which outputs JavaScript code. This integration with Babel allows leveraging its robust ecosystem to further process and transform the generated JavaScript code.

### Future
- Integration of Binaryen as the AST to generate code in WebAssembly.
- Explore compiler optimization passes.

## Usage
### CLI
You can use Complect as a command-line tool. The entry point of the application is `cli.js`. It reads from the standard input, compiles the input, and writes the output to the standard output.

### Testing
Tests are written using Node's built-in test module.
`npm run test`

### Linting
Linting is done using ESLint.
`npm run lint`

## Language
### Keywords and Usage
Complect is changing as the parser develops, expect things to change.

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
GNU General Public License v3.0

See [COPYING](COPYING) to see the full text.