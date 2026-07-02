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

interface SideCell {
    no: number;
    text: string;
}

type RowKind = 'equal' | 'change' | 'delete' | 'insert';

interface SideRow {
    left: SideCell | null;
    right: SideCell | null;
    kind: RowKind;
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
        const rows = this.buildSideRows(ops);
        const leftRows = rows.map(row => this.renderPaneRow(row, 'left')).join('\n');
        const rightRows = rows.map(row => this.renderPaneRow(row, 'right')).join('\n');
        return [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '<meta charset="utf-8">',
            `<title>${this.escapeHtml(title)}</title>`,
            `<style>${STYLE}</style>`,
            '</head>',
            '<body>',
            `<header><h1>${this.escapeHtml(title)}</h1></header>`,
            '<div class="pane-header">',
            `<div class="pane-title del">- ${this.escapeHtml(fileName1)}</div>`,
            `<div class="pane-title ins">+ ${this.escapeHtml(fileName2)}</div>`,
            '</div>',
            '<div class="pane-wrap">',
            `<div class="pane"><table>${leftRows}</table></div>`,
            `<div class="pane"><table>${rightRows}</table></div>`,
            '</div>',
            `<script>${SCRIPT}</script>`,
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

    private buildSideRows(ops: DiffOp[]): SideRow[] {
        const rows: SideRow[] = [];
        let oldNo = 1;
        let newNo = 1;
        let deletes: SideCell[] = [];
        let inserts: SideCell[] = [];
        const flush = () => {
            const max = Math.max(deletes.length, inserts.length);
            for (let i = 0; i < max; i++) {
                const left = deletes[i] || null;
                const right = inserts[i] || null;
                const kind: RowKind = left && right ? 'change' : left ? 'delete' : 'insert';
                rows.push({left, right, kind});
            }
            deletes = [];
            inserts = [];
        };
        for (const op of ops) {
            if (op.type === 'equal') {
                flush();
                rows.push({left: {no: oldNo, text: op.text}, right: {no: newNo, text: op.text}, kind: 'equal'});
                oldNo++;
                newNo++;
            } else if (op.type === 'delete') {
                deletes.push({no: oldNo, text: op.text});
                oldNo++;
            } else {
                inserts.push({no: newNo, text: op.text});
                newNo++;
            }
        }
        flush();
        return rows;
    }

    private renderPaneRow(row: SideRow, side: 'left' | 'right'): string {
        const cell = side === 'left' ? row.left : row.right;
        const cssClass = this.cellClass(row, cell, side);
        const lineNo = cell ? String(cell.no) : '';
        const content = cell && cell.text.length ? this.escapeHtml(cell.text) : '&#8203;';
        return `<tr class="${cssClass}">` +
            `<td class="lineno">${lineNo}</td>` +
            `<td class="content">${content}</td>` +
            '</tr>';
    }

    private cellClass(row: SideRow, cell: SideCell | null, side: 'left' | 'right'): string {
        if (!cell) return 'empty';
        if (row.kind === 'equal') return 'equal';
        return side === 'left' ? 'del' : 'ins';
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
    'html,body{height:100%;}',
    'body{margin:0;display:flex;flex-direction:column;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'background:#0d1117;color:#c9d1d9;}',
    'header{flex:0 0 auto;padding:0.5rem 1rem;border-bottom:1px solid #21262d;}',
    'h1{font-size:1rem;font-weight:600;margin:0;}',
    '.pane-header{flex:0 0 auto;display:flex;}',
    '.pane-title{flex:1 1 0;min-width:0;padding:0.35rem 0.75rem;',
    'font-family:"SFMono-Regular",Consolas,monospace;font-size:0.8rem;',
    'border-bottom:1px solid #21262d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.pane-title.del{color:#ff7b72;}',
    '.pane-title.ins{color:#3fb950;}',
    '.pane-title+.pane-title{border-left:1px solid #21262d;}',
    '.pane-wrap{flex:1 1 auto;display:flex;min-height:0;}',
    '.pane{flex:1 1 0;min-width:0;overflow:auto;}',
    '.pane+.pane{border-left:1px solid #21262d;}',
    'table{border-collapse:collapse;width:100%;',
    'font-family:"SFMono-Regular",Consolas,monospace;font-size:0.85rem;}',
    'td{padding:0 0.5rem;white-space:pre;vertical-align:top;line-height:1.4;}',
    'td.lineno{text-align:right;color:#6e7681;user-select:none;width:1%;white-space:nowrap;}',
    'tr.del td.content{background:rgba(248,81,73,0.15);color:#ffdcd7;}',
    'tr.ins td.content{background:rgba(63,185,80,0.15);color:#aff5b4;}',
    'tr.empty td{background:rgba(110,118,129,0.08);}'
].join('');

const SCRIPT = [
    '(function(){',
    'var panes=document.querySelectorAll(".pane");var active=null;',
    'panes.forEach(function(p){p.addEventListener("scroll",function(){',
    'if(active&&active!==p)return;active=p;',
    'panes.forEach(function(o){if(o!==p)o.scrollTop=p.scrollTop;});',
    'requestAnimationFrame(function(){active=null;});',
    '});});',
    '})();'
].join('');
