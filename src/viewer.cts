import * as vscode from 'vscode';

const createWebview = () => {
    const panel = vscode.window.createWebviewPanel(
        'maplibre-viewer',
        vscode.window.activeTextEditor?.document.fileName ?? 'MapLibre',
        vscode.ViewColumn.One,
        { enableScripts: true },
    );

    panel.webview.html = `<!DOCTYPE html>
    <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hello World</title>
          <script src="https://unpkg.com/maplibre-gl@4.5.1/dist/maplibre-gl.js"></script>
          <link
              href="https://unpkg.com/maplibre-gl@4.5.1/dist/maplibre-gl.css"
              rel="stylesheet"
          />
          <script src="https://unpkg.com/pmtiles@^3.0.0/dist/pmtiles.js"></script>
      </head>
      <body>
        <div id="map" style="height: 100vh">
          <div id="error"></div>
        </div>
        <script>
            const protocol = new pmtiles.Protocol();
            maplibregl.addProtocol("pmtiles", protocol.tile);

            const map = new maplibregl.Map({
                container: 'map',
                style: {
                    "version": 8,
                    "sources": {},
                    "layers": []
                }
            });
            map.addControl(new maplibregl.NavigationControl());

            window.addEventListener('message', event => {
                const message = event.data;
                const errDiv = document.getElementById('error');
                switch (message.command) {
                    case 'style':
                        errDiv.innerHTML = '';
                        map.setStyle(message.style);
                        break;
                    case 'error':
                        errDiv.innerHTML = message.error;
                        map.setStyle({
                            "version": 8,
                            "sources": {},
                            "layers": []
                        });
                        break;
                }
            });
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ type: 'ready' });
            console.log('ready');
        </script>
      </body>
    </html>`;
    return panel;
};

const styleUtils = require('@maplibre/maplibre-gl-style-spec');

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
