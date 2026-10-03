import { generateVillage } from "../../js/world/villagegen.js";
const J = generateVillage(); const g = J.rows.map(r => r.split(''));
const mark = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (g[y] && g[y][x] !== undefined) g[y][x] = c; };
const L = { church: 'C', tavern: 'T', shop: 'S', smithy: 'M' };
for (const o of J.objects) { if (o.boxes) for (const [x0,y0,x1,y1] of o.boxes) for (let y=Math.floor(y0);y<y1;y++) for(let x=Math.floor(x0);x<x1;x++) mark(x,y,L[o.t]||'H'); }
for (const o of J.objects) { const m = { lamp: 'l', tree_0: 't', tree_1: 't', well: 'O', portal: 'P', fence_x: '-', fence_y: '|', bridge: '=', barricade: 'X' }[o.t]; if (m) mark(o.x, o.y, m); }
for (const [k, v] of Object.entries(J.big)) mark(v[0], v[1], 'P');
for (const n of J.npcs) mark(n.x, n.y, n.id[0].toUpperCase() === 'S' ? '$' : '@');
mark(J.start[0], J.start[1], '*');
console.log(g.map(r => r.join('')).join('\n'));
console.log(JSON.stringify(J.gen.buildings), '\n', JSON.stringify(J.gen.fields), '\nWARN', J.gen.warn, '\nobjects', J.objects.length);
