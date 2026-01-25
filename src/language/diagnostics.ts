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

/**
 * パスから行番号を推測
 * パス例: "layers[0].paint.fill-color", "layers[0].filter[0]"
 */
function findLineFromPath(text: string, path: string): number {
    const lines = text.split('\n');

    // パスをパース: "layers[0].filter[0]" → [{type: 'key', value: 'layers'}, {type: 'index', value: 0}, ...]
    const segments: Array<{ type: 'key' | 'index'; value: string | number }> =
        [];
    const parts = path.split('.');
    for (const part of parts) {
        const indexMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (indexMatch) {
            segments.push({ type: 'key', value: indexMatch[1] });
            segments.push({ type: 'index', value: parseInt(indexMatch[2], 10) });
        } else if (part.match(/^\[\d+\]$/)) {
            segments.push({
                type: 'index',
                value: parseInt(part.slice(1, -1), 10),
            });
        } else {
            segments.push({ type: 'key', value: part });
        }
    }

    if (segments.length === 0) {
        return 0;
    }

    // 各セグメントを順番に探す
    let currentLine = 0;

    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx];

        if (segment.type === 'key') {
            // キーを探す
            const keyPattern = new RegExp(`"${segment.value}"\\s*:`);
            for (let i = currentLine; i < lines.length; i++) {
                if (keyPattern.test(lines[i])) {
                    currentLine = i;
                    break;
                }
            }
        } else if (segment.type === 'index') {
            // 配列のn番目の要素を探す
            const targetIndex = segment.value as number;
            let arrayItemCount = 0;
            let bracketDepth = 0;
            let braceDepth = 0;
            let foundArrayStart = false;

            for (let i = currentLine; i < lines.length; i++) {
                const line = lines[i];

                for (let ci = 0; ci < line.length; ci++) {
                    const ch = line[ci];

                    if (ch === '[') {
                        if (!foundArrayStart) {
                            foundArrayStart = true;
                            bracketDepth = 1;
                            braceDepth = 0;
                        } else {
                            // 配列直下の配列要素
                            if (bracketDepth === 1 && braceDepth === 0) {
                                if (arrayItemCount === targetIndex) {
                                    currentLine = i;
                                    return findLineFromPath_continue(
                                        lines,
                                        segments,
                                        segIdx + 1,
                                        currentLine,
                                    );
                                }
                                arrayItemCount++;
                            }
                            bracketDepth++;
                        }
                    } else if (ch === ']' && foundArrayStart) {
                        bracketDepth--;
                        if (bracketDepth === 0) {
                            // 配列終了
                            foundArrayStart = false;
                        }
                    } else if (ch === '{' && foundArrayStart) {
                        if (bracketDepth === 1 && braceDepth === 0) {
                            // 配列直下のオブジェクト開始
                            if (arrayItemCount === targetIndex) {
                                currentLine = i;
                                // 残りのセグメントを処理
                                return findLineFromPath_continue(
                                    lines,
                                    segments,
                                    segIdx + 1,
                                    currentLine,
                                );
                            }
                            arrayItemCount++;
                        }
                        braceDepth++;
                    } else if (ch === '}' && foundArrayStart) {
                        braceDepth--;
                    } else if (ch === '"' && foundArrayStart && bracketDepth === 1 && braceDepth === 0) {
                        // 配列直下の文字列要素
                        if (arrayItemCount === targetIndex) {
                            currentLine = i;
                            return findLineFromPath_continue(
                                lines,
                                segments,
                                segIdx + 1,
                                currentLine,
                            );
                        }
                        arrayItemCount++;
                        // 文字列の終端までスキップ
                        ci++;
                        while (ci < line.length && !(line[ci] === '"' && line[ci - 1] !== '\\')) {
                            ci++;
                        }
                    }
                }
            }
        }
    }

    return currentLine;
}

/**
 * findLineFromPath の続き（インデックス見つけた後の処理）
 */
function findLineFromPath_continue(
    lines: string[],
    segments: Array<{ type: 'key' | 'index'; value: string | number }>,
    segIdx: number,
    currentLine: number,
): number {
    for (let s = segIdx; s < segments.length; s++) {
        const segment = segments[s];

        if (segment.type === 'key') {
            const keyPattern = new RegExp(`"${segment.value}"\\s*:`);
            for (let i = currentLine; i < lines.length; i++) {
                if (keyPattern.test(lines[i])) {
                    currentLine = i;
                    break;
                }
            }
        }
    }

    return currentLine;
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
