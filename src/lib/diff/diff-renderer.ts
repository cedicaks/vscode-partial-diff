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

export interface DiffSummary {
    added: number;
    removed: number;
    modified: number;
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

    summarize(ops: DiffOp[]): DiffSummary {
        const rows = this.buildSideRows(ops);
        return {
            added: rows.filter(row => row.kind === 'insert').length,
            removed: rows.filter(row => row.kind === 'delete').length,
            modified: rows.filter(row => row.kind === 'change').length
        };
    }

    toHtml(title: string, fileName1: string, fileName2: string, ops: DiffOp[]): string {
        const rows = this.buildSideRows(ops);
        const leftRows = rows.map(row => this.renderPaneRow(row, 'left')).join('\n');
        const rightRows = rows.map(row => this.renderPaneRow(row, 'right')).join('\n');
        const markers = this.renderRulerMarkers(rows);
        const summary = this.summarize(ops);
        return [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '<meta charset="utf-8">',
            `<title>${this.escapeHtml(title)}</title>`,
            `<style>${STYLE}</style>`,
            '</head>',
            '<body>',
            '<!-- =====================================================================',
            '     RENAME THE COMPARED FILES',
            '     Edit the "left" and "right" values in the script block below,',
            '     then save this file and reopen it. That is the only place the two',
            '     names need to be changed - the title and column headers update from it.',
            '     ===================================================================== -->',
            '<script>',
            `window.partialDiffFiles = {left: ${this.jsString(fileName1)}, right: ${this.jsString(fileName2)}};`,
            '</script>',
            '<header><h1 class="diff-title"></h1></header>',
            '<div class="pane-header">',
            '<div class="pane-title del" data-side="left"></div>',
            '<div class="pane-title ins" data-side="right"></div>',
            '<div class="ruler-spacer"></div>',
            '</div>',
            '<div class="diff-body">',
            '<div class="panes">',
            `<div class="pane" data-side="left"><table>${leftRows}</table></div>`,
            `<div class="pane" data-side="right"><table>${rightRows}</table></div>`,
            '</div>',
            `<div class="ruler">${markers}<div class="thumb"></div></div>`,
            '</div>',
            this.renderSummary(summary),
            `<script>${NAMES_SCRIPT}${SCRIPT}</script>`,
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
        return `<tr class="${cssClass}" data-kind="${row.kind}">` +
            `<td class="lineno">${lineNo}</td>` +
            `<td class="content">${content}</td>` +
            '</tr>';
    }

    private cellClass(row: SideRow, cell: SideCell | null, side: 'left' | 'right'): string {
        if (!cell) return 'empty';
        if (row.kind === 'equal') return 'equal';
        return side === 'left' ? 'del' : 'ins';
    }

    private renderRulerMarkers(rows: SideRow[]): string {
        const total = rows.length || 1;
        return rows
            .map((row, index) => {
                if (row.kind === 'equal') return '';
                const top = (index / total * 100).toFixed(3);
                return `<div class="marker ${this.markerClass(row.kind)}" style="top:${top}%"></div>`;
            })
            .join('');
    }

    private markerClass(kind: RowKind): string {
        switch (kind) {
            case 'insert':
                return 'add';
            case 'delete':
                return 'del';
            default:
                return 'mod';
        }
    }

    private renderSummary(summary: DiffSummary): string {
        return '<footer class="summary">' +
            '<span class="summary-title">Summary of differences</span>' +
            `<span class="stat added"><b>${summary.added}</b> added</span>` +
            `<span class="stat removed"><b>${summary.removed}</b> removed</span>` +
            `<span class="stat modified"><b>${summary.modified}</b> modified</span>` +
            '<span class="controls">' +
            '<label class="control"><input type="checkbox" id="pd-only-diffs"> Show only differences</label>' +
            '<button type="button" id="pd-swap" class="control-btn">Swap</button>' +
            '</span>' +
            '</footer>';
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Produce a safe JavaScript string literal (also neutralises `</script>`).
    private jsString(value: string): string {
        return JSON.stringify(value).replace(/</g, '\\u003c');
    }
}

const RULER_WIDTH = 42;
const HSCROLL_HEIGHT = 14;

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
    '.pane-title[data-side=left]{color:#ff7b72;}',
    '.pane-title[data-side=left]::before{content:"- ";}',
    '.pane-title[data-side=right]{color:#3fb950;}',
    '.pane-title[data-side=right]::before{content:"+ ";}',
    '.pane-title[data-side=right]{border-left:1px solid #21262d;}',
    `.ruler-spacer{flex:0 0 ${RULER_WIDTH}px;border-bottom:1px solid #21262d;}`,
    '.diff-body{flex:1 1 auto;display:flex;min-height:0;}',
    '.panes{flex:1 1 auto;display:flex;min-width:0;overflow:hidden;}',
    '.pane{flex:1 1 0;min-width:0;height:100%;overflow-x:scroll;overflow-y:auto;}',
    '.pane[data-side=right]{border-left:1px solid #21262d;}',
    // Swap: reorder the two sides and flip their colours / signs / dividers.
    '.swapped .pane[data-side=left],.swapped .pane-title[data-side=left]{order:2;}',
    '.swapped .pane[data-side=right],.swapped .pane-title[data-side=right]{order:1;}',
    '.swapped .pane[data-side=right],.swapped .pane-title[data-side=right]{border-left:none;}',
    '.swapped .pane[data-side=left],.swapped .pane-title[data-side=left]{border-left:1px solid #21262d;}',
    '.swapped .pane-title[data-side=left]{color:#3fb950;}',
    '.swapped .pane-title[data-side=left]::before{content:"+ ";}',
    '.swapped .pane-title[data-side=right]{color:#ff7b72;}',
    '.swapped .pane-title[data-side=right]::before{content:"- ";}',
    // Hide each pane\'s vertical scrollbar (the ruler replaces it) but always
    // show a dark-themed horizontal scrollbar pinned at the bottom of the pane.
    `.pane::-webkit-scrollbar{width:0;height:${HSCROLL_HEIGHT}px;}`,
    '.pane::-webkit-scrollbar:vertical{display:none;}',
    '.pane::-webkit-scrollbar-track{background:#161b22;}',
    '.pane::-webkit-scrollbar-thumb{background:rgba(110,118,129,0.5);',
    'border-radius:7px;border:3px solid #161b22;}',
    '.pane::-webkit-scrollbar-thumb:hover{background:rgba(110,118,129,0.7);}',
    '.pane{scrollbar-color:rgba(110,118,129,0.5) #161b22;}',
    'table{border-collapse:collapse;width:100%;',
    'font-family:"SFMono-Regular",Consolas,monospace;font-size:0.85rem;}',
    'td{padding:0 0.5rem;white-space:pre;vertical-align:top;line-height:1.4;}',
    'td.lineno{text-align:right;color:#6e7681;user-select:none;width:1%;white-space:nowrap;}',
    'tr.del td.content{background:rgba(248,81,73,0.15);color:#ffdcd7;}',
    'tr.ins td.content{background:rgba(63,185,80,0.15);color:#aff5b4;}',
    'tr.empty td{background:rgba(110,118,129,0.08);}',
    // Swap: removals become additions and vice versa.
    '.swapped tr.del td.content{background:rgba(63,185,80,0.15);color:#aff5b4;}',
    '.swapped tr.ins td.content{background:rgba(248,81,73,0.15);color:#ffdcd7;}',
    // Separator between blocks in "show only differences" mode: a thick line
    // with a bit of breathing room above (block-end) and below (block-start).
    'tr.block-start td{border-top:3px solid #484f58;padding-top:0.5rem;}',
    'tr.block-end td{padding-bottom:0.5rem;}',
    `.ruler{flex:0 0 ${RULER_WIDTH}px;position:relative;background:#161b22;`,
    'border-left:1px solid #21262d;cursor:pointer;}',
    '.ruler .marker{position:absolute;left:4px;right:4px;height:3px;border-radius:1px;}',
    '.ruler .marker.add{background:#3fb950;}',
    '.ruler .marker.del{background:#f85149;}',
    '.ruler .marker.mod{background:#d29922;}',
    '.swapped .ruler .marker.add{background:#f85149;}',
    '.swapped .ruler .marker.del{background:#3fb950;}',
    '.ruler .thumb{position:absolute;left:3px;right:3px;top:0;height:0;',
    'background:rgba(110,118,129,0.5);border-radius:4px;}',
    '.ruler:hover .thumb{background:rgba(110,118,129,0.7);}',
    '.summary{flex:0 0 auto;display:flex;align-items:center;gap:1.25rem;',
    'padding:0.6rem 1rem;border-top:1px solid #21262d;background:#161b22;font-size:0.85rem;}',
    '.summary-title{font-weight:600;margin-right:0.5rem;}',
    '.stat{display:inline-flex;align-items:center;gap:0.35rem;}',
    '.stat::before{content:"";width:0.7rem;height:0.7rem;border-radius:50%;display:inline-block;}',
    '.stat b{font-variant-numeric:tabular-nums;}',
    '.stat.added::before{background:#3fb950;}',
    '.stat.removed::before{background:#f85149;}',
    '.stat.modified::before{background:#d29922;}',
    '.controls{margin-left:auto;display:flex;align-items:center;gap:1rem;}',
    '.control{display:inline-flex;align-items:center;gap:0.4rem;cursor:pointer;user-select:none;}',
    '.control input{cursor:pointer;margin:0;}',
    '.control-btn{background:#21262d;color:#c9d1d9;border:1px solid #30363d;',
    'border-radius:5px;padding:0.25rem 0.75rem;cursor:pointer;font:inherit;}',
    '.control-btn:hover{background:#30363d;}',
    '.control-btn:active{background:#3c444d;}'
].join('');

const NAMES_SCRIPT = [
    '(function(){',
    'var f=window.partialDiffFiles||{left:"",right:""};',
    'var title=f.left+" \\u2194 "+f.right;',
    'document.title=title;',
    'var h=document.querySelector(".diff-title");if(h)h.textContent=title;',
    'var l=document.querySelector(".pane-title[data-side=left]");if(l)l.textContent=f.left;',
    'var r=document.querySelector(".pane-title[data-side=right]");if(r)r.textContent=f.right;',
    '})();'
].join('');

const SCRIPT = [
    '(function(){',
    'var CTX=3;',
    'var panes=[].slice.call(document.querySelectorAll(".pane"));',
    'if(!panes.length)return;',
    'var ruler=document.querySelector(".ruler");',
    'var thumb=ruler&&ruler.querySelector(".thumb");',
    'var ref=panes[0];var active=null;',
    'var rows=panes.map(function(p){return [].slice.call(p.querySelectorAll("tr"));});',
    'function update(){',
    'if(!ruler||!thumb)return;',
    'var sh=ref.scrollHeight,ch=ref.clientHeight,rh=ruler.clientHeight;',
    'var th=ch>=sh?rh:Math.max(20,ch/sh*rh);',
    'thumb.style.height=th+"px";',
    'thumb.style.top=(sh>ch?ref.scrollTop/(sh-ch)*(rh-th):0)+"px";',
    '}',
    'function onScroll(p){',
    'if(active&&active!==p)return;active=p;',
    'panes.forEach(function(o){if(o!==p)o.scrollTop=p.scrollTop;});',
    'update();requestAnimationFrame(function(){active=null;});',
    '}',
    'panes.forEach(function(p){p.addEventListener("scroll",function(){onScroll(p);});});',
    'if(ruler){',
    'var scrollToY=function(y){',
    'var rect=ruler.getBoundingClientRect();',
    'var ratio=Math.max(0,Math.min(1,(y-rect.top)/rect.height));',
    'var top=ratio*(ref.scrollHeight-ref.clientHeight);',
    'panes.forEach(function(p){p.scrollTop=top;});update();',
    '};',
    'var dragging=false;',
    'ruler.addEventListener("mousedown",function(e){dragging=true;scrollToY(e.clientY);e.preventDefault();});',
    'window.addEventListener("mousemove",function(e){if(dragging)scrollToY(e.clientY);});',
    'window.addEventListener("mouseup",function(){dragging=false;});',
    '}',
    'window.addEventListener("resize",update);',
    // "Show only differences": keep changed rows plus CTX context lines, hide
    // the rest, and mark the first row of each surviving block for a separator.
    'var only=document.getElementById("pd-only-diffs");',
    'function applyCollapse(){',
    'var show=only&&only.checked;var n=rows[0].length;var vis=new Array(n);var i,j;',
    'for(i=0;i<n;i++)vis[i]=!show;',
    'if(show){for(i=0;i<n;i++){if(rows[0][i].getAttribute("data-kind")!=="equal"){',
    'var s=Math.max(0,i-CTX),e=Math.min(n-1,i+CTX);for(j=s;j<=e;j++)vis[j]=true;}}}',
    'var seen=false,prev=false;',
    'for(i=0;i<n;i++){var v=vis[i];',
    'var start=show&&v&&!prev&&seen;',
    'var end=show&&v&&(i+1<n&&!vis[i+1]);',
    '(function(idx,visible,isStart,isEnd){rows.forEach(function(list){var tr=list[idx];',
    'tr.style.display=visible?"":"none";',
    'tr.classList.toggle("block-start",!!isStart);',
    'tr.classList.toggle("block-end",!!isEnd);});})(i,v,start,end);',
    'if(v)seen=true;prev=v;}',
    'update();',
    '}',
    'if(only)only.addEventListener("change",applyCollapse);',
    // "Swap": flip sides (CSS) and swap the added/removed counts.
    'var swapBtn=document.getElementById("pd-swap");',
    'function swapCounts(){var a=document.querySelector(".stat.added b");',
    'var r=document.querySelector(".stat.removed b");',
    'if(a&&r){var t=a.textContent;a.textContent=r.textContent;r.textContent=t;}}',
    'if(swapBtn)swapBtn.addEventListener("click",function(){',
    'document.body.classList.toggle("swapped");swapCounts();update();});',
    'update();',
    '})();'
].join('');
