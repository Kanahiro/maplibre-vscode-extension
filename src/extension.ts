import * as vscode from 'vscode';
import { createWebview, updateStyle } from './viewer.js';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        'maplibre.launch_editor',
        () => {
            const target = vscode.window.activeTextEditor?.document;
            const panel = createWebview();

            panel.webview.onDidReceiveMessage((message) => {
                if (message.type === 'ready') {
                    updateStyle(panel.webview, target?.getText() ?? '');
                }
            });

            panel.onDidChangeViewState(() => {
                updateStyle(panel.webview, target?.getText() ?? '');
            });

            const changeDocumentSubscription =
                vscode.workspace.onDidChangeTextDocument((e) => {
                    if (e.document.uri.toString() === target?.uri.toString()) {
                        updateStyle(panel.webview, target?.getText() ?? '');
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
