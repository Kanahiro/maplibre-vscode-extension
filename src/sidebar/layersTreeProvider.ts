import * as vscode from 'vscode';
import { getStyleWatcher, LayerSpec } from './styleWatcher.js';

export class LayerGroupItem extends vscode.TreeItem {
    constructor(
        public readonly groupId: string,
        public readonly groupName: string,
        public readonly layerIndices: number[],
    ) {
        super(groupName, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = `${layerIndices.length} layers`;
        this.tooltip = `Group: ${groupName}`;
        this.contextValue = 'layerGroup';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class LayerTreeItem extends vscode.TreeItem {
    constructor(
        public readonly layerId: string,
        public readonly layerType: string,
        public readonly layerIndex: number,
        public readonly layerSpec: LayerSpec,
    ) {
        super(layerId, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = this.buildDescription();
        this.tooltip = this.buildTooltip();
        this.contextValue = 'layer';
        this.iconPath = this.getIcon();

        // Enable selection command
        this.command = {
            command: 'maplibre.selectLayer',
            title: 'Select Layer',
            arguments: [this],
        };
    }

    private buildDescription(): string {
        const visibility = this.layerSpec.layout?.visibility;
        const visIcon = visibility === 'none' ? '(hidden)' : '';
        return `${this.layerType} ${visIcon}`.trim();
    }

    private buildTooltip(): string {
        const parts = [`${this.layerId} (${this.layerType})`];
        if (this.layerSpec.source) {
            parts.push(`Source: ${this.layerSpec.source}`);
        }
        if (this.layerSpec['source-layer']) {
            parts.push(`Source Layer: ${this.layerSpec['source-layer']}`);
        }
        const visibility = this.layerSpec.layout?.visibility;
        if (visibility === 'none') {
            parts.push('Visibility: hidden');
        }
        return parts.join('\n');
    }

    private getIcon(): vscode.ThemeIcon {
        const visibility = this.layerSpec.layout?.visibility;
        const isHidden = visibility === 'none';

        // Use eye icons for visibility state
        if (isHidden) {
            return new vscode.ThemeIcon('eye-closed');
        }

        switch (this.layerType) {
            case 'background':
                return new vscode.ThemeIcon('symbol-color');
            case 'fill':
                return new vscode.ThemeIcon('symbol-misc');
            case 'line':
                return new vscode.ThemeIcon('dash');
            case 'symbol':
                return new vscode.ThemeIcon('symbol-text');
            case 'raster':
                return new vscode.ThemeIcon('file-media');
            case 'circle':
                return new vscode.ThemeIcon('circle-outline');
            case 'fill-extrusion':
                return new vscode.ThemeIcon('symbol-structure');
            case 'heatmap':
                return new vscode.ThemeIcon('flame');
            case 'hillshade':
                return new vscode.ThemeIcon('graph');
            default:
                return new vscode.ThemeIcon('layers');
        }
    }
}

export class LayerPropertyItem extends vscode.TreeItem {
    constructor(
        public readonly propertyName: string,
        public readonly propertyValue: unknown,
        public readonly isExpandable: boolean = false,
    ) {
        super(
            propertyName,
            isExpandable
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );
        this.description = this.formatValue(propertyValue);
        this.contextValue = 'layerProperty';
    }

    private formatValue(value: unknown): string {
        if (typeof value === 'string') {
            return value.length > 40 ? value.substring(0, 40) + '...' : value;
        }
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        if (typeof value === 'object' && value !== null) {
            return `{${Object.keys(value).length} props}`;
        }
        return String(value);
    }
}

export class LayerSubPropertyItem extends vscode.TreeItem {
    constructor(
        public readonly propertyName: string,
        public readonly propertyValue: unknown,
    ) {
        super(propertyName, vscode.TreeItemCollapsibleState.None);
        this.description = this.formatValue(propertyValue);
        this.contextValue = 'layerSubProperty';
    }

    private formatValue(value: unknown): string {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return String(value);
    }
}

export class LayersTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private disposables: vscode.Disposable[] = [];

    constructor() {
        const watcher = getStyleWatcher();
        this.disposables.push(
            watcher.onStyleChange(() => {
                this.refresh();
            })
        );
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getLayers());
        }

        if (element instanceof LayerTreeItem) {
            return Promise.resolve(this.getLayerProperties(element));
        }

        if (element instanceof LayerPropertyItem && element.isExpandable) {
            return Promise.resolve(this.getSubProperties(element.propertyValue as Record<string, unknown>));
        }

        return Promise.resolve([]);
    }

    private getLayers(): LayerTreeItem[] {
        const watcher = getStyleWatcher();
        const style = watcher.style;

        if (!style || !style.layers) {
            return [];
        }

        return style.layers.map((layer, index) =>
            new LayerTreeItem(layer.id, layer.type, index, layer)
        );
    }

    private getLayerProperties(layerItem: LayerTreeItem): LayerPropertyItem[] {
        const items: LayerPropertyItem[] = [];
        const spec = layerItem.layerSpec;

        // Show main properties first
        const mainProps = ['source', 'source-layer', 'minzoom', 'maxzoom'];
        for (const prop of mainProps) {
            if (spec[prop] !== undefined) {
                items.push(new LayerPropertyItem(prop, spec[prop]));
            }
        }

        // Filter
        if (spec.filter) {
            items.push(new LayerPropertyItem('filter', spec.filter));
        }

        // Paint and layout are expandable
        if (spec.paint && Object.keys(spec.paint).length > 0) {
            items.push(new LayerPropertyItem('paint', spec.paint, true));
        }
        if (spec.layout && Object.keys(spec.layout).length > 0) {
            items.push(new LayerPropertyItem('layout', spec.layout, true));
        }

        return items;
    }

    private getSubProperties(obj: Record<string, unknown>): LayerSubPropertyItem[] {
        return Object.entries(obj).map(
            ([key, value]) => new LayerSubPropertyItem(key, value)
        );
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this._onDidChangeTreeData.dispose();
    }
}
