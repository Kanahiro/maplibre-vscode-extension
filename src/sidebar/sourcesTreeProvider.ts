import * as vscode from 'vscode';
import { getStyleWatcher, SourceSpec } from './styleWatcher.js';

export class SourceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly sourceId: string,
        public readonly sourceType: string,
        public readonly sourceSpec: SourceSpec,
    ) {
        super(sourceId, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = sourceType;
        this.tooltip = `${sourceId} (${sourceType})`;
        this.contextValue = 'source';
        this.iconPath = this.getIcon();
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.sourceType) {
            case 'vector':
                return new vscode.ThemeIcon('symbol-array');
            case 'raster':
                return new vscode.ThemeIcon('symbol-color');
            case 'raster-dem':
                return new vscode.ThemeIcon('symbol-ruler');
            case 'geojson':
                return new vscode.ThemeIcon('json');
            case 'image':
                return new vscode.ThemeIcon('file-media');
            case 'video':
                return new vscode.ThemeIcon('play');
            default:
                return new vscode.ThemeIcon('database');
        }
    }
}

export class SourcePropertyItem extends vscode.TreeItem {
    constructor(
        public readonly propertyName: string,
        public readonly propertyValue: unknown,
    ) {
        super(propertyName, vscode.TreeItemCollapsibleState.None);
        this.description = this.formatValue(propertyValue);
        this.tooltip = `${propertyName}: ${this.formatValue(propertyValue)}`;
        this.contextValue = 'sourceProperty';
    }

    private formatValue(value: unknown): string {
        if (typeof value === 'string') {
            return value.length > 50 ? value.substring(0, 50) + '...' : value;
        }
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        if (typeof value === 'object' && value !== null) {
            return '{...}';
        }
        return String(value);
    }
}

export class SourcesTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
            return Promise.resolve(this.getSources());
        }

        if (element instanceof SourceTreeItem) {
            return Promise.resolve(this.getSourceProperties(element));
        }

        return Promise.resolve([]);
    }

    private getSources(): SourceTreeItem[] {
        const watcher = getStyleWatcher();
        const style = watcher.style;

        if (!style || !style.sources) {
            return [];
        }

        const items: SourceTreeItem[] = [];
        for (const [id, spec] of Object.entries(style.sources)) {
            items.push(new SourceTreeItem(id, spec.type, spec));
        }
        return items;
    }

    private getSourceProperties(sourceItem: SourceTreeItem): SourcePropertyItem[] {
        const items: SourcePropertyItem[] = [];
        const spec = sourceItem.sourceSpec;

        for (const [key, value] of Object.entries(spec)) {
            if (key === 'type') {continue;} // Already shown in description
            items.push(new SourcePropertyItem(key, value));
        }

        return items;
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this._onDidChangeTreeData.dispose();
    }
}
