import ComparisonResultExporter from '../../lib/comparison-result-exporter';
import LineDiffer from '../../lib/diff/line-differ';
import DiffRenderer from '../../lib/diff/diff-renderer';
import InlineDiffer from '../../lib/diff/inline-differ';
import TextProcessRuleApplier from '../../lib/text-process-rule-applier';
import TextTitleBuilder from '../../lib/text-title-builder';
import {SelectionInfo} from '../../lib/types/selection-info';
import {mock, when} from '../helpers';
import * as assert from 'assert';

suite('ComparisonResultExporter', () => {
    const info1: SelectionInfo = {text: 'a\nb', fileName: 'FILE1', lineRanges: []};
    const info2: SelectionInfo = {text: 'a\nB', fileName: 'FILE2', lineRanges: []};

    function createExporter() {
        const textProcessRuleApplier = mock(TextProcessRuleApplier);
        when(textProcessRuleApplier.applyTo('a\nb')).thenReturn('a\nb');
        when(textProcessRuleApplier.applyTo('a\nB')).thenReturn('a\nB');
        return new ComparisonResultExporter(
            new LineDiffer(),
            new DiffRenderer(new InlineDiffer()),
            textProcessRuleApplier,
            new TextTitleBuilder()
        );
    }

    test('it exports the comparison as a unified diff', () => {
        const result = createExporter().export('diff', info1, info2);

        assert.strictEqual(result, [
            '--- FILE1',
            '+++ FILE2',
            '@@ -1,2 +1,2 @@',
            ' a',
            '-b',
            '+B',
            ''
        ].join('\n'));
    });

    test('it exports the comparison as HTML', () => {
        const result = createExporter().export('html', info1, info2);

        assert.ok(result.startsWith('<!DOCTYPE html>'));
        assert.ok(result.includes('<title>FILE1 ↔ FILE2</title>'));
    });

    test('it applies normalisation rules before diffing', () => {
        const textProcessRuleApplier = mock(TextProcessRuleApplier);
        when(textProcessRuleApplier.applyTo('a\nb')).thenReturn('x');
        when(textProcessRuleApplier.applyTo('a\nB')).thenReturn('x');
        const exporter = new ComparisonResultExporter(
            new LineDiffer(),
            new DiffRenderer(new InlineDiffer()),
            textProcessRuleApplier,
            new TextTitleBuilder()
        );

        const result = exporter.export('diff', info1, info2);

        assert.strictEqual(result, '--- FILE1\n+++ FILE2\n');
    });
});
