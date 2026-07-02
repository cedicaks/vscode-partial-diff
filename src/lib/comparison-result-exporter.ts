import {SelectionInfo} from './types/selection-info';
import LineDiffer from './diff/line-differ';
import DiffRenderer from './diff/diff-renderer';
import TextProcessRuleApplier from './text-process-rule-applier';
import TextTitleBuilder from './text-title-builder';

export type ExportFormat = 'html' | 'diff';

export default class ComparisonResultExporter {

    constructor(private readonly lineDiffer: LineDiffer,
                private readonly diffRenderer: DiffRenderer,
                private readonly textProcessRuleApplier: TextProcessRuleApplier,
                private readonly textTitleBuilder: TextTitleBuilder) {}

    export(format: ExportFormat, info1: SelectionInfo, info2: SelectionInfo): string {
        const title1 = this.textTitleBuilder.build(info1);
        const title2 = this.textTitleBuilder.build(info2);
        const ops = this.lineDiffer.diff(
            this.textProcessRuleApplier.applyTo(info1.text),
            this.textProcessRuleApplier.applyTo(info2.text)
        );
        return format === 'html'
            ? this.diffRenderer.toHtml(`${title1} ↔ ${title2}`, title1, title2, ops)
            : this.diffRenderer.toUnifiedDiff(title1, title2, ops);
    }
}
