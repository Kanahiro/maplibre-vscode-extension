/**
 * Hover Provider - プロパティの説明をホバー時に表示
 */

import * as vscode from 'vscode';
import { getJsonContext, getWordAtPosition } from './context.js';
import {
    getPropertyMetadata,
    getRootProperties,
    getLayerProperties,
    getPaintProperties,
    getLayoutProperties,
    getSourceProperties,
    PropertyMetadata,
    LAYER_TYPES,
} from './schema.js';
import { EXPRESSION_OPERATORS } from './expression.js';

/**
 * プロパティメタデータからホバーコンテンツを生成
 */
function createHoverContent(
    name: string,
    metadata: PropertyMetadata,
): vscode.MarkdownString {
    const md = new vscode.MarkdownString();

    // プロパティ名と型
    const typeStr = metadata.type || 'unknown';
    md.appendMarkdown(`**${name}** \`${typeStr}\`\n\n`);

    // 必須フラグ
    if (metadata.required) {
        md.appendMarkdown('*Required*\n\n');
    }

    // 説明
    if (metadata.doc) {
        md.appendMarkdown(`${metadata.doc}\n\n`);
    }

    // デフォルト値
    if (metadata.default !== undefined) {
        md.appendMarkdown(
            `**Default:** \`${JSON.stringify(metadata.default)}\`\n\n`,
        );
    }

    // 数値範囲
    if (metadata.minimum !== undefined || metadata.maximum !== undefined) {
        const min =
            metadata.minimum !== undefined ? metadata.minimum : '-∞';
        const max =
            metadata.maximum !== undefined ? metadata.maximum : '+∞';
        md.appendMarkdown(`**Range:** ${min} to ${max}\n\n`);
    }

    // 単位
    if (metadata.units) {
        md.appendMarkdown(`**Units:** ${metadata.units}\n\n`);
    }

    // enum値
    if (metadata.values && typeof metadata.values === 'object') {
        md.appendMarkdown('**Values:**\n');
        for (const [value, info] of Object.entries(metadata.values)) {
            const doc =
                typeof info === 'object' && info?.doc ? `: ${info.doc}` : '';
            md.appendMarkdown(`- \`"${value}"\`${doc}\n`);
        }
        md.appendMarkdown('\n');
    }

    // 式サポート
    if (metadata.expression) {
        const interpolated = metadata.expression.interpolated
            ? 'Yes'
            : 'No';
        const params = metadata.expression.parameters?.join(', ') || 'none';
        md.appendMarkdown(
            `**Expression:** interpolated=${interpolated}, parameters=[${params}]\n\n`,
        );
    }

    // トランジションサポート
    if (metadata.transition) {
        md.appendMarkdown('**Transition:** supported\n\n');
    }

    return md;
}

/**
 * 式の演算子のホバーコンテンツを生成
 */
function createExpressionHoverContent(
    operator: string,
): vscode.MarkdownString | undefined {
    const info = EXPRESSION_OPERATORS[operator];
    if (!info) {return undefined;}

    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${operator}** expression\n\n`);
    md.appendMarkdown(`${info.doc}\n\n`);
    md.appendMarkdown(`**Arguments:** \`${info.args.join(', ')}\`\n\n`);
    md.appendMarkdown(`**Returns:** \`${info.returns}\`\n`);

    return md;
}

/**
 * Hover Provider クラス
 */
export class MapLibreHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Hover | undefined {
        // 対象ファイルかチェック
        if (!document.fileName.endsWith('style.json')) {
            return undefined;
        }

        // カーソル位置の単語を取得
        const wordInfo = getWordAtPosition(document, position);
        if (!wordInfo) {return undefined;}

        const { word, range } = wordInfo;

        // コンテキストを取得
        const context = getJsonContext(document, position);

        // 式のコンテキストの場合
        if (context.type === 'expression') {
            const exprHover = createExpressionHoverContent(word);
            if (exprHover) {
                return new vscode.Hover(exprHover, range);
            }
        }

        // プロパティ名のメタデータを検索
        let metadata: PropertyMetadata | undefined;

        switch (context.type) {
            case 'root':
                metadata = getRootProperties()[word];
                break;

            case 'layer':
                // まずレイヤー共通プロパティを検索
                metadata = getLayerProperties()[word];
                // 見つからない場合、特定のプロパティ（type の値など）をチェック
                if (!metadata && word === 'type') {
                    // type プロパティの値としてのレイヤータイプ
                    if (LAYER_TYPES.includes(word as typeof LAYER_TYPES[number])) {
                        return new vscode.Hover(
                            new vscode.MarkdownString(`Layer type: **${word}**`),
                            range,
                        );
                    }
                }
                break;

            case 'paint':
                if (context.layerType) {
                    metadata = getPaintProperties(context.layerType)[word];
                }
                // レイヤータイプが不明な場合、全タイプを検索
                if (!metadata) {
                    for (const layerType of LAYER_TYPES) {
                        metadata = getPaintProperties(layerType)[word];
                        if (metadata) {break;}
                    }
                }
                break;

            case 'layout':
                if (context.layerType) {
                    metadata = getLayoutProperties(context.layerType)[word];
                }
                if (!metadata) {
                    for (const layerType of LAYER_TYPES) {
                        metadata = getLayoutProperties(layerType)[word];
                        if (metadata) {break;}
                    }
                }
                break;

            case 'source':
                if (context.sourceType) {
                    metadata = getSourceProperties(context.sourceType)[word];
                }
                break;

            default:
                // フォールバック: 全コンテキストを検索
                metadata =
                    getRootProperties()[word] ||
                    getLayerProperties()[word] ||
                    getPropertyMetadata(word, {
                        type: 'paint',
                        layerType: context.layerType,
                    }) ||
                    getPropertyMetadata(word, {
                        type: 'layout',
                        layerType: context.layerType,
                    });
                break;
        }

        if (metadata) {
            return new vscode.Hover(createHoverContent(word, metadata), range);
        }

        return undefined;
    }
}
