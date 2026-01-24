import * as path from 'path';
import { workspace, ExtensionContext, window } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext): void {
  // Server is bundled inside the extension's dist/server directory
  const serverModule = context.asAbsolutePath(
    path.join('dist', 'server', 'index.js')
  );

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'constela' },
      { scheme: 'file', pattern: '**/*.constela.json' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.constela.json'),
    },
    outputChannel: window.createOutputChannel('Constela'),
  };

  client = new LanguageClient(
    'constelaLanguageServer',
    'Constela Language Server',
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
