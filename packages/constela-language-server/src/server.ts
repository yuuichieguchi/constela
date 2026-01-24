import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  type Connection,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateDocument } from './diagnostics.js';
import { provideCompletion } from './completion.js';
import { provideHover } from './hover.js';
import { provideDefinition } from './definition.js';

export interface ConstelaLanguageServer {
  connection: Connection;
  documents: TextDocuments<TextDocument>;
}

export function createServer(): ConstelaLanguageServer {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);

  connection.onInitialize((_params: InitializeParams): InitializeResult => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['"', ':', '{', ','],
        },
        hoverProvider: true,
        definitionProvider: true,
      },
    };
  });

  documents.onDidChangeContent((change) => {
    validateDocument(connection, change.document);
  });

  connection.onCompletion((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    return provideCompletion(document, params.position);
  });

  connection.onHover((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;
    return provideHover(document, params.position);
  });

  connection.onDefinition((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;
    return provideDefinition(document, params.position);
  });

  documents.listen(connection);

  return { connection, documents };
}

export function startServer(): void {
  const server = createServer();
  server.connection.listen();
}
