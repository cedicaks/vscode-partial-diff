import SaveText1Command from './commands/save-text-1';
import CompareSelectionWithText1Command from './commands/compare-selection-with-text1';
import CompareSelectionWithClipboardCommand from './commands/compare-selection-with-clipboard';
import CompareVisibleEditorsCommand from './commands/compare-visible-editors';
import SaveComparisonResultCommand from './commands/save-comparison-result';
import DiffPresenter from './diff-presenter';
import ToggleNormalisationRulesCommand from './commands/toggle-normalisation-rules';
import NormalisationRuleStore from './normalisation-rule-store';
import SelectionInfoRegistry from './selection-info-registry';
import LastComparisonStore from './last-comparison-store';
import ComparisonResultExporter from './comparison-result-exporter';
import LineDiffer from './diff/line-differ';
import DiffRenderer from './diff/diff-renderer';
import TextProcessRuleApplier from './text-process-rule-applier';
import TextTitleBuilder from './text-title-builder';
import CommandAdaptor from './adaptors/command';
import WindowAdaptor from './adaptors/window';
import WorkspaceAdaptor from './adaptors/workspace';
import {Command} from './commands/command';
import * as vscode from 'vscode';

export default class CommandFactory {
    private diffPresenter?: DiffPresenter;
    private readonly lastComparisonStore: LastComparisonStore;

    constructor(private readonly selectionInfoRegistry: SelectionInfoRegistry,
                private readonly normalisationRuleStore: NormalisationRuleStore,
                private readonly commandAdaptor: CommandAdaptor,
                private readonly windowAdaptor: WindowAdaptor,
                private readonly workspaceAdaptor: WorkspaceAdaptor,
                private readonly clipboard: typeof vscode.env.clipboard,
                private readonly getCurrentDate: () => Date) {
        this.lastComparisonStore = new LastComparisonStore();
    }

    crateSaveText1Command(): Command {
        return new SaveText1Command(this.selectionInfoRegistry);
    }

    createCompareSelectionWithText1Command(): Command {
        return new CompareSelectionWithText1Command(
            this.getDiffPresenter(),
            this.selectionInfoRegistry
        );
    }

    createCompareSelectionWithClipboardCommand(): Command {
        return new CompareSelectionWithClipboardCommand(
            this.getDiffPresenter(),
            this.selectionInfoRegistry,
            this.clipboard
        );
    }

    createCompareVisibleEditorsCommand(): Command {
        return new CompareVisibleEditorsCommand(
            this.getDiffPresenter(),
            this.selectionInfoRegistry,
            this.windowAdaptor
        );
    }

    createToggleNormalisationRulesCommand(): Command {
        return new ToggleNormalisationRulesCommand(
            this.normalisationRuleStore,
            this.windowAdaptor
        );
    }

    createSaveComparisonResultCommand(): Command {
        const exporter = new ComparisonResultExporter(
            new LineDiffer(),
            new DiffRenderer(),
            new TextProcessRuleApplier(this.normalisationRuleStore),
            new TextTitleBuilder()
        );
        return new SaveComparisonResultCommand(
            this.lastComparisonStore,
            this.selectionInfoRegistry,
            exporter,
            this.windowAdaptor,
            this.workspaceAdaptor
        );
    }

    private getDiffPresenter(): DiffPresenter {
        this.diffPresenter = this.diffPresenter || this.createDiffPresenter();
        return this.diffPresenter;
    }

    private createDiffPresenter(): DiffPresenter {
        return new DiffPresenter(
            this.selectionInfoRegistry,
            this.normalisationRuleStore,
            this.commandAdaptor,
            this.lastComparisonStore,
            this.getCurrentDate
        );
    }
}
