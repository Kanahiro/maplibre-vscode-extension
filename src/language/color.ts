/**
 * Color Provider - カラーピッカーの統合
 */

import * as vscode from 'vscode';

/**
 * 名前付きカラーの定義
 */
const NAMED_COLORS: Record<string, [number, number, number]> = {
    // CSS Level 1
    black: [0, 0, 0],
    silver: [192, 192, 192],
    gray: [128, 128, 128],
    white: [255, 255, 255],
    maroon: [128, 0, 0],
    red: [255, 0, 0],
    purple: [128, 0, 128],
    fuchsia: [255, 0, 255],
    green: [0, 128, 0],
    lime: [0, 255, 0],
    olive: [128, 128, 0],
    yellow: [255, 255, 0],
    navy: [0, 0, 128],
    blue: [0, 0, 255],
    teal: [0, 128, 128],
    aqua: [0, 255, 255],
    // CSS Level 2
    orange: [255, 165, 0],
    // Extended colors
    aliceblue: [240, 248, 255],
    antiquewhite: [250, 235, 215],
    aquamarine: [127, 255, 212],
    azure: [240, 255, 255],
    beige: [245, 245, 220],
    bisque: [255, 228, 196],
    blanchedalmond: [255, 235, 205],
    blueviolet: [138, 43, 226],
    brown: [165, 42, 42],
    burlywood: [222, 184, 135],
    cadetblue: [95, 158, 160],
    chartreuse: [127, 255, 0],
    chocolate: [210, 105, 30],
    coral: [255, 127, 80],
    cornflowerblue: [100, 149, 237],
    cornsilk: [255, 248, 220],
    crimson: [220, 20, 60],
    cyan: [0, 255, 255],
    darkblue: [0, 0, 139],
    darkcyan: [0, 139, 139],
    darkgoldenrod: [184, 134, 11],
    darkgray: [169, 169, 169],
    darkgreen: [0, 100, 0],
    darkgrey: [169, 169, 169],
    darkkhaki: [189, 183, 107],
    darkmagenta: [139, 0, 139],
    darkolivegreen: [85, 107, 47],
    darkorange: [255, 140, 0],
    darkorchid: [153, 50, 204],
    darkred: [139, 0, 0],
    darksalmon: [233, 150, 122],
    darkseagreen: [143, 188, 143],
    darkslateblue: [72, 61, 139],
    darkslategray: [47, 79, 79],
    darkslategrey: [47, 79, 79],
    darkturquoise: [0, 206, 209],
    darkviolet: [148, 0, 211],
    deeppink: [255, 20, 147],
    deepskyblue: [0, 191, 255],
    dimgray: [105, 105, 105],
    dimgrey: [105, 105, 105],
    dodgerblue: [30, 144, 255],
    firebrick: [178, 34, 34],
    floralwhite: [255, 250, 240],
    forestgreen: [34, 139, 34],
    gainsboro: [220, 220, 220],
    ghostwhite: [248, 248, 255],
    gold: [255, 215, 0],
    goldenrod: [218, 165, 32],
    greenyellow: [173, 255, 47],
    grey: [128, 128, 128],
    honeydew: [240, 255, 240],
    hotpink: [255, 105, 180],
    indianred: [205, 92, 92],
    indigo: [75, 0, 130],
    ivory: [255, 255, 240],
    khaki: [240, 230, 140],
    lavender: [230, 230, 250],
    lavenderblush: [255, 240, 245],
    lawngreen: [124, 252, 0],
    lemonchiffon: [255, 250, 205],
    lightblue: [173, 216, 230],
    lightcoral: [240, 128, 128],
    lightcyan: [224, 255, 255],
    lightgoldenrodyellow: [250, 250, 210],
    lightgray: [211, 211, 211],
    lightgreen: [144, 238, 144],
    lightgrey: [211, 211, 211],
    lightpink: [255, 182, 193],
    lightsalmon: [255, 160, 122],
    lightseagreen: [32, 178, 170],
    lightskyblue: [135, 206, 250],
    lightslategray: [119, 136, 153],
    lightslategrey: [119, 136, 153],
    lightsteelblue: [176, 196, 222],
    lightyellow: [255, 255, 224],
    limegreen: [50, 205, 50],
    linen: [250, 240, 230],
    magenta: [255, 0, 255],
    mediumaquamarine: [102, 205, 170],
    mediumblue: [0, 0, 205],
    mediumorchid: [186, 85, 211],
    mediumpurple: [147, 112, 219],
    mediumseagreen: [60, 179, 113],
    mediumslateblue: [123, 104, 238],
    mediumspringgreen: [0, 250, 154],
    mediumturquoise: [72, 209, 204],
    mediumvioletred: [199, 21, 133],
    midnightblue: [25, 25, 112],
    mintcream: [245, 255, 250],
    mistyrose: [255, 228, 225],
    moccasin: [255, 228, 181],
    navajowhite: [255, 222, 173],
    oldlace: [253, 245, 230],
    olivedrab: [107, 142, 35],
    orangered: [255, 69, 0],
    orchid: [218, 112, 214],
    palegoldenrod: [238, 232, 170],
    palegreen: [152, 251, 152],
    paleturquoise: [175, 238, 238],
    palevioletred: [219, 112, 147],
    papayawhip: [255, 239, 213],
    peachpuff: [255, 218, 185],
    peru: [205, 133, 63],
    pink: [255, 192, 203],
    plum: [221, 160, 221],
    powderblue: [176, 224, 230],
    rosybrown: [188, 143, 143],
    royalblue: [65, 105, 225],
    saddlebrown: [139, 69, 19],
    salmon: [250, 128, 114],
    sandybrown: [244, 164, 96],
    seagreen: [46, 139, 87],
    seashell: [255, 245, 238],
    sienna: [160, 82, 45],
    skyblue: [135, 206, 235],
    slateblue: [106, 90, 205],
    slategray: [112, 128, 144],
    slategrey: [112, 128, 144],
    snow: [255, 250, 250],
    springgreen: [0, 255, 127],
    steelblue: [70, 130, 180],
    tan: [210, 180, 140],
    thistle: [216, 191, 216],
    tomato: [255, 99, 71],
    turquoise: [64, 224, 208],
    violet: [238, 130, 238],
    wheat: [245, 222, 179],
    whitesmoke: [245, 245, 245],
    yellowgreen: [154, 205, 50],
    // Transparent
    transparent: [0, 0, 0], // alpha = 0
};

/**
 * 数値を16進数に変換
 */
function toHex(n: number): string {
    return Math.round(n).toString(16).padStart(2, '0');
}

/**
 * 色文字列をパースしてColorを返す
 */
function parseColor(value: string): vscode.Color | undefined {
    const trimmed = value.trim().toLowerCase();

    // Hex colors: #rgb, #rrggbb, #rrggbbaa
    const hexMatch = trimmed.match(
        /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    );
    if (hexMatch) {
        const hex = hexMatch[1];
        if (hex.length === 3) {
            // #rgb
            return new vscode.Color(
                parseInt(hex[0] + hex[0], 16) / 255,
                parseInt(hex[1] + hex[1], 16) / 255,
                parseInt(hex[2] + hex[2], 16) / 255,
                1,
            );
        } else if (hex.length === 6) {
            // #rrggbb
            return new vscode.Color(
                parseInt(hex.substring(0, 2), 16) / 255,
                parseInt(hex.substring(2, 4), 16) / 255,
                parseInt(hex.substring(4, 6), 16) / 255,
                1,
            );
        } else if (hex.length === 8) {
            // #rrggbbaa
            return new vscode.Color(
                parseInt(hex.substring(0, 2), 16) / 255,
                parseInt(hex.substring(2, 4), 16) / 255,
                parseInt(hex.substring(4, 6), 16) / 255,
                parseInt(hex.substring(6, 8), 16) / 255,
            );
        }
    }

    // rgb(r, g, b)
    const rgbMatch = trimmed.match(
        /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/,
    );
    if (rgbMatch) {
        return new vscode.Color(
            parseInt(rgbMatch[1]) / 255,
            parseInt(rgbMatch[2]) / 255,
            parseInt(rgbMatch[3]) / 255,
            1,
        );
    }

    // rgba(r, g, b, a)
    const rgbaMatch = trimmed.match(
        /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/,
    );
    if (rgbaMatch) {
        return new vscode.Color(
            parseInt(rgbaMatch[1]) / 255,
            parseInt(rgbaMatch[2]) / 255,
            parseInt(rgbaMatch[3]) / 255,
            parseFloat(rgbaMatch[4]),
        );
    }

    // hsl(h, s%, l%)
    const hslMatch = trimmed.match(
        /^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/,
    );
    if (hslMatch) {
        const [r, g, b] = hslToRgb(
            parseInt(hslMatch[1]) / 360,
            parseInt(hslMatch[2]) / 100,
            parseInt(hslMatch[3]) / 100,
        );
        return new vscode.Color(r, g, b, 1);
    }

    // hsla(h, s%, l%, a)
    const hslaMatch = trimmed.match(
        /^hsla\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d.]+)\s*\)$/,
    );
    if (hslaMatch) {
        const [r, g, b] = hslToRgb(
            parseInt(hslaMatch[1]) / 360,
            parseInt(hslaMatch[2]) / 100,
            parseInt(hslaMatch[3]) / 100,
        );
        return new vscode.Color(r, g, b, parseFloat(hslaMatch[4]));
    }

    // Named colors
    const namedColor = NAMED_COLORS[trimmed];
    if (namedColor) {
        if (trimmed === 'transparent') {
            return new vscode.Color(0, 0, 0, 0);
        }
        return new vscode.Color(
            namedColor[0] / 255,
            namedColor[1] / 255,
            namedColor[2] / 255,
            1,
        );
    }

    return undefined;
}

/**
 * HSL to RGB 変換
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number): number => {
            if (t < 0) {t += 1;}
            if (t > 1) {t -= 1;}
            if (t < 1 / 6) {return p + (q - p) * 6 * t;}
            if (t < 1 / 2) {return q;}
            if (t < 2 / 3) {return p + (q - p) * (2 / 3 - t) * 6;}
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
}

/**
 * Color Provider クラス
 */
export class MapLibreColorProvider implements vscode.DocumentColorProvider {
    provideDocumentColors(
        document: vscode.TextDocument,
    ): vscode.ColorInformation[] {
        // 対象ファイルかチェック
        if (!document.fileName.endsWith('style.json')) {
            return [];
        }

        const text = document.getText();
        const colors: vscode.ColorInformation[] = [];

        // 色プロパティのパターン
        // "xxx-color": "colorvalue" または "xxx-color": "#hex"
        const colorPropertyPattern =
            /"[\w-]*color[^"]*"\s*:\s*"([^"]+)"/gi;
        let match;

        while ((match = colorPropertyPattern.exec(text)) !== null) {
            const colorValue = match[1];
            const color = parseColor(colorValue);

            if (color) {
                // 色の値部分の位置を特定
                const fullMatch = match[0];
                const valueStartInMatch = fullMatch.lastIndexOf('"' + colorValue);
                const valueStart = match.index + valueStartInMatch + 1; // +1 for opening quote
                const valueEnd = valueStart + colorValue.length;

                const startPos = document.positionAt(valueStart);
                const endPos = document.positionAt(valueEnd);

                colors.push(
                    new vscode.ColorInformation(
                        new vscode.Range(startPos, endPos),
                        color,
                    ),
                );
            }
        }

        return colors;
    }

    provideColorPresentations(
        color: vscode.Color,
    ): vscode.ColorPresentation[] {
        const r = Math.round(color.red * 255);
        const g = Math.round(color.green * 255);
        const b = Math.round(color.blue * 255);
        const a = color.alpha;

        const presentations: vscode.ColorPresentation[] = [];

        // Hex format
        if (a === 1) {
            presentations.push(
                new vscode.ColorPresentation(`#${toHex(r)}${toHex(g)}${toHex(b)}`),
            );
        } else {
            presentations.push(
                new vscode.ColorPresentation(
                    `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`,
                ),
            );
        }

        // RGB/RGBA format
        if (a === 1) {
            presentations.push(
                new vscode.ColorPresentation(`rgb(${r}, ${g}, ${b})`),
            );
        } else {
            presentations.push(
                new vscode.ColorPresentation(
                    `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`,
                ),
            );
        }

        return presentations;
    }
}
