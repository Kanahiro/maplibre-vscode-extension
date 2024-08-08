import * as vscode from 'vscode';
const viewerHtml = require('./viewer.html');
const styleUtils = require('@maplibre/maplibre-gl-style-spec');

const createWebview = () => {
    const panel = vscode.window.createWebviewPanel(
        'maplibre-viewer',
        vscode.window.activeTextEditor?.document.fileName ?? 'MapLibre',
        vscode.ViewColumn.One,
        { enableScripts: true },
    );

    panel.webview.html = viewerHtml;
    return panel;
};

const validateStyleJson = (stylejson: string): Array<{ message: string }> => {
    let _json: any;
    try {
        _json = JSON.parse(stylejson);
    } catch {
        return [{ message: 'Invalid JSON' }];
    }

    return styleUtils.validateStyleMin(_json);
};

let debounceTimer: NodeJS.Timeout | null = null;
const updateStyle = (webview: vscode.Webview, stylejson: string) => {
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    const errors = validateStyleJson(stylejson);
    if (errors.length === 0) {
        webview.postMessage({ command: 'style', style: JSON.parse(stylejson) });
        return;
    }

    // when has errors, debounce that change
    debounceTimer = setTimeout(() => {
        webview.postMessage({
            command: 'error',
            error: errors.map((e) => e.message).join('\n'),
        });
        return;
    }, 1000);
};

export { createWebview, updateStyle };
