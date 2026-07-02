export type DiffOpType = 'equal' | 'delete' | 'insert';

export interface DiffOp {
    type: DiffOpType;
    text: string;
}

export default class LineDiffer {

    diff(oldText: string, newText: string): DiffOp[] {
        const a = this.splitLines(oldText);
        const b = this.splitLines(newText);
        const lcsLengths = this.buildLcsTable(a, b);
        return this.backtrack(a, b, lcsLengths);
    }

    private splitLines(text: string): string[] {
        return text.split('\n');
    }

    private buildLcsTable(a: string[], b: string[]): number[][] {
        const n = a.length;
        const m = b.length;
        const table: number[][] = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                table[i][j] = a[i] === b[j]
                    ? table[i + 1][j + 1] + 1
                    : Math.max(table[i + 1][j], table[i][j + 1]);
            }
        }
        return table;
    }

    private backtrack(a: string[], b: string[], table: number[][]): DiffOp[] {
        const ops: DiffOp[] = [];
        let i = 0;
        let j = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) {
                ops.push({type: 'equal', text: a[i]});
                i++;
                j++;
            } else if (table[i + 1][j] >= table[i][j + 1]) {
                ops.push({type: 'delete', text: a[i]});
                i++;
            } else {
                ops.push({type: 'insert', text: b[j]});
                j++;
            }
        }
        while (i < a.length) {
            ops.push({type: 'delete', text: a[i]});
            i++;
        }
        while (j < b.length) {
            ops.push({type: 'insert', text: b[j]});
            j++;
        }
        return ops;
    }
}
