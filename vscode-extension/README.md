# Complect Language Support

This is a VS Code extension that provides comprehensive language support for the Complect programming language, including syntax highlighting and Language Server Protocol (LSP) features.

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu and select "Install from VSIX"
4. Navigate to this `vscode-extension` folder and select the `.vsix` file

Or from the command line:
```bash
cd vscode-extension && npx @vscode/vsce package --allow-missing-repository
cd .. && code --install-extension vscode-extension/complect-language-0.1.0.vsix
```

## Features

- **Syntax Highlighting**: Full syntax highlighting for Complect keywords, strings, numbers, functions, and operators
- **Bracket Matching**: Automatic bracket matching and auto-closing pairs
- **Comment Support**: Line comments (`#`) and block comments (`/* */`)
- **Hover Information**: Hover over built-in functions like `print`, `stringConcat`, and `intToString` for documentation
- **Code Completion**: Intelligent completion suggestions for keywords, built-in functions, and operators (Ctrl+Space)
- **Language Server**: LSP integration for advanced IDE features

## Supported Language Features

### Keywords
- `make identifier expression` - Declare a new variable
- `assign identifier expression` - Assign to existing variable
- `if condition ... endif` - Conditional execution
- `as condition ... repeat` - Loop while condition is true
- `func name param1 param2 ... end` - Function definition
- `return identifier` - Return from function
- `call function arg1 arg2 result` - Call function with result
- `call function arg1 arg2` - Call function (void)
- `print expression` - Print to console
- `free identifier` - Free variable from memory

### Operators
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Assignment: `=`

### Literals
- Numbers: `42`, `3.14`
- Strings: `"hello"`, `'world'`

### Built-in Functions
- `sin angle scale` - Calculate sine with scaling
- `cos angle scale` - Calculate cosine with scaling
- `sdlInit` - Initialize SDL graphics
- `sdlWindow width height title` - Create window
- `sdlDelay milliseconds` - Pause execution
- `sdlEvents` - Handle input events
- `sdlRenderer` - Create renderer
- `sdlPutPixel x y r g b` - Draw pixel
- `sdlPresent` - Show graphics
- `sdlClear` - Clear screen
- `sdlSetColor r g b` - Set drawing color
- `sdlDrawLine x1 y1 x2 y2` - Draw line

### Code Completion
Press `Ctrl+Space` to see completion suggestions for:
- All keywords with correct syntax
- Built-in functions with proper signatures
- Operators with usage information

## Development

To test changes to the extension:

1. Make changes to the files in this folder
2. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
3. The extension will automatically reload

## Files

- `package.json` - Extension manifest with LSP configuration
- `extension.js` - VS Code extension client that connects to the language server
- `server.js` - Language server implementation with hover support
- `syntaxes/cplct.tmLanguage.json` - TextMate grammar for syntax highlighting
- `language-configuration.json` - Language-specific settings (brackets, comments, etc.)
- `test.cplct` - Test file demonstrating language features