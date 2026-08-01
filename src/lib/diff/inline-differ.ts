export type InlineSegmentType = 'equal' | 'diff';

export interface InlineSegment {
    type: InlineSegmentType;
    text: string;
}

export interface InlineDiff {
    left: InlineSegment[];
    right: InlineSegment[];
}

type CharOpType = 'equal' | 'delete' | 'insert';

interface CharOp {
    type: CharOpType;
    text: string;
}

// Lines longer than this are reported as wholly changed: the character table
// would cost more than the highlight is worth.
export const MAX_INLINE_LINE_LENGTH = 400;

// An unchanged run shorter than this squeezed between two changed runs is
// absorbed into them, so that "09" -> "10" reads as one change rather than as
// three fragments that happen to share a "0".
const MIN_EQUAL_RUN = 3;

// Two lines are only considered variants of each other above this ratio.
const SIMILARITY_THRESHOLD = 0.6;

export default class InlineDiffer {

    // Character level diff of a pair of changed lines, split into the segments
    // to highlight on each side. Mirrors what VS Code's diff view shows inside
    // a modified line.
    diff(oldLine: string, newLine: string): InlineDiff {
        const a = Array.from(oldLine);
        const b = Array.from(newLine);
        if (!this.isComparable(a, b)) return this.wholeLineDiff(oldLine, newLine);
        const ops = this.absorbShortEqualRuns(this.charOps(a, b));
        return {
            left: this.toSegments(ops, 'delete'),
            right: this.toSegments(ops, 'insert')
        };
    }

    // How much two lines look alike, from 0 (nothing in common) to 1
    // (identical). Leading and trailing whitespace is ignored so that shared
    // indentation does not make unrelated lines look related.
    similarity(oldLine: string, newLine: string): number {
        const a = Array.from(oldLine.trim());
        const b = Array.from(newLine.trim());
        if (!a.length || !b.length || !this.isComparable(a, b)) return 0;
        return 2 * this.lcsLength(a, b) / (a.length + b.length);
    }

    areSimilar(oldLine: string, newLine: string): boolean {
        return this.similarity(oldLine, newLine) >= SIMILARITY_THRESHOLD;
    }

    private isComparable(a: string[], b: string[]): boolean {
        return a.length <= MAX_INLINE_LINE_LENGTH && b.length <= MAX_INLINE_LINE_LENGTH;
    }

    private wholeLineDiff(oldLine: string, newLine: string): InlineDiff {
        return {
            left: oldLine.length ? [{type: 'diff', text: oldLine}] : [],
            right: newLine.length ? [{type: 'diff', text: newLine}] : []
        };
    }

    private lcsLength(a: string[], b: string[]): number {
        const width = b.length + 1;
        let previous = new Int32Array(width);
        let current = new Int32Array(width);
        for (let i = a.length - 1; i >= 0; i--) {
            for (let j = b.length - 1; j >= 0; j--) {
                current[j] = a[i] === b[j]
                    ? previous[j + 1] + 1
                    : Math.max(previous[j], current[j + 1]);
            }
            const swap = previous;
            previous = current;
            current = swap;
            current.fill(0);
        }
        return previous[0];
    }

    private charOps(a: string[], b: string[]): CharOp[] {
        const table = this.buildLcsTable(a, b);
        const width = b.length + 1;
        const ops: CharOp[] = [];
        const push = (type: CharOpType, text: string) => {
            const last = ops[ops.length - 1];
            if (last && last.type === type) last.text += text;
            else ops.push({type, text});
        };
        let i = 0;
        let j = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) {
                push('equal', a[i]);
                i++;
                j++;
            } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
                push('delete', a[i]);
                i++;
            } else {
                push('insert', b[j]);
                j++;
            }
        }
        while (i < a.length) push('delete', a[i++]);
        while (j < b.length) push('insert', b[j++]);
        return ops;
    }

    private buildLcsTable(a: string[], b: string[]): Int32Array {
        const width = b.length + 1;
        const table = new Int32Array((a.length + 1) * width);
        for (let i = a.length - 1; i >= 0; i--) {
            for (let j = b.length - 1; j >= 0; j--) {
                table[i * width + j] = a[i] === b[j]
                    ? table[(i + 1) * width + j + 1] + 1
                    : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
            }
        }
        return table;
    }

    private absorbShortEqualRuns(ops: CharOp[]): CharOp[] {
        let result = ops;
        let index = 1;
        while (index < result.length - 1) {
            const op = result[index];
            const isStranded = op.type === 'equal' &&
                Array.from(op.text).length < MIN_EQUAL_RUN &&
                result[index - 1].type !== 'equal' &&
                result[index + 1].type !== 'equal';
            if (!isStranded) {
                index++;
                continue;
            }
            const replacement: CharOp[] = [{type: 'delete', text: op.text}, {type: 'insert', text: op.text}];
            result = result.slice(0, index).concat(replacement, result.slice(index + 1));
            index = Math.max(1, index - 1);
        }
        return result;
    }

    private toSegments(ops: CharOp[], side: CharOpType): InlineSegment[] {
        const segments: InlineSegment[] = [];
        for (const op of ops) {
            if (op.type !== 'equal' && op.type !== side) continue;
            const type: InlineSegmentType = op.type === 'equal' ? 'equal' : 'diff';
            const last = segments[segments.length - 1];
            if (last && last.type === type) last.text += op.text;
            else segments.push({type, text: op.text});
        }
        return segments;
    }
}
