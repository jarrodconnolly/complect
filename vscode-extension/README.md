# Complect Language Support

This is a VS Code extension that provides syntax highlighting for the Complect programming language.

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu and select "Install from VSIX" or "Install Extension from Location"
4. Navigate to this `vscode-extension` folder and select it

Or from the command line:
```bash
cd vscode-extension && npx @vscode/vsce package --allow-missing-repository
cd .. && code --install-extension vscode-extension/complect-language-0.1.0.vsix
```

## Features

- Syntax highlighting for Complect keywords, strings, numbers, and functions
- Bracket matching and auto-closing pairs
- Comment support (// and /* */)

## Development

To test changes to the extension:

1. Make changes to the files in this folder
2. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
3. The extension will automatically reload

## Files

- `package.json` - Extension manifest
- `syntaxes/cplct.tmLanguage.json` - TextMate grammar for syntax highlighting
- `language-configuration.json` - Language-specific settings (brackets, comments, etc.)