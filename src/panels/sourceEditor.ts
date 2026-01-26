import * as vscode from 'vscode';
import { getStyleWatcher, SourceSpec } from '../sidebar/index.js';
import { getSourceProperties } from '../language/schema.js';

const sourceEditorHtml = require('./sourceEditor.html');

let currentPanel: vscode.WebviewPanel | null = null;

interface UpdateMessage {
    type: 'update';
    sourceId: string;
    property: string;
    value: unknown;
}

async function updateSourceProperty(
    editor: vscode.TextEditor,
    sourceId: string,
    property: string,
    value: unknown
): Promise<void> {
    const document = editor.document;
    const text = document.getText();

    try {
        const json = JSON.parse(text);
        if (!json.sources || !json.sources[sourceId]) {
            return;
        }

        const source = json.sources[sourceId] as SourceSpec;

        if (value === undefined || value === '') {
            delete source[property];
        } else {
            source[property] = value;
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
        console.error('Failed to update source property:', e);
    }
}

export function openSourceEditor(sourceId: string): void {
    const watcher = getStyleWatcher();
    const style = watcher.style;
    const editor = watcher.editor;

    if (!style || !editor || !style.sources) {
        vscode.window.showWarningMessage('No style.json file is open');
        return;
    }

    const source = style.sources[sourceId];
    if (!source) {
        vscode.window.showWarningMessage(`Source "${sourceId}" not found`);
        return;
    }

    // Get property metadata for this source type
    const sourceProps = getSourceProperties(source.type);

    // Reuse existing panel or create new one
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
    } else {
        currentPanel = vscode.window.createWebviewPanel(
            'maplibre-source-editor',
            `Source: ${sourceId}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        currentPanel.webview.html = sourceEditorHtml;

        currentPanel.onDidDispose(() => {
            currentPanel = null;
        });

        // Handle messages from webview
        currentPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'ready') {
                sendSourceData(source, sourceId, sourceProps);
            } else if (message.type === 'update') {
                const updateMsg = message as UpdateMessage;
                const currentEditor = watcher.editor;
                if (currentEditor) {
                    await updateSourceProperty(
                        currentEditor,
                        updateMsg.sourceId,
                        updateMsg.property,
                        updateMsg.value
                    );
                }
            }
        });

        // Listen for style changes to refresh the editor
        const styleChangeDisposable = watcher.onStyleChange((newStyle) => {
            if (currentPanel && newStyle && newStyle.sources) {
                const updatedSource = newStyle.sources[sourceId];
                if (updatedSource) {
                    currentPanel.webview.postMessage({
                        type: 'refresh',
                        source: updatedSource,
                        sourceId,
                    });
                }
            }
        });

        currentPanel.onDidDispose(() => {
            styleChangeDisposable.dispose();
        });
    }

    // Update panel title and send source data
    currentPanel.title = `Source: ${sourceId}`;
    sendSourceData(source, sourceId, sourceProps);
}

function sendSourceData(
    source: SourceSpec,
    sourceId: string,
    properties: Record<string, unknown>
): void {
    if (currentPanel) {
        currentPanel.webview.postMessage({
            type: 'load',
            source,
            sourceId,
            properties,
        });
    }
}

export function disposeSourceEditor(): void {
    if (currentPanel) {
        currentPanel.dispose();
        currentPanel = null;
    }
}
