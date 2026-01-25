/**
 * Expression Support - MapLibre 式の補完・バリデーション・ホバー
 */

export interface ExpressionOperatorInfo {
    args: string[];
    returns: string;
    doc: string;
}

/**
 * MapLibre 式の演算子定義
 */
export const EXPRESSION_OPERATORS: Record<string, ExpressionOperatorInfo> = {
    // Types
    array: {
        args: ['value', 'type?', 'length?'],
        returns: 'array',
        doc: 'Asserts that the input is an array.',
    },
    boolean: {
        args: ['value', '...fallbacks'],
        returns: 'boolean',
        doc: 'Asserts that the input value is a boolean.',
    },
    collator: {
        args: ['options'],
        returns: 'collator',
        doc: 'Returns a collator for use in locale-dependent comparison operations.',
    },
    format: {
        args: ['...sections'],
        returns: 'formatted',
        doc: 'Returns a formatted string for displaying mixed-format text.',
    },
    image: {
        args: ['value'],
        returns: 'resolvedImage',
        doc: 'Returns an image type for use in icon-image, *-pattern entries.',
    },
    literal: {
        args: ['value'],
        returns: 'array | object',
        doc: 'Provides a literal array or object value.',
    },
    number: {
        args: ['value', '...fallbacks'],
        returns: 'number',
        doc: 'Asserts that the input value is a number.',
    },
    'number-format': {
        args: ['number', 'options'],
        returns: 'string',
        doc: 'Converts the input number into a string representation using locale-dependent formatting.',
    },
    object: {
        args: ['value', '...fallbacks'],
        returns: 'object',
        doc: 'Asserts that the input value is an object.',
    },
    string: {
        args: ['value', '...fallbacks'],
        returns: 'string',
        doc: 'Asserts that the input value is a string.',
    },
    'to-boolean': {
        args: ['value'],
        returns: 'boolean',
        doc: 'Converts the input value to a boolean.',
    },
    'to-color': {
        args: ['value', '...fallbacks'],
        returns: 'color',
        doc: 'Converts the input value to a color.',
    },
    'to-number': {
        args: ['value', '...fallbacks'],
        returns: 'number',
        doc: 'Converts the input value to a number.',
    },
    'to-string': {
        args: ['value'],
        returns: 'string',
        doc: 'Converts the input value to a string.',
    },
    typeof: {
        args: ['value'],
        returns: 'string',
        doc: 'Returns a string describing the type of the given value.',
    },

    // Feature data
    'accumulated': {
        args: [],
        returns: 'value',
        doc: 'Gets the value of a cluster property accumulated so far.',
    },
    'feature-state': {
        args: ['key'],
        returns: 'value',
        doc: 'Retrieves a property value from the current feature\'s state.',
    },
    'geometry-type': {
        args: [],
        returns: 'string',
        doc: 'Gets the feature\'s geometry type: Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon.',
    },
    id: {
        args: [],
        returns: 'value',
        doc: 'Gets the feature\'s id, if it has one.',
    },
    'line-progress': {
        args: [],
        returns: 'number',
        doc: 'Gets the progress along a gradient line. Can only be used in the line-gradient property.',
    },
    properties: {
        args: [],
        returns: 'object',
        doc: 'Gets the feature properties object.',
    },

    // Lookup
    at: {
        args: ['number', 'array'],
        returns: 'value',
        doc: 'Retrieves an item from an array.',
    },
    get: {
        args: ['string', 'object?'],
        returns: 'value',
        doc: 'Retrieves a property value from the current feature\'s properties, or from another object if a second argument is provided.',
    },
    has: {
        args: ['string', 'object?'],
        returns: 'boolean',
        doc: 'Tests for the presence of an property value in the current feature\'s properties.',
    },
    in: {
        args: ['keyword', 'input'],
        returns: 'boolean',
        doc: 'Determines whether an item exists in an array or a substring exists in a string.',
    },
    'index-of': {
        args: ['keyword', 'input', 'index?'],
        returns: 'number',
        doc: 'Returns the first position at which an item can be found in an array or a substring in a string.',
    },
    length: {
        args: ['value'],
        returns: 'number',
        doc: 'Gets the length of an array or string.',
    },
    slice: {
        args: ['input', 'index', 'endIndex?'],
        returns: 'value',
        doc: 'Returns an item from an array or a substring from a string.',
    },

    // Decision
    '!': {
        args: ['boolean'],
        returns: 'boolean',
        doc: 'Logical negation. Returns true if the input is false, and false if the input is true.',
    },
    '!=': {
        args: ['value', 'value', 'collator?'],
        returns: 'boolean',
        doc: 'Returns true if the input values are not equal.',
    },
    '<': {
        args: ['value', 'value', 'collator?'],
        returns: 'boolean',
        doc: 'Returns true if the first input is strictly less than the second.',
    },
    '<=': {
        args: ['value', 'value', 'collator?'],
        returns: 'boolean',
        doc: 'Returns true if the first input is less than or equal to the second.',
    },
    '==': {
        args: ['value', 'value', 'collator?'],
        returns: 'boolean',
        doc: 'Returns true if the input values are equal.',
    },
    '>': {
        args: ['value', 'value', 'collator?'],
        returns: 'boolean',
        doc: 'Returns true if the first input is strictly greater than the second.',
    },
    '>=': {
        args: ['value', 'value', 'collator?'],
        returns: 'boolean',
        doc: 'Returns true if the first input is greater than or equal to the second.',
    },
    all: {
        args: ['boolean...'],
        returns: 'boolean',
        doc: 'Returns true if all the inputs are true.',
    },
    any: {
        args: ['boolean...'],
        returns: 'boolean',
        doc: 'Returns true if any of the inputs are true.',
    },
    case: {
        args: ['condition', 'output', '...pairs', 'fallback'],
        returns: 'value',
        doc: 'Selects the first output whose corresponding test condition evaluates to true.',
    },
    coalesce: {
        args: ['value...'],
        returns: 'value',
        doc: 'Evaluates each expression in turn until the first non-null value is obtained.',
    },
    match: {
        args: ['input', 'label', 'output', '...pairs', 'fallback'],
        returns: 'value',
        doc: 'Selects the output whose label value matches the input value.',
    },
    within: {
        args: ['geometry'],
        returns: 'boolean',
        doc: 'Returns true if the evaluated feature is fully contained inside a boundary of the input geometry.',
    },

    // Ramps, scales, curves
    interpolate: {
        args: ['interpolation', 'input', 'stop', 'output', '...pairs'],
        returns: 'value',
        doc: 'Produces continuous, smooth results by interpolating between pairs of input and output values.',
    },
    'interpolate-hcl': {
        args: ['interpolation', 'input', 'stop', 'output', '...pairs'],
        returns: 'color',
        doc: 'Produces continuous, smooth results by interpolating between pairs of input and output values in HCL color space.',
    },
    'interpolate-lab': {
        args: ['interpolation', 'input', 'stop', 'output', '...pairs'],
        returns: 'color',
        doc: 'Produces continuous, smooth results by interpolating between pairs of input and output values in LAB color space.',
    },
    step: {
        args: ['input', 'output0', 'stop1', 'output1', '...pairs'],
        returns: 'value',
        doc: 'Produces discrete, stepped results by evaluating a piecewise-constant function.',
    },

    // Variable binding
    let: {
        args: ['name', 'value', '...pairs', 'output'],
        returns: 'value',
        doc: 'Binds expressions to named variables, which can then be referenced with var.',
    },
    var: {
        args: ['name'],
        returns: 'value',
        doc: 'References variable bound using let.',
    },

    // String
    concat: {
        args: ['value...'],
        returns: 'string',
        doc: 'Returns a string consisting of the concatenation of the inputs.',
    },
    downcase: {
        args: ['string'],
        returns: 'string',
        doc: 'Returns the input string converted to lowercase.',
    },
    'is-supported-script': {
        args: ['string'],
        returns: 'boolean',
        doc: 'Returns true if the input string is expected to render legibly.',
    },
    'resolved-locale': {
        args: ['collator'],
        returns: 'string',
        doc: 'Returns the IETF language tag of the locale being used by the provided collator.',
    },
    upcase: {
        args: ['string'],
        returns: 'string',
        doc: 'Returns the input string converted to uppercase.',
    },

    // Color
    rgb: {
        args: ['number', 'number', 'number'],
        returns: 'color',
        doc: 'Creates a color value from red, green, and blue components.',
    },
    rgba: {
        args: ['number', 'number', 'number', 'number'],
        returns: 'color',
        doc: 'Creates a color value from red, green, blue, and alpha components.',
    },
    'to-rgba': {
        args: ['color'],
        returns: 'array',
        doc: 'Returns a four-element array containing the color components.',
    },

    // Math
    '-': {
        args: ['number', 'number?'],
        returns: 'number',
        doc: 'Subtraction (or negation if single argument).',
    },
    '*': {
        args: ['number...'],
        returns: 'number',
        doc: 'Multiplication.',
    },
    '/': {
        args: ['number', 'number'],
        returns: 'number',
        doc: 'Division.',
    },
    '%': {
        args: ['number', 'number'],
        returns: 'number',
        doc: 'Returns the remainder after integer division.',
    },
    '^': {
        args: ['number', 'number'],
        returns: 'number',
        doc: 'Returns the result of raising the first input to the power of the second.',
    },
    '+': {
        args: ['number...'],
        returns: 'number',
        doc: 'Addition.',
    },
    abs: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the absolute value of the input.',
    },
    acos: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the arccosine of the input.',
    },
    asin: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the arcsine of the input.',
    },
    atan: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the arctangent of the input.',
    },
    ceil: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the smallest integer that is greater than or equal to the input.',
    },
    cos: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the cosine of the input.',
    },
    distance: {
        args: ['geometry'],
        returns: 'number',
        doc: 'Returns the shortest distance in meters between the evaluated feature and the input geometry.',
    },
    e: {
        args: [],
        returns: 'number',
        doc: 'Returns the mathematical constant e.',
    },
    floor: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the largest integer that is less than or equal to the input.',
    },
    ln: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the natural logarithm of the input.',
    },
    ln2: {
        args: [],
        returns: 'number',
        doc: 'Returns the mathematical constant ln(2).',
    },
    log10: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the base-ten logarithm of the input.',
    },
    log2: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the base-two logarithm of the input.',
    },
    max: {
        args: ['number...'],
        returns: 'number',
        doc: 'Returns the maximum value of the inputs.',
    },
    min: {
        args: ['number...'],
        returns: 'number',
        doc: 'Returns the minimum value of the inputs.',
    },
    pi: {
        args: [],
        returns: 'number',
        doc: 'Returns the mathematical constant pi.',
    },
    round: {
        args: ['number'],
        returns: 'number',
        doc: 'Rounds the input to the nearest integer.',
    },
    sin: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the sine of the input.',
    },
    sqrt: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the square root of the input.',
    },
    tan: {
        args: ['number'],
        returns: 'number',
        doc: 'Returns the tangent of the input.',
    },

    // Zoom
    zoom: {
        args: [],
        returns: 'number',
        doc: 'Gets the current zoom level.',
    },

    // Heatmap
    'heatmap-density': {
        args: [],
        returns: 'number',
        doc: 'Gets the kernel density estimation of a pixel in a heatmap layer.',
    },
};

/**
 * 演算子名の一覧を取得
 */
export function getExpressionOperators(): string[] {
    return Object.keys(EXPRESSION_OPERATORS);
}

/**
 * 演算子情報を取得
 */
export function getExpressionOperatorInfo(
    operator: string,
): ExpressionOperatorInfo | undefined {
    return EXPRESSION_OPERATORS[operator];
}

/**
 * 補間タイプの定義
 */
export const INTERPOLATION_TYPES = [
    { label: 'linear', doc: 'Interpolates linearly between stops.' },
    { label: 'exponential', doc: 'Interpolates exponentially between stops.' },
    { label: 'cubic-bezier', doc: 'Interpolates using a cubic bezier curve.' },
];
