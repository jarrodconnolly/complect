const { LanguageClient } = require('vscode-languageclient');
const { TransportKind } = require('vscode-languageclient/node');
const { workspace } = require('vscode');

let client;

function activate(context) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath('server.js');

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  // Options to control the language client
  const clientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'complect' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient('complectLanguageServer', 'Complect Language Server', serverOptions, clientOptions);

  // Start the client. This will also launch the server
  client.start();
}

function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

module.exports = {
  activate,
  deactivate,
};
