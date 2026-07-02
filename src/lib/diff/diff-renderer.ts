import {DiffOp} from './line-differ';

interface NumberedLine {
    op: DiffOp;
    oldNo: number;
    newNo: number;
}

interface Hunk {
    start: number;
    end: number;
}

const CONTEXT_LINES = 3;

export default class DiffRenderer {

    toUnifiedDiff(fileName1: string, fileName2: string, ops: DiffOp[]): string {
        const lines = this.numberLines(ops);
        const hunks = this.buildHunks(lines);
        const header = `--- ${fileName1}\n+++ ${fileName2}\n`;
        const body = hunks.map(hunk => this.renderHunk(lines, hunk)).join('');
        return header + body;
    }

    toHtml(title: string, fileName1: string, fileName2: string, ops: DiffOp[]): string {
        const rows = this.numberLines(ops).map(line => this.renderHtmlRow(line)).join('\n');
        return [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '<meta charset="utf-8">',
            `<title>${this.escapeHtml(title)}</title>`,
            `<style>${STYLE}</style>`,
            '</head>',
            '<body>',
            `<h1>${this.escapeHtml(title)}</h1>`,
            '<div class="legend">' +
                `<span class="del">- ${this.escapeHtml(fileName1)}</span>` +
                `<span class="ins">+ ${this.escapeHtml(fileName2)}</span>` +
            '</div>',
            '<table class="diff">',
            '<tbody>',
            rows,
            '</tbody>',
            '</table>',
            '</body>',
            '</html>',
            ''
        ].join('\n');
    }

    private numberLines(ops: DiffOp[]): NumberedLine[] {
        const lines: NumberedLine[] = [];
        let oldNo = 1;
        let newNo = 1;
        for (const op of ops) {
            if (op.type === 'equal') {
                lines.push({op, oldNo, newNo});
                oldNo++;
                newNo++;
            } else if (op.type === 'delete') {
                lines.push({op, oldNo, newNo: -1});
                oldNo++;
            } else {
                lines.push({op, oldNo: -1, newNo});
                newNo++;
            }
        }
        return lines;
    }

    private buildHunks(lines: NumberedLine[]): Hunk[] {
        const hunks: Hunk[] = [];
        lines.forEach((line, index) => {
            if (line.op.type === 'equal') return;
            const start = Math.max(0, index - CONTEXT_LINES);
            const end = Math.min(lines.length - 1, index + CONTEXT_LINES);
            const last = hunks[hunks.length - 1];
            if (last && start <= last.end + 1) {
                last.end = Math.max(last.end, end);
            } else {
                hunks.push({start, end});
            }
        });
        return hunks;
    }

    private renderHunk(lines: NumberedLine[], hunk: Hunk): string {
        const segment = lines.slice(hunk.start, hunk.end + 1);
        const oldLines = segment.filter(line => line.op.type !== 'insert');
        const newLines = segment.filter(line => line.op.type !== 'delete');
        const oldStart = oldLines.length ? oldLines[0].oldNo : 0;
        const newStart = newLines.length ? newLines[0].newNo : 0;
        const header = `@@ -${oldStart},${oldLines.length} +${newStart},${newLines.length} @@\n`;
        const body = segment.map(line => `${this.prefix(line.op.type)}${line.op.text}\n`).join('');
        return header + body;
    }

    private prefix(type: DiffOp['type']): string {
        switch (type) {
            case 'delete':
                return '-';
            case 'insert':
                return '+';
            default:
                return ' ';
        }
    }

    private renderHtmlRow(line: NumberedLine): string {
        const cssClass = line.op.type;
        const oldNo = line.oldNo === -1 ? '' : String(line.oldNo);
        const newNo = line.newNo === -1 ? '' : String(line.newNo);
        return `<tr class="${cssClass}">` +
            `<td class="lineno">${oldNo}</td>` +
            `<td class="lineno">${newNo}</td>` +
            `<td class="marker">${this.prefix(line.op.type)}</td>` +
            `<td class="content">${this.escapeHtml(line.op.text)}</td>` +
            '</tr>';
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

const STYLE = [
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:1rem;color:#24292e;background:#fff;}',
    'h1{font-size:1.1rem;font-weight:600;}',
    '.legend{margin-bottom:0.75rem;font-size:0.85rem;}',
    '.legend span{margin-right:1rem;padding:0.1rem 0.4rem;border-radius:3px;}',
    '.legend .del{background:#ffeef0;color:#b31d28;}',
    '.legend .ins{background:#e6ffed;color:#22863a;}',
    'table.diff{border-collapse:collapse;width:100%;font-family:"SFMono-Regular",Consolas,monospace;font-size:0.85rem;}',
    'table.diff td{padding:0 0.5rem;vertical-align:top;white-space:pre-wrap;}',
    'td.lineno{text-align:right;color:#959da5;user-select:none;width:1%;white-space:nowrap;}',
    'td.marker{text-align:center;user-select:none;width:1%;}',
    'tr.delete{background:#ffeef0;}',
    'tr.delete .marker,tr.delete .content{color:#b31d28;}',
    'tr.insert{background:#e6ffed;}',
    'tr.insert .marker,tr.insert .content{color:#22863a;}'
].join('');
