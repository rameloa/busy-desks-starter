/* ---------------- effects ----------------
   Small bursts drawn on the label layer: a puff when something goes wrong, sparkles when a run is done,
   a ring where an item lands on a desk, and letters flying into the sorting bins. */
const trayFlash = {act:0, review:0, fyi:0};
function burst(kind, x, y, z, n){
  const p = screenOf(x, y, z || 1);
  for (let i = 0; i < (n || 1); i++){
    const e = document.createElement('i'); e.className = 'fx ' + kind; e.style.left = p[0] + 'px'; e.style.top = p[1] + 'px';
    const ang = i/(n || 1)*Math.PI*2; e.style.setProperty('--dx', (kind === 'puff' ? (Math.random()-.5)*30 : Math.cos(ang)*26) + 'px'); e.style.setProperty('--dy', Math.sin(ang)*26 + 'px');
    ovlEl.append(e); setTimeout(() => e.remove(), 1000);
  }
}
function puff(x,y){ burst('puff', x, y, 1.4, 6); }
function sparkle(x,y){ burst('spark', x, y, 1.8, 8); }
function toss(a){
  const p0 = screenOf(a.x, a.y, 1.4), p1 = screenOf(31.5, 28.9, 1.3), cols = ['#16A765','#4A86E8','#FFAD47','#A479E2','#FB4C2F','#2DA2BB'];
  for (let i = 0; i < 6; i++) setTimeout(() => { const e = document.createElement('i'); e.className = 'fx letter'; e.style.background = cols[i];
    e.style.left = p0[0] + 'px'; e.style.top = p0[1] + 'px'; e.style.setProperty('--dx', (p1[0]-p0[0] + (i%3-1)*14) + 'px'); e.style.setProperty('--dy', (p1[1]-p0[1]) + 'px');
    ovlEl.append(e); setTimeout(() => e.remove(), 700); }, i*160/speed);
}

