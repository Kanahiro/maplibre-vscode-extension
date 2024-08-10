import * as vscode from 'vscode';

function jumpCursor(editor: vscode.TextEditor, line: number) {
    const _editor = getStyleEditor(editor.document.uri.toString())!;

    if (line < 0 || _editor.document.lineCount < line) {
        return;
    }

    const lineLength = _editor.document.lineAt(line).text.length;

    const anchor = new vscode.Position(line, 0);
    const active = new vscode.Position(line, lineLength);

    // jump
    _editor.selection = new vscode.Selection(anchor, active);
    _editor.revealRange(
        new vscode.Range(line, 0, line, 0),
        vscode.TextEditorRevealType.AtTop,
    );
}

/**
 * get instance of vscode.TextEditor
 * vscode.window.activeTextEditor does not provide newest instance
 */
function getStyleEditor(uri: string): vscode.TextEditor | undefined {
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() === uri) {
            return editor;
        }
    }
    return undefined;
}

function findLine(text: string, layerId: string) {
    // find "id": "word" pattern
    const pattern = new RegExp(`"id":\\s*"${layerId}"`);
    const match = text.match(pattern);
    if (match) {
        // line = the length of text.substring from start to matched word.
        const line = text.substring(0, match.index).split('\n').length - 1;
        return line;
    }
    return -1;
}

export { jumpCursor, findLine };
