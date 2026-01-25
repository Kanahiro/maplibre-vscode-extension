import * as vscode from 'vscode';
import { createWebview, updateStyle } from './viewer.js';
import { jumpCursor, findLine } from './editor.js';
import {
    createDiagnosticsProvider,
    MapLibreHoverProvider,
    MapLibreCompletionProvider,
    MapLibreColorProvider,
} from './language/index.js';

// Document selector for MapLibre style files
const DOCUMENT_SELECTOR: vscode.DocumentSelector = {
    language: 'json',
    pattern: '**/*style.json',
};

export function activate(context: vscode.ExtensionContext) {
    // Register language features
    createDiagnosticsProvider(context);

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            DOCUMENT_SELECTOR,
            new MapLibreHoverProvider(),
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            DOCUMENT_SELECTOR,
            new MapLibreCompletionProvider(),
            '"', // Trigger on quote
            ':', // Trigger after colon
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerColorProvider(
            DOCUMENT_SELECTOR,
            new MapLibreColorProvider(),
        ),
    );
    const disposable = vscode.commands.registerCommand(
        'maplibre.launch_viewer',
        () => {
            const styleEditor = vscode.window.activeTextEditor!;
            const panel = createWebview();

            panel.webview.onDidReceiveMessage((message) => {
                switch (message.type) {
                    case 'ready':
                        updateStyle(
                            panel.webview,
                            styleEditor.document?.getText() ?? '',
                        );
                        break;
                    case 'layer-select':
                        const line = findLine(
                            styleEditor.document?.getText() ?? '',
                            message.layerId,
                        );
                        jumpCursor(styleEditor, line);
                        break;
                }
            });

            panel.onDidChangeViewState(() => {
                updateStyle(
                    panel.webview,
                    styleEditor.document?.getText() ?? '',
                );
            });

            const changeDocumentSubscription =
                vscode.workspace.onDidChangeTextDocument((e) => {
                    if (
                        e.document.uri.toString() ===
                        styleEditor.document?.uri.toString()
                    ) {
                        updateStyle(
                            panel.webview,
                            styleEditor.document?.getText() ?? '',
                        );
                    }
                });

            panel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
            });
        },
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
