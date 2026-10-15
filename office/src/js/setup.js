/* ---------------- setup ---------------- */
const byId = id => document.getElementById(id);
const appEl = byId('app'), sceneEl = byId('scene'), camEl = byId('cam'), worldEl = byId('world'), ovlEl = byId('ovl'), sprEl = byId('sprCam');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let C = {};
let holdings = [], prices = [], pfAcct = 'all'; // portfolio data (see renderPortfolio)
function readColors(){ const s = getComputedStyle(document.documentElement); ['muted','ink','ok','warn','danger','accent','surface'].forEach(k => C[k] = s.getPropertyValue('--'+k).trim()); }
readColors();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
new MutationObserver(readColors).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

