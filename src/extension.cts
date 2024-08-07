import * as vscode from 'vscode';
import { createWebview, updateStyle } from './viewer.cjs';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        'maplibre.viewer',
        () => {
            const target = vscode.window.activeTextEditor?.document;
            const panel = createWebview();

            setTimeout(() => {
                // take interval to wait webview rendered
                updateStyle(panel.webview, target?.getText() ?? '');
            }, 500);

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
