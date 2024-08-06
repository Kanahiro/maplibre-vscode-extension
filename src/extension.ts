// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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

const updateWebview = (webview: vscode.Webview, stylejson: string) => {
    const errors = validateStyleJson(stylejson);

    if (errors.length > 0) {
        webview.html = errors.map((e: any) => e.message).join('<br>');
        return;
    }

    webview.html = `<!DOCTYPE html>
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
			</head>
			<body>
					<div id="map" style="height: 100vh"></div>
					<script>
							const map = new maplibregl.Map({
									container: 'map',
									style: ${stylejson}
							});

					</script>
			</body>
		</html>`;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "maplibre" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    const disposable = vscode.commands.registerCommand(
        'maplibre.viewer',
        () => {
            // The code you place here will be executed every time your command is executed
            // Display a message box to the user
            const panel = vscode.window.createWebviewPanel(
                'maplibre-viewer',
                vscode.window.activeTextEditor?.document.fileName ?? 'MapLibre',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                },
            );

            const uri = vscode.window.activeTextEditor?.document.uri.toString();

            const changeDocumentSubscription =
                vscode.workspace.onDidChangeTextDocument((e) => {
                    if (e.document.uri.toString() === uri) {
                        updateWebview(panel.webview, e.document.getText());
                    }
                });
            panel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
            });

            const _json = vscode.window.activeTextEditor?.document.getText()!;
            updateWebview(panel.webview, _json);
        },
    );

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
