/**
 * Context Parser - JSON内のカーソル位置からコンテキストを判定
 */

import * as vscode from 'vscode';

export interface JsonContext {
    type:
        | 'root'
        | 'layer'
        | 'paint'
        | 'layout'
        | 'source'
        | 'filter'
        | 'expression'
        | 'unknown';
    layerType?: string;
    sourceType?: string;
    propertyName?: string;
    inArray?: boolean;
    inPropertyValue?: boolean;
    path: string[];
}

interface JsonPathResult {
    path: string[];
    inPropertyValue: boolean;
    inArray: boolean;
}

/**
 * カーソル位置までのJSONパスを解析
 */
function parseJsonPath(text: string, offset: number): JsonPathResult {
    const path: string[] = [];
    let inString = false;
    let stringChar = '';
    let currentKey = '';
    let depth = 0;
    let arrayDepth = 0;
    let inPropertyValue = false;
    let afterColon = false;

    for (let i = 0; i < offset; i++) {
        const char = text[i];
        const prevChar = i > 0 ? text[i - 1] : '';

        // Handle string literals
        if ((char === '"' || char === "'") && prevChar !== '\\') {
            if (!inString) {
                inString = true;
                stringChar = char;
                currentKey = '';
            } else if (char === stringChar) {
                inString = false;
                if (!afterColon && depth > 0) {
                    // This was a property key
                    // currentKey is set
                }
            }
            continue;
        }

        if (inString) {
            currentKey += char;
            continue;
        }

        // Handle structural characters
        switch (char) {
            case '{':
                depth++;
                if (afterColon && currentKey) {
                    path.push(currentKey);
                }
                currentKey = '';
                afterColon = false;
                inPropertyValue = false;
                break;
            case '}':
                depth--;
                if (path.length > 0) {
                    path.pop();
                }
                currentKey = '';
                afterColon = false;
                inPropertyValue = false;
                break;
            case '[':
                arrayDepth++;
                if (afterColon && currentKey) {
                    path.push(currentKey);
                }
                afterColon = false;
                break;
            case ']':
                arrayDepth--;
                if (path.length > 0 && path[path.length - 1] === currentKey) {
                    // Don't pop if we're still in the same context
                }
                break;
            case ':':
                afterColon = true;
                inPropertyValue = true;
                break;
            case ',':
                currentKey = '';
                afterColon = false;
                inPropertyValue = false;
                break;
        }
    }

    return {
        path,
        inPropertyValue,
        inArray: arrayDepth > 0,
    };
}

/**
 * テキストからレイヤータイプを検出
 */
function findLayerType(text: string, offset: number): string | undefined {
    // カーソル位置より前のテキストで最も近い "type": "xxx" を探す
    const beforeCursor = text.substring(0, offset);

    // layers配列内にいるか確認
    const layersMatch = beforeCursor.lastIndexOf('"layers"');
    if (layersMatch === -1) {return undefined;}

    // 現在のレイヤーブロックを特定するため、最後の { の位置を探す
    let braceCount = 0;
    let layerStart = -1;

    for (let i = offset - 1; i >= layersMatch; i--) {
        const char = text[i];
        if (char === '}') {braceCount++;}
        if (char === '{') {
            braceCount--;
            if (braceCount < 0) {
                layerStart = i;
                break;
            }
        }
    }

    if (layerStart === -1) {return undefined;}

    // レイヤーブロック内で "type": "xxx" を探す
    const layerText = text.substring(layerStart, offset);
    const typeMatch = layerText.match(/"type"\s*:\s*"([^"]+)"/);
    return typeMatch ? typeMatch[1] : undefined;
}

/**
 * テキストからソースタイプを検出
 */
function findSourceType(text: string, offset: number): string | undefined {
    const beforeCursor = text.substring(0, offset);

    // sources オブジェクト内にいるか確認
    const sourcesMatch = beforeCursor.lastIndexOf('"sources"');
    if (sourcesMatch === -1) {return undefined;}

    // 現在のソースブロック内で "type": "xxx" を探す
    let braceCount = 0;
    let sourceStart = -1;

    for (let i = offset - 1; i >= sourcesMatch; i--) {
        const char = text[i];
        if (char === '}') {braceCount++;}
        if (char === '{') {
            braceCount--;
            if (braceCount < 0) {
                sourceStart = i;
                break;
            }
        }
    }

    if (sourceStart === -1) {return undefined;}

    const sourceText = text.substring(sourceStart, offset);
    const typeMatch = sourceText.match(/"type"\s*:\s*"([^"]+)"/);
    return typeMatch ? typeMatch[1] : undefined;
}

/**
 * 式(expression)のコンテキスト内にいるかチェック
 */
function isInExpression(text: string, offset: number): boolean {
    // 配列の開始 [ の後に文字列が来るパターンを検出
    const beforeCursor = text.substring(0, offset);

    // 最も近い [ を探す
    let bracketCount = 0;
    for (let i = offset - 1; i >= 0; i--) {
        const char = text[i];
        if (char === ']') {bracketCount++;}
        if (char === '[') {
            bracketCount--;
            if (bracketCount < 0) {
                // この [ の後の内容をチェック
                const afterBracket = text.substring(i + 1, offset).trim();
                // 式は ["operator", ...] の形式
                if (afterBracket.match(/^"[a-z!<>=+\-*/%^]/) || afterBracket === '' || afterBracket === '"') {
                    return true;
                }
                break;
            }
        }
    }
    return false;
}

/**
 * 現在のプロパティ名を取得
 */
function getCurrentPropertyName(
    text: string,
    offset: number,
): string | undefined {
    const beforeCursor = text.substring(0, offset);

    // 最後の "key": パターンを探す
    const match = beforeCursor.match(/"([^"]+)"\s*:\s*[^,}]*$/);
    return match ? match[1] : undefined;
}

/**
 * ドキュメントとカーソル位置からコンテキストを判定
 */
export function getJsonContext(
    document: vscode.TextDocument,
    position: vscode.Position,
): JsonContext {
    const text = document.getText();
    const offset = document.offsetAt(position);

    const { path, inPropertyValue, inArray } = parseJsonPath(text, offset);
    const propertyName = getCurrentPropertyName(text, offset);

    // 式の中にいるかチェック
    if (isInExpression(text, offset)) {
        return {
            type: 'expression',
            layerType: findLayerType(text, offset),
            propertyName,
            inArray: true,
            inPropertyValue,
            path,
        };
    }

    // パスに基づいてコンテキストを判定
    if (path.includes('filter')) {
        return {
            type: 'filter',
            layerType: findLayerType(text, offset),
            propertyName,
            inArray,
            inPropertyValue,
            path,
        };
    }

    if (path.includes('paint')) {
        return {
            type: 'paint',
            layerType: findLayerType(text, offset),
            propertyName,
            inArray,
            inPropertyValue,
            path,
        };
    }

    if (path.includes('layout')) {
        return {
            type: 'layout',
            layerType: findLayerType(text, offset),
            propertyName,
            inArray,
            inPropertyValue,
            path,
        };
    }

    if (path.includes('layers')) {
        return {
            type: 'layer',
            layerType: findLayerType(text, offset),
            propertyName,
            inArray,
            inPropertyValue,
            path,
        };
    }

    if (path.includes('sources')) {
        return {
            type: 'source',
            sourceType: findSourceType(text, offset),
            propertyName,
            inArray,
            inPropertyValue,
            path,
        };
    }

    // ルートレベル
    if (path.length === 0 || (path.length === 1 && !path[0])) {
        return {
            type: 'root',
            propertyName,
            inArray,
            inPropertyValue,
            path,
        };
    }

    return {
        type: 'unknown',
        propertyName,
        inArray,
        inPropertyValue,
        path,
    };
}

/**
 * 指定位置の単語（プロパティ名）を取得
 */
export function getWordAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
): { word: string; range: vscode.Range } | undefined {
    // JSON プロパティ名のパターン（クォート付き）
    const wordRange = document.getWordRangeAtPosition(position, /"[^"]+"/);
    if (wordRange) {
        const word = document.getText(wordRange).replace(/"/g, '');
        return { word, range: wordRange };
    }

    // クォートなしの単語
    const simpleRange = document.getWordRangeAtPosition(position, /[\w-]+/);
    if (simpleRange) {
        return { word: document.getText(simpleRange), range: simpleRange };
    }

    return undefined;
}
