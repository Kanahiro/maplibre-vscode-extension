/**
 * Language Features - エクスポート
 */

export { createDiagnosticsProvider } from './diagnostics.js';
export { MapLibreHoverProvider } from './hover.js';
export { MapLibreCompletionProvider } from './completion.js';
export { MapLibreColorProvider } from './color.js';
export {
    EXPRESSION_OPERATORS,
    getExpressionOperators,
    getExpressionOperatorInfo,
    INTERPOLATION_TYPES,
} from './expression.js';
export { getJsonContext, getWordAtPosition } from './context.js';
export {
    getSchemaData,
    getRootProperties,
    getLayerProperties,
    getPaintProperties,
    getLayoutProperties,
    getSourceProperties,
    getPropertyMetadata,
    LAYER_TYPES,
    SOURCE_TYPES,
} from './schema.js';
