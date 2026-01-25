/**
 * Diagnostics Provider - VSCode Problems パネルへのエラー表示
 */

import * as vscode from 'vscode';

const styleUtils = require('@maplibre/maplibre-gl-style-spec');

interface ValidationError {
    message: string;
    line?: number;
    identifier?: string;
}

/**
 * ファイルが MapLibre Style JSON かどうかを判定
 */
function isStyleDocument(document: vscode.TextDocument): boolean {
    return (
        document.languageId === 'json' &&
        document.fileName.endsWith('style.json')
    );
}

/**
 * エラーメッセージからパスを抽出
 * 例: "layers[0].filter[0]: Unknown expression" → "layers[0].filter[0]"
 */
function extractPathFromMessage(message: string): string | undefined {
    const match = message.match(/^([\w[\].-]+):/);
    return match ? match[1] : undefined;
}

type Segment = { type: 'key'; value: string } | { type: 'index'; value: number };

/**
 * パスをセグメントに分解
 * 例: "layers[0].filter[0][1]" → [{type: 'key', value: 'layers'}, {type: 'index', value: 0}, {type: 'key', value: 'filter'}, {type: 'index', value: 0}, {type: 'index', value: 1}]
 */
function parsePath(path: string): Segment[] {
    const segments: Segment[] = [];
    const regex = /([^.\[\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(path)) !== null) {
        if (match[1] !== undefined) {
            segments.push({ type: 'key', value: match[1] });
        } else if (match[2] !== undefined) {
            segments.push({ type: 'index', value: parseInt(match[2], 10) });
        }
    }

    return segments;
}

/**
 * 文字列リテラルをスキップ
 * 戻り値: 閉じ引用符の次の位置
 */
function skipString(text: string, pos: number): number {
    pos++; // 開始引用符をスキップ
    while (pos < text.length) {
        if (text[pos] === '\\') {
            pos += 2;
        } else if (text[pos] === '"') {
            return pos + 1;
        } else {
            pos++;
        }
    }
    return pos;
}

/**
 * JSON値をスキップ（オブジェクト、配列、文字列、プリミティブ）
 * 戻り値: 値の終わりの次の位置
 */
function skipValue(text: string, pos: number): number {
    // 空白をスキップ
    while (pos < text.length && /\s/.test(text[pos])) {
        pos++;
    }

    if (pos >= text.length) return pos;

    const ch = text[pos];

    if (ch === '"') {
        return skipString(text, pos);
    }

    if (ch === '{' || ch === '[') {
        const openChar = ch;
        const closeChar = ch === '{' ? '}' : ']';
        let depth = 1;
        pos++;
        while (pos < text.length && depth > 0) {
            const c = text[pos];
            if (c === '"') {
                pos = skipString(text, pos);
            } else if (c === openChar || c === (openChar === '{' ? '[' : '{')) {
                if (c === '{' || c === '[') depth++;
                pos++;
            } else if (c === closeChar || c === (closeChar === '}' ? ']' : '}')) {
                if (c === '}' || c === ']') depth--;
                pos++;
            } else {
                pos++;
            }
        }
        return pos;
    }

    // プリミティブ値（数値、true, false, null）
    while (pos < text.length && !/[\s,\]\}]/.test(text[pos])) {
        pos++;
    }
    return pos;
}

/**
 * 指定位置から配列のn番目の要素の開始位置を探す
 */
function findArrayElement(
    text: string,
    startPos: number,
    targetIndex: number,
): number {
    let pos = startPos;

    // 空白をスキップして '[' を探す
    while (pos < text.length && text[pos] !== '[') {
        if (text[pos] === '"') {
            pos = skipString(text, pos);
        } else {
            pos++;
        }
    }

    if (pos >= text.length) return -1;

    pos++; // '[' をスキップ

    let elementCount = 0;

    while (pos < text.length) {
        // 空白をスキップ
        while (pos < text.length && /\s/.test(text[pos])) {
            pos++;
        }

        if (pos >= text.length) return -1;

        const ch = text[pos];

        if (ch === ']') {
            return -1; // 配列終了、要素が見つからなかった
        }

        if (ch === ',') {
            pos++;
            continue;
        }

        // 要素の開始位置
        if (elementCount === targetIndex) {
            return pos;
        }

        // 要素をスキップ
        pos = skipValue(text, pos);
        elementCount++;
    }

    return -1;
}

/**
 * 指定位置からキーの値の開始位置を探す
 */
function findKeyValue(text: string, startPos: number, key: string): number {
    const keyPattern = `"${key}"`;
    let pos = startPos;

    while (pos < text.length) {
        // 空白をスキップ
        while (pos < text.length && /\s/.test(text[pos])) {
            pos++;
        }

        if (pos >= text.length) return -1;

        const ch = text[pos];

        if (ch === '"') {
            // キーパターンと一致するかチェック
            if (text.substring(pos, pos + keyPattern.length) === keyPattern) {
                let checkPos = pos + keyPattern.length;
                // 空白をスキップ
                while (checkPos < text.length && /\s/.test(text[checkPos])) {
                    checkPos++;
                }
                if (text[checkPos] === ':') {
                    // ':' の次の位置（値の開始位置）を返す
                    return checkPos + 1;
                }
            }
            // 一致しない文字列をスキップ
            pos = skipString(text, pos);
        } else {
            pos++;
        }
    }

    return -1;
}

/**
 * パスから行番号を推測
 * パス例: "layers[0].paint.fill-color", "layers[0].filter[0][1]"
 */
function findLineFromPath(text: string, path: string): number {
    const segments = parsePath(path);

    if (segments.length === 0) {
        return 0;
    }

    let pos = 0;

    for (const segment of segments) {
        if (segment.type === 'key') {
            const valuePos = findKeyValue(text, pos, segment.value);
            if (valuePos === -1) {
                break;
            }
            pos = valuePos;
        } else if (segment.type === 'index') {
            const elemPos = findArrayElement(text, pos, segment.value);
            if (elemPos === -1) {
                break;
            }
            pos = elemPos;
        }
    }

    // 空白をスキップして実際の値の位置を取得
    while (pos < text.length && /\s/.test(text[pos])) {
        pos++;
    }

    // 位置から行番号を計算
    const beforePos = text.substring(0, pos);
    return beforePos.split('\n').length - 1;
}

/**
 * JSON構文エラーから行番号を抽出
 */
function getJsonErrorLine(error: SyntaxError, text: string): number {
    // エラーメッセージから位置を抽出
    const posMatch = error.message.match(/position\s+(\d+)/i);
    if (posMatch) {
        const position = parseInt(posMatch[1], 10);
        const beforeError = text.substring(0, position);
        return beforeError.split('\n').length - 1;
    }

    // "at line X" パターン
    const lineMatch = error.message.match(/line\s+(\d+)/i);
    if (lineMatch) {
        return parseInt(lineMatch[1], 10) - 1;
    }

    return 0;
}

/**
 * ドキュメントのバリデーションを実行して診断情報を更新
 */
function updateDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection,
): void {
    if (!isStyleDocument(document)) {
        collection.delete(document.uri);
        return;
    }

    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    // JSON パースエラーのチェック
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        const error = e as SyntaxError;
        const line = getJsonErrorLine(error, text);
        const lineText = document.lineAt(Math.min(line, document.lineCount - 1));

        diagnostics.push(
            new vscode.Diagnostic(
                lineText.range,
                `JSON Syntax Error: ${error.message}`,
                vscode.DiagnosticSeverity.Error,
            ),
        );

        collection.set(document.uri, diagnostics);
        return;
    }

    // MapLibre Style バリデーション
    const errors: ValidationError[] = styleUtils.validateStyleMin(parsed);

    for (const error of errors) {
        // 行番号の決定: メッセージからパスを抽出して行を特定
        let line = 0;
        const path = extractPathFromMessage(error.message);
        if (path) {
            line = findLineFromPath(text, path);
        }

        // 行が範囲外の場合は最初の行に
        line = Math.min(line, document.lineCount - 1);
        const lineText = document.lineAt(line);

        const diagnostic = new vscode.Diagnostic(
            lineText.range,
            error.message,
            vscode.DiagnosticSeverity.Error,
        );

        // パスをコードとして設定
        if (path) {
            diagnostic.code = path;
        }

        diagnostic.source = 'MapLibre';
        diagnostics.push(diagnostic);
    }

    collection.set(document.uri, diagnostics);
}

/**
 * デバウンス用のタイマーマップ
 */
const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * デバウンス付きで診断情報を更新
 */
function debouncedUpdateDiagnostics(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection,
    delay: number = 500,
): void {
    const uri = document.uri.toString();

    // 既存のタイマーをクリア
    const existingTimer = debounceTimers.get(uri);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // 新しいタイマーを設定
    const timer = setTimeout(() => {
        updateDiagnostics(document, collection);
        debounceTimers.delete(uri);
    }, delay);

    debounceTimers.set(uri, timer);
}

/**
 * Diagnostics Provider を作成・登録
 */
export function createDiagnosticsProvider(
    context: vscode.ExtensionContext,
): vscode.DiagnosticCollection {
    const collection =
        vscode.languages.createDiagnosticCollection('maplibre-style');

    // 現在アクティブなエディタを診断
    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, collection);
    }

    // 既に開いているドキュメントを診断
    for (const document of vscode.workspace.textDocuments) {
        if (isStyleDocument(document)) {
            updateDiagnostics(document, collection);
        }
    }

    // アクティブなエディタが変わったとき
    const activeEditorSubscription = vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            if (editor && isStyleDocument(editor.document)) {
                updateDiagnostics(editor.document, collection);
            }
        },
    );

    // ドキュメントが開かれたとき
    const openSubscription = vscode.workspace.onDidOpenTextDocument(
        (document) => {
            if (isStyleDocument(document)) {
                updateDiagnostics(document, collection);
            }
        },
    );

    // ドキュメントが変更されたとき（デバウンス付き）
    const changeSubscription = vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (isStyleDocument(event.document)) {
                debouncedUpdateDiagnostics(event.document, collection);
            }
        },
    );

    // ドキュメントが閉じられたとき
    const closeSubscription = vscode.workspace.onDidCloseTextDocument(
        (document) => {
            collection.delete(document.uri);
            // タイマーもクリア
            const uri = document.uri.toString();
            const timer = debounceTimers.get(uri);
            if (timer) {
                clearTimeout(timer);
                debounceTimers.delete(uri);
            }
        },
    );

    context.subscriptions.push(
        collection,
        activeEditorSubscription,
        openSubscription,
        changeSubscription,
        closeSubscription,
    );

    return collection;
}
