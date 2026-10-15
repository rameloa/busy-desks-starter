/* ---------------- boot ---------------- */
renderStaff([]); renderDesk([]); renderLog([]); renderGoals(); renderBudgets();
(async () => {
  try { mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null; } catch (e) { mcp = null; }
  if (!mcp){ setStatus('demo','Demo'); notice([el('div', null, 'Open this page in claude.ai, signed in as the owner, to watch your real agents. Showing a demo for now.')]); startDemo(); return; }
  setStatus('warn','Connecting'); await load(); schedule();
})();
