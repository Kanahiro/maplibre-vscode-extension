import * as vscode from 'vscode';
import { createWebview, updateStyle } from './viewer.js';
import { jumpCursor, findLine } from './editor.js';
import {
    createDiagnosticsProvider,
    MapLibreHoverProvider,
    MapLibreCompletionProvider,
    MapLibreColorProvider,
} from './language/index.js';
import {
    SourcesTreeProvider,
    LayersTreeProvider,
    SettingsTreeProvider,
    LayerTreeItem,
    getStyleWatcher,
    disposeStyleWatcher,
} from './sidebar/index.js';
import { openStyleSettingsEditor } from './panels/styleSettingsEditor.js';
import {
    addSource,
    deleteSource,
    editSource,
    addLayer,
    deleteLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    editLayer,
    toggleLayerVisibility,
} from './commands/index.js';

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

    // Register sidebar tree views
    const settingsTreeProvider = new SettingsTreeProvider();
    const sourcesTreeProvider = new SourcesTreeProvider();
    const layersTreeProvider = new LayersTreeProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('maplibre-settings', settingsTreeProvider),
        vscode.window.registerTreeDataProvider('maplibre-sources', sourcesTreeProvider),
        vscode.window.registerTreeDataProvider('maplibre-layers', layersTreeProvider),
    );

    // Register sidebar commands
    context.subscriptions.push(
        vscode.commands.registerCommand('maplibre.refreshSidebar', () => {
            settingsTreeProvider.refresh();
            sourcesTreeProvider.refresh();
            layersTreeProvider.refresh();
        }),
    );

    // Settings command
    context.subscriptions.push(
        vscode.commands.registerCommand('maplibre.editSettings', openStyleSettingsEditor),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('maplibre.selectLayer', (item: LayerTreeItem) => {
            const watcher = getStyleWatcher();
            const editor = watcher.editor;
            if (editor) {
                const line = findLine(editor.document.getText(), item.layerId);
                jumpCursor(editor, line);
            }
        }),
    );

    // Source commands
    context.subscriptions.push(
        vscode.commands.registerCommand('maplibre.addSource', addSource),
        vscode.commands.registerCommand('maplibre.deleteSource', deleteSource),
        vscode.commands.registerCommand('maplibre.editSource', editSource),
    );

    // Layer commands
    context.subscriptions.push(
        vscode.commands.registerCommand('maplibre.addLayer', addLayer),
        vscode.commands.registerCommand('maplibre.deleteLayer', deleteLayer),
        vscode.commands.registerCommand('maplibre.duplicateLayer', duplicateLayer),
        vscode.commands.registerCommand('maplibre.moveLayerUp', moveLayerUp),
        vscode.commands.registerCommand('maplibre.moveLayerDown', moveLayerDown),
        vscode.commands.registerCommand('maplibre.editLayer', editLayer),
        vscode.commands.registerCommand('maplibre.toggleLayerVisibility', toggleLayerVisibility),
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

export function deactivate() {
    disposeStyleWatcher();
}
