import * as vscode from 'vscode';
import { getStyleWatcher, LayerSpec } from '../sidebar/index.js';
import { getPaintProperties, getLayoutProperties } from '../language/schema.js';

const layerEditorHtml = require('./layerEditor.html');

let currentPanel: vscode.WebviewPanel | null = null;

interface UpdateMessage {
    type: 'update';
    property: string;
    value: unknown;
    section: 'layer' | 'paint' | 'layout';
    layerIndex: number;
}

async function updateLayerProperty(
    editor: vscode.TextEditor,
    layerIndex: number,
    section: 'layer' | 'paint' | 'layout',
    property: string,
    value: unknown
): Promise<void> {
    const document = editor.document;
    const text = document.getText();

    try {
        const json = JSON.parse(text);
        if (!json.layers || !json.layers[layerIndex]) {
            return;
        }

        const layer = json.layers[layerIndex] as LayerSpec;

        if (section === 'layer') {
            if (value === undefined || value === '') {
                delete layer[property];
            } else {
                layer[property] = value;
            }
        } else if (section === 'paint') {
            if (!layer.paint) {
                layer.paint = {};
            }
            if (value === undefined || value === '') {
                delete layer.paint[property];
            } else {
                layer.paint[property] = value;
            }
            // Clean up empty paint object
            if (Object.keys(layer.paint).length === 0) {
                delete layer.paint;
            }
        } else if (section === 'layout') {
            if (!layer.layout) {
                layer.layout = {};
            }
            if (value === undefined || value === '') {
                delete layer.layout[property];
            } else {
                layer.layout[property] = value;
            }
            // Clean up empty layout object
            if (Object.keys(layer.layout).length === 0) {
                delete layer.layout;
            }
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
        console.error('Failed to update layer property:', e);
    }
}

export function openLayerEditor(layerId: string, layerIndex: number): void {
    const watcher = getStyleWatcher();
    const style = watcher.style;
    const editor = watcher.editor;

    if (!style || !editor || !style.layers) {
        vscode.window.showWarningMessage('No style.json file is open');
        return;
    }

    const layer = style.layers.find(l => l.id === layerId);
    if (!layer) {
        vscode.window.showWarningMessage(`Layer "${layerId}" not found`);
        return;
    }

    // Get property metadata
    const paintProps = getPaintProperties(layer.type);
    const layoutProps = getLayoutProperties(layer.type);

    // Reuse existing panel or create new one
    if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
    } else {
        currentPanel = vscode.window.createWebviewPanel(
            'maplibre-layer-editor',
            `Layer: ${layerId}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        currentPanel.webview.html = layerEditorHtml;

        currentPanel.onDidDispose(() => {
            currentPanel = null;
        });

        // Handle messages from webview
        currentPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'ready') {
                sendLayerData(layer, layerIndex, paintProps, layoutProps);
            } else if (message.type === 'update') {
                const updateMsg = message as UpdateMessage;
                const currentEditor = watcher.editor;
                if (currentEditor) {
                    await updateLayerProperty(
                        currentEditor,
                        updateMsg.layerIndex,
                        updateMsg.section,
                        updateMsg.property,
                        updateMsg.value
                    );
                }
            }
        });

        // Listen for style changes to refresh the editor
        const styleChangeDisposable = watcher.onStyleChange((newStyle) => {
            if (currentPanel && newStyle && newStyle.layers) {
                const updatedLayer = newStyle.layers[layerIndex];
                if (updatedLayer && updatedLayer.id === layerId) {
                    currentPanel.webview.postMessage({
                        type: 'refresh',
                        layer: updatedLayer,
                        layerIndex,
                    });
                }
            }
        });

        currentPanel.onDidDispose(() => {
            styleChangeDisposable.dispose();
        });
    }

    // Update panel title and send layer data
    currentPanel.title = `Layer: ${layerId}`;
    sendLayerData(layer, layerIndex, paintProps, layoutProps);
}

function sendLayerData(
    layer: LayerSpec,
    layerIndex: number,
    paintProps: Record<string, unknown>,
    layoutProps: Record<string, unknown>
): void {
    if (currentPanel) {
        currentPanel.webview.postMessage({
            type: 'load',
            layer,
            layerIndex,
            paintProperties: paintProps,
            layoutProperties: layoutProps,
        });
    }
}

export function disposeLayerEditor(): void {
    if (currentPanel) {
        currentPanel.dispose();
        currentPanel = null;
    }
}
