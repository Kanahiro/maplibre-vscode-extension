/**
 * Completion Provider - コンテキストに応じたプロパティ補完
 */

import * as vscode from 'vscode';
import { getJsonContext } from './context.js';
import {
    getRootProperties,
    getLayerProperties,
    getPaintProperties,
    getLayoutProperties,
    getSourceProperties,
    PropertyMetadata,
    LAYER_TYPES,
    SOURCE_TYPES,
} from './schema.js';
import {
    EXPRESSION_OPERATORS,
    INTERPOLATION_TYPES,
    getExpressionOperators,
} from './expression.js';

/**
 * プロパティメタデータから補完アイテムを作成
 */
function createCompletionItem(
    name: string,
    metadata: PropertyMetadata,
    includeColon: boolean = true,
): vscode.CompletionItem {
    const item = new vscode.CompletionItem(
        name,
        vscode.CompletionItemKind.Property,
    );

    // 説明
    if (metadata.doc) {
        item.documentation = new vscode.MarkdownString(metadata.doc);
    }

    // 詳細（型とデフォルト値）
    let detail = metadata.type || 'unknown';
    if (metadata.default !== undefined) {
        detail += ` (default: ${JSON.stringify(metadata.default)})`;
    }
    if (metadata.required) {
        detail += ' *required*';
    }
    item.detail = detail;

    // スニペット挿入
    if (includeColon) {
        item.insertText = createInsertSnippet(name, metadata);
    } else {
        item.insertText = new vscode.SnippetString(name);
    }

    return item;
}

/**
 * プロパティの型に応じたスニペットを作成
 */
function createInsertSnippet(
    name: string,
    metadata: PropertyMetadata,
): vscode.SnippetString {
    let value: string;

    switch (metadata.type) {
        case 'color':
            value = '"${1:#000000}"';
            break;
        case 'number':
            if (metadata.default !== undefined) {
                value = `\${1:${metadata.default}}`;
            } else if (metadata.minimum !== undefined) {
                value = `\${1:${metadata.minimum}}`;
            } else {
                value = '${1:0}';
            }
            break;
        case 'boolean':
            value = '${1|true,false|}';
            break;
        case 'enum':
            if (
                metadata.values &&
                typeof metadata.values === 'object'
            ) {
                const options = Object.keys(metadata.values).join(',');
                value = `"\${1|${options}|}"`;
            } else {
                value = '"${1}"';
            }
            break;
        case 'string':
            value = '"${1}"';
            break;
        case 'array':
            if (metadata.value === 'number') {
                value = '[${1:0}, ${2:0}]';
            } else {
                value = '[$0]';
            }
            break;
        case 'object':
            value = '{\n\t$0\n}';
            break;
        default:
            if (metadata.default !== undefined) {
                value =
                    typeof metadata.default === 'string'
                        ? `"\${1:${metadata.default}}"`
                        : `\${1:${JSON.stringify(metadata.default)}}`;
            } else {
                value = '$0';
            }
    }

    return new vscode.SnippetString(`"${name}": ${value}`);
}

/**
 * 式の演算子の補完アイテムを作成
 */
function createExpressionCompletionItem(
    operator: string,
): vscode.CompletionItem {
    const info = EXPRESSION_OPERATORS[operator];
    const item = new vscode.CompletionItem(
        operator,
        vscode.CompletionItemKind.Function,
    );

    if (info) {
        item.documentation = new vscode.MarkdownString(
            `${info.doc}\n\n**Arguments:** \`${info.args.join(', ')}\`\n\n**Returns:** \`${info.returns}\``,
        );
        item.detail = `(${info.args.join(', ')}) → ${info.returns}`;
    }

    // 式の基本形式を挿入
    item.insertText = new vscode.SnippetString(`"${operator}"$0`);

    return item;
}

/**
 * レイヤータイプの補完アイテムを作成
 */
function createLayerTypeCompletionItems(): vscode.CompletionItem[] {
    return LAYER_TYPES.map((type) => {
        const item = new vscode.CompletionItem(
            type,
            vscode.CompletionItemKind.EnumMember,
        );
        item.detail = 'Layer type';
        item.insertText = new vscode.SnippetString(`"${type}"`);
        return item;
    });
}

/**
 * ソースタイプの補完アイテムを作成
 */
function createSourceTypeCompletionItems(): vscode.CompletionItem[] {
    return Object.keys(SOURCE_TYPES).map((type) => {
        const item = new vscode.CompletionItem(
            type,
            vscode.CompletionItemKind.EnumMember,
        );
        item.detail = 'Source type';
        item.insertText = new vscode.SnippetString(`"${type}"`);
        return item;
    });
}

/**
 * プロパティマップから補完アイテムリストを作成
 */
function createCompletionItems(
    properties: Record<string, PropertyMetadata>,
    includeColon: boolean = true,
): vscode.CompletionItem[] {
    return Object.entries(properties).map(([name, metadata]) =>
        createCompletionItem(name, metadata, includeColon),
    );
}

/**
 * Completion Provider クラス
 */
export class MapLibreCompletionProvider
    implements vscode.CompletionItemProvider
{
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.CompletionItem[] | undefined {
        // 対象ファイルかチェック
        if (!document.fileName.endsWith('style.json')) {
            return undefined;
        }

        const context = getJsonContext(document, position);
        const items: vscode.CompletionItem[] = [];

        // 値の位置かプロパティキーの位置かを判定
        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.substring(0, position.character);

        // "type": の後なら型の値を補完
        if (beforeCursor.match(/"type"\s*:\s*"?$/)) {
            if (context.type === 'layer' || context.path.includes('layers')) {
                return createLayerTypeCompletionItems();
            }
            if (context.type === 'source' || context.path.includes('sources')) {
                return createSourceTypeCompletionItems();
            }
        }

        // 式のコンテキスト
        if (context.type === 'expression' || context.inArray) {
            // 配列の最初の要素として演算子を補完
            if (beforeCursor.match(/\[\s*"?$/) || beforeCursor.match(/,\s*"?$/)) {
                const operators = getExpressionOperators();
                items.push(
                    ...operators.map((op) => createExpressionCompletionItem(op)),
                );

                // 補間タイプも追加
                for (const interp of INTERPOLATION_TYPES) {
                    const item = new vscode.CompletionItem(
                        interp.label,
                        vscode.CompletionItemKind.Keyword,
                    );
                    item.documentation = new vscode.MarkdownString(interp.doc);
                    item.insertText = new vscode.SnippetString(`"${interp.label}"`);
                    items.push(item);
                }
            }
        }

        // コンテキストに応じたプロパティ補完
        switch (context.type) {
            case 'root':
                items.push(...createCompletionItems(getRootProperties()));
                break;

            case 'layer':
                items.push(...createCompletionItems(getLayerProperties()));
                // paint と layout のキーも追加
                const paintItem = new vscode.CompletionItem(
                    'paint',
                    vscode.CompletionItemKind.Property,
                );
                paintItem.insertText = new vscode.SnippetString(
                    '"paint": {\n\t$0\n}',
                );
                paintItem.documentation = new vscode.MarkdownString(
                    'Paint properties for the layer.',
                );
                items.push(paintItem);

                const layoutItem = new vscode.CompletionItem(
                    'layout',
                    vscode.CompletionItemKind.Property,
                );
                layoutItem.insertText = new vscode.SnippetString(
                    '"layout": {\n\t$0\n}',
                );
                layoutItem.documentation = new vscode.MarkdownString(
                    'Layout properties for the layer.',
                );
                items.push(layoutItem);
                break;

            case 'paint':
                if (context.layerType) {
                    items.push(
                        ...createCompletionItems(
                            getPaintProperties(context.layerType),
                        ),
                    );
                } else {
                    // レイヤータイプ不明の場合、全タイプの paint プロパティを提供
                    for (const layerType of LAYER_TYPES) {
                        items.push(
                            ...createCompletionItems(
                                getPaintProperties(layerType),
                            ),
                        );
                    }
                }
                break;

            case 'layout':
                if (context.layerType) {
                    items.push(
                        ...createCompletionItems(
                            getLayoutProperties(context.layerType),
                        ),
                    );
                } else {
                    for (const layerType of LAYER_TYPES) {
                        items.push(
                            ...createCompletionItems(
                                getLayoutProperties(layerType),
                            ),
                        );
                    }
                }
                break;

            case 'source':
                if (context.sourceType) {
                    items.push(
                        ...createCompletionItems(
                            getSourceProperties(context.sourceType),
                        ),
                    );
                } else {
                    // ソースタイプ不明の場合、type プロパティを提案
                    const typeItem = new vscode.CompletionItem(
                        'type',
                        vscode.CompletionItemKind.Property,
                    );
                    typeItem.insertText = new vscode.SnippetString(
                        '"type": "${1|vector,raster,raster-dem,geojson,video,image|}"',
                    );
                    typeItem.documentation = new vscode.MarkdownString(
                        'The type of the source.',
                    );
                    items.push(typeItem);
                }
                break;

            case 'filter':
            case 'expression':
                // 式の演算子を補完
                const operators = getExpressionOperators();
                items.push(
                    ...operators.map((op) => createExpressionCompletionItem(op)),
                );
                break;
        }

        // 重複を除去
        const seen = new Set<string>();
        return items.filter((item) => {
            const label =
                typeof item.label === 'string' ? item.label : item.label.label;
            if (seen.has(label)) {
                return false;
            }
            seen.add(label);
            return true;
        });
    }
}
