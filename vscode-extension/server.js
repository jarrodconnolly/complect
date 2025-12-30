const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  CompletionItemKind,
  Hover,
  DiagnosticSeverity,
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
  hasDiagnosticRelatedInformationCapability = !!capabilities.textDocument?.publishDiagnostics?.relatedInformation;

  const result = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      hoverProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register('workspace/didChangeConfiguration', undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The example settings
const defaultSettings = { maxNumberOfProblems: 1000 };

// Cache the settings of all open documents
const documentSettings = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    // globalSettings = change.settings.languageServerExample || defaultSettings;
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument) {
  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText();
  const pattern = /\b[A-Z]{2,}\b/g;

  let problems = 0;
  const diagnostics = [];
  let match;
  while (problems < 1000) {
    match = pattern.exec(text);
    if (match === null) break;
    problems++;
    const diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(match.index),
        end: textDocument.positionAt(match.index + match[0].length),
      },
      message: `${match[0]} is all uppercase.`,
      source: 'ex',
    };
    if (hasDiagnosticRelatedInformationCapability) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: 'Spelling matters',
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: 'Particularly for names',
        },
      ];
    }
    diagnostics.push(diagnostic);
  }

  // Send the computed diagnostics to VS Code.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(async (_textDocumentPosition) => {
  // Provide completion items for Complect language
  return [
    // Keywords - Variable and assignment
    {
      label: 'make',
      kind: CompletionItemKind.Keyword,
      detail: 'make identifier expression',
      documentation: 'Declare a new variable with an initial value',
      data: 1,
    },
    {
      label: 'assign',
      kind: CompletionItemKind.Keyword,
      detail: 'assign identifier expression',
      documentation: 'Assign a value to an existing variable',
      data: 2,
    },
    // Keywords - Control flow
    {
      label: 'if',
      kind: CompletionItemKind.Keyword,
      detail: 'if condition ... endif',
      documentation: 'Execute code conditionally',
      data: 3,
    },
    {
      label: 'endif',
      kind: CompletionItemKind.Keyword,
      detail: 'endif',
      documentation: 'End an if statement block',
      data: 4,
    },
    {
      label: 'as',
      kind: CompletionItemKind.Keyword,
      detail: 'as condition ... repeat',
      documentation: 'Start a loop that repeats while condition is true',
      data: 5,
    },
    {
      label: 'repeat',
      kind: CompletionItemKind.Keyword,
      detail: 'repeat',
      documentation: 'End a loop block started with "as"',
      data: 6,
    },
    // Keywords - Functions
    {
      label: 'func',
      kind: CompletionItemKind.Keyword,
      detail: 'func name param1 param2 ... end',
      documentation: 'Define a new function',
      data: 7,
    },
    {
      label: 'return',
      kind: CompletionItemKind.Keyword,
      detail: 'return identifier',
      documentation: 'Return a value from a function',
      data: 8,
    },
    {
      label: 'call',
      kind: CompletionItemKind.Keyword,
      detail: 'call function arg1 arg2 result',
      documentation: 'Call a function (with result) or call function arg1 arg2 (void)',
      data: 9,
    },
    {
      label: 'end',
      kind: CompletionItemKind.Keyword,
      detail: 'end',
      documentation: 'End a function definition',
      data: 10,
    },
    // Keywords - Other
    {
      label: 'print',
      kind: CompletionItemKind.Keyword,
      detail: 'print expression',
      documentation: 'Print a value to the console',
      data: 11,
    },
    {
      label: 'free',
      kind: CompletionItemKind.Keyword,
      detail: 'free identifier',
      documentation: 'Free a variable from memory',
      data: 12,
    },
    // Built-in math functions
    {
      label: 'sin',
      kind: CompletionItemKind.Function,
      detail: 'sin angle scale',
      documentation: 'Calculate sine of an angle with scaling factor',
      data: 13,
    },
    {
      label: 'cos',
      kind: CompletionItemKind.Function,
      detail: 'cos angle scale',
      documentation: 'Calculate cosine of an angle with scaling factor',
      data: 14,
    },
    // SDL graphics functions
    {
      label: 'sdlInit',
      kind: CompletionItemKind.Function,
      detail: 'sdlInit',
      documentation: 'Initialize SDL graphics system',
      data: 15,
    },
    {
      label: 'sdlWindow',
      kind: CompletionItemKind.Function,
      detail: 'sdlWindow width height title',
      documentation: 'Create an SDL window with specified dimensions and title',
      data: 16,
    },
    {
      label: 'sdlDelay',
      kind: CompletionItemKind.Function,
      detail: 'sdlDelay milliseconds',
      documentation: 'Pause execution for specified milliseconds',
      data: 17,
    },
    {
      label: 'sdlEvents',
      kind: CompletionItemKind.Function,
      detail: 'sdlEvents',
      documentation: 'Handle SDL events (keyboard, mouse, etc.)',
      data: 18,
    },
    {
      label: 'sdlRenderer',
      kind: CompletionItemKind.Function,
      detail: 'sdlRenderer',
      documentation: 'Create an SDL renderer for drawing',
      data: 19,
    },
    {
      label: 'sdlPutPixel',
      kind: CompletionItemKind.Function,
      detail: 'sdlPutPixel x y r g b',
      documentation: 'Draw a pixel at position (x,y) with RGB color',
      data: 20,
    },
    {
      label: 'sdlPresent',
      kind: CompletionItemKind.Function,
      detail: 'sdlPresent',
      documentation: 'Present the rendered graphics to the screen',
      data: 21,
    },
    {
      label: 'sdlClear',
      kind: CompletionItemKind.Function,
      detail: 'sdlClear',
      documentation: 'Clear the screen',
      data: 22,
    },
    {
      label: 'sdlSetColor',
      kind: CompletionItemKind.Function,
      detail: 'sdlSetColor r g b',
      documentation: 'Set the drawing color to RGB values',
      data: 23,
    },
    {
      label: 'sdlDrawLine',
      kind: CompletionItemKind.Function,
      detail: 'sdlDrawLine x1 y1 x2 y2',
      documentation: 'Draw a line from (x1,y1) to (x2,y2)',
      data: 24,
    },
  ];
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item) => {
  // The item already has detail and documentation, but we can enhance it here
  // For now, we'll just return the item as-is since we provided all info upfront
  return item;
});

// Hover handler
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const position = params.position;
  const offset = document.offsetAt(position);
  const text = document.getText();

  // Simple hover for keywords and function names - look for word at position
  const wordPattern = /\b\w+\b/g;
  let match;
  while (true) {
    match = wordPattern.exec(text);
    if (match === null) break;
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      const word = match[0];
      // Provide hover info for known keywords and functions
      if (word === 'make') {
        return {
          contents: {
            kind: 'markdown',
            value: '**make** identifier expression\n\nDeclare a new variable with an initial value.',
          },
        };
      } else if (word === 'assign') {
        return {
          contents: {
            kind: 'markdown',
            value: '**assign** identifier expression\n\nAssign a value to an existing variable.',
          },
        };
      } else if (word === 'if') {
        return {
          contents: {
            kind: 'markdown',
            value: '**if** condition ... **endif**\n\nExecute code conditionally based on a boolean expression.',
          },
        };
      } else if (word === 'as') {
        return {
          contents: {
            kind: 'markdown',
            value: '**as** condition ... **repeat**\n\nStart a loop that repeats while the condition is true.',
          },
        };
      } else if (word === 'print') {
        return {
          contents: {
            kind: 'markdown',
            value: '**print** expression\n\nPrint a value to the console.',
          },
        };
      } else if (word === 'func') {
        return {
          contents: {
            kind: 'markdown',
            value: '**func** name param1 param2 ... **end**\n\nDefine a new function with parameters.',
          },
        };
      } else if (word === 'call') {
        return {
          contents: {
            kind: 'markdown',
            value:
              '**call** function arg1 arg2 result\n\nCall a function with arguments and store result, or **call** function arg1 arg2 for void calls.',
          },
        };
      } else if (word === 'sin') {
        return {
          contents: {
            kind: 'markdown',
            value: '**sin** angle scale\n\nCalculate sine of an angle with a scaling factor.',
          },
        };
      } else if (word === 'cos') {
        return {
          contents: {
            kind: 'markdown',
            value: '**cos** angle scale\n\nCalculate cosine of an angle with a scaling factor.',
          },
        };
      } else if (word === 'sdlInit') {
        return {
          contents: {
            kind: 'markdown',
            value: '**sdlInit**\n\nInitialize the SDL graphics system.',
          },
        };
      }
      break;
    }
  }

  return null;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
