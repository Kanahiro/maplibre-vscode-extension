import * as vscode from 'vscode';
import { getStyleWatcher, StyleJson } from '../sidebar/index.js';

const styleSettingsEditorHtml = require('./styleSettingsEditor.html');

let currentPanel: vscode.WebviewPanel | null = null;
let isUpdatingFromPanel = false;

interface UpdateMessage {
    type: 'update';
    property: string;
    value: unknown;
}

async function updateStyleProperty(
    editor: vscode.TextEditor,
    property: string,
    value: unknown
): Promise<void> {
    const document = editor.document;
    const text = document.getText();

    try {
        const json = JSON.parse(text);

        if (value === undefined) {
            delete json[property];
        } else {
            json[property] = value;
        }

        const newText = JSON.stringify(json, null, '\t');
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        edit.replace(document.uri, fullRange, newText);
        await vscode.workspace.applyEdit(edit);
    } catch (e) {
        console.error('Failed to update style property:', e);
    }
}

export function openStyleSettingsEditor(): void {
    const watcher = getStyleWatcher();
    const style = watcher.style;
    const editor = watcher.editor;

    if (!style || !editor) {
        vscode.window.showWarningMessage('No style.json file is open');
        return;
    }

    // Reuse existing panel or create new one
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
        sendStyleData(style);
    } else {
        currentPanel = vscode.window.createWebviewPanel(
            'maplibre-style-settings',
            'Style Settings',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        currentPanel.webview.html = styleSettingsEditorHtml;

        currentPanel.onDidDispose(() => {
            currentPanel = null;
        });

        // Handle messages from webview
        currentPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'ready') {
                const currentStyle = watcher.style;
                if (currentStyle) {
                    sendStyleData(currentStyle);
                }
            } else if (message.type === 'update') {
                const updateMsg = message as UpdateMessage;
                const currentEditor = watcher.editor;
                if (currentEditor) {
                    isUpdatingFromPanel = true;
                    await updateStyleProperty(
                        currentEditor,
                        updateMsg.property,
                        updateMsg.value
                    );
                    setTimeout(() => {
                        isUpdatingFromPanel = false;
                    }, 500);
                }
            }
        });

        // Listen for style changes to refresh the editor
        const styleChangeDisposable = watcher.onStyleChange((newStyle) => {
            if (isUpdatingFromPanel) {
                return;
            }
            if (currentPanel && newStyle) {
                currentPanel.webview.postMessage({
                    type: 'refresh',
                    style: newStyle,
                });
            }
        });

        currentPanel.onDidDispose(() => {
            styleChangeDisposable.dispose();
        });
    }
}

function sendStyleData(style: StyleJson): void {
    if (currentPanel) {
        currentPanel.webview.postMessage({
            type: 'load',
            style,
        });
    }
}

export function disposeStyleSettingsEditor(): void {
    if (currentPanel) {
        currentPanel.dispose();
        currentPanel = null;
    }
}
