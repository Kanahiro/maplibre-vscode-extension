/**
 * Schema Parser - MapLibre Style Spec のメタデータを抽出・提供
 */

// @ts-expect-error JSON import
import latest from '@maplibre/maplibre-gl-style-spec/dist/latest.json';

export interface PropertyMetadata {
    type: string;
    doc?: string;
    default?: unknown;
    required?: boolean;
    minimum?: number;
    maximum?: number;
    values?: Record<string, { doc?: string }>;
    value?: string; // array element type
    expression?: {
        interpolated: boolean;
        parameters: string[];
    };
    transition?: boolean;
    units?: string;
}

export interface SchemaData {
    root: Record<string, PropertyMetadata>;
    layer: Record<string, PropertyMetadata>;
    sources: Record<string, Record<string, PropertyMetadata>>;
    paint: Record<string, Record<string, PropertyMetadata>>;
    layout: Record<string, Record<string, PropertyMetadata>>;
}

const spec = latest as Record<string, unknown>;

function extractProperties(
    obj: Record<string, unknown>,
): Record<string, PropertyMetadata> {
    const result: Record<string, PropertyMetadata> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$') || key === '*') {continue;}
        if (typeof value === 'object' && value !== null) {
            result[key] = value as PropertyMetadata;
        }
    }
    return result;
}

// Lazy-loaded schema data
let schemaData: SchemaData | null = null;

export function getSchemaData(): SchemaData {
    if (schemaData) {return schemaData;}

    const root = extractProperties(spec['$root'] as Record<string, unknown>);
    const layer = extractProperties(spec['layer'] as Record<string, unknown>);

    // Source types
    const sources: Record<string, Record<string, PropertyMetadata>> = {};
    const sourceTypes = [
        'source_vector',
        'source_raster',
        'source_raster_dem',
        'source_geojson',
        'source_video',
        'source_image',
    ];
    for (const sourceType of sourceTypes) {
        if (spec[sourceType]) {
            sources[sourceType] = extractProperties(
                spec[sourceType] as Record<string, unknown>,
            );
        }
    }

    // Paint properties by layer type
    const paint: Record<string, Record<string, PropertyMetadata>> = {};
    const paintTypes = [
        'paint_fill',
        'paint_line',
        'paint_circle',
        'paint_symbol',
        'paint_raster',
        'paint_background',
        'paint_fill-extrusion',
        'paint_heatmap',
        'paint_hillshade',
    ];
    for (const paintType of paintTypes) {
        if (spec[paintType]) {
            paint[paintType] = extractProperties(
                spec[paintType] as Record<string, unknown>,
            );
        }
    }

    // Layout properties by layer type
    const layout: Record<string, Record<string, PropertyMetadata>> = {};
    const layoutTypes = [
        'layout_fill',
        'layout_line',
        'layout_circle',
        'layout_symbol',
        'layout_raster',
        'layout_background',
        'layout_fill-extrusion',
        'layout_heatmap',
        'layout_hillshade',
    ];
    for (const layoutType of layoutTypes) {
        if (spec[layoutType]) {
            layout[layoutType] = extractProperties(
                spec[layoutType] as Record<string, unknown>,
            );
        }
    }

    schemaData = { root, layer, sources, paint, layout };
    return schemaData;
}

// Layer types
export const LAYER_TYPES = [
    'background',
    'fill',
    'line',
    'symbol',
    'raster',
    'circle',
    'fill-extrusion',
    'heatmap',
    'hillshade',
] as const;

export type LayerType = (typeof LAYER_TYPES)[number];

// Source types mapping
export const SOURCE_TYPES = {
    vector: 'source_vector',
    raster: 'source_raster',
    'raster-dem': 'source_raster_dem',
    geojson: 'source_geojson',
    video: 'source_video',
    image: 'source_image',
} as const;

export type SourceType = keyof typeof SOURCE_TYPES;

/**
 * Get paint properties for a specific layer type
 */
export function getPaintProperties(
    layerType: string,
): Record<string, PropertyMetadata> {
    const data = getSchemaData();
    const key = `paint_${layerType}`;
    return data.paint[key] ?? {};
}

/**
 * Get layout properties for a specific layer type
 */
export function getLayoutProperties(
    layerType: string,
): Record<string, PropertyMetadata> {
    const data = getSchemaData();
    const key = `layout_${layerType}`;
    return data.layout[key] ?? {};
}

/**
 * Get source properties for a specific source type
 */
export function getSourceProperties(
    sourceType: string,
): Record<string, PropertyMetadata> {
    const data = getSchemaData();
    const key = SOURCE_TYPES[sourceType as SourceType];
    if (key) {
        return data.sources[key] ?? {};
    }
    return {};
}

/**
 * Get root properties
 */
export function getRootProperties(): Record<string, PropertyMetadata> {
    return getSchemaData().root;
}

/**
 * Get layer common properties
 */
export function getLayerProperties(): Record<string, PropertyMetadata> {
    return getSchemaData().layer;
}

/**
 * Get property metadata by path
 */
export function getPropertyMetadata(
    propertyName: string,
    context: {
        type: 'root' | 'layer' | 'paint' | 'layout' | 'source';
        layerType?: string;
        sourceType?: string;
    },
): PropertyMetadata | undefined {
    const data = getSchemaData();

    switch (context.type) {
        case 'root':
            return data.root[propertyName];
        case 'layer':
            return data.layer[propertyName];
        case 'paint':
            if (context.layerType) {
                const key = `paint_${context.layerType}`;
                return data.paint[key]?.[propertyName];
            }
            break;
        case 'layout':
            if (context.layerType) {
                const key = `layout_${context.layerType}`;
                return data.layout[key]?.[propertyName];
            }
            break;
        case 'source':
            if (context.sourceType) {
                const key = SOURCE_TYPES[context.sourceType as SourceType];
                if (key) {
                    return data.sources[key]?.[propertyName];
                }
            }
            break;
    }

    return undefined;
}
