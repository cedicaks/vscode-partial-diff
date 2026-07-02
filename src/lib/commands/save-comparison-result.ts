import * as vscode from 'vscode';
import {Command} from './command';
import LastComparisonStore from '../last-comparison-store';
import SelectionInfoRegistry from '../selection-info-registry';
import ComparisonResultExporter, {ExportFormat} from '../comparison-result-exporter';
import WindowAdaptor from '../adaptors/window';
import WorkspaceAdaptor from '../adaptors/workspace';

export default class SaveComparisonResultCommand implements Command {
    constructor(private readonly lastComparisonStore: LastComparisonStore,
                private readonly selectionInfoRegistry: SelectionInfoRegistry,
                private readonly comparisonResultExporter: ComparisonResultExporter,
                private readonly windowAdaptor: WindowAdaptor,
                private readonly workspaceAdaptor: WorkspaceAdaptor) {}

    async execute() {
        const comparison = this.lastComparisonStore.get();
        if (!comparison) {
            await this.windowAdaptor.showInformationMessage(
                'No comparison to save. Please take a diff first.'
            );
            return;
        }

        const uri = await this.windowAdaptor.showSaveDialog({
            saveLabel: 'Save Comparison Result',
            filters: {
                'HTML': ['html'],
                'Unified Diff': ['diff']
            }
        });
        if (!uri) return;

        const info1 = this.selectionInfoRegistry.get(comparison.textKey1);
        const info2 = this.selectionInfoRegistry.get(comparison.textKey2);
        const content = this.comparisonResultExporter.export(this.resolveFormat(uri), info1, info2);
        await this.workspaceAdaptor.writeFile(uri, content);

        await this.windowAdaptor.showInformationMessage(`Comparison result saved to ${uri.fsPath}`);
    }

    private resolveFormat(uri: vscode.Uri): ExportFormat {
        return /\.html?$/i.test(uri.fsPath) ? 'html' : 'diff';
    }
}
