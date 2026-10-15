/* ---------------- demo (no connector) ---------------- */
let demoTimer = null;
function demoEvents(){
  const now = new Date().toISOString(); let i = 0; const mk = (agent, kind, message) => ({id:'d'+(i++), agent, kind, message, created_at:now, demo:true});
  const rep = mk('executive','report','Demo: sent 1 to Act now and 1 to Review'); rep._holders = ['inbox','executive']; rep._trays = ['act','review'];
  return [[mk('auditor','start','Demo: checking that everyone ran'), mk('auditor','work','Demo: all agents ran on schedule'), mk('auditor','handoff','Demo: filed the daily check for Iris'), mk('auditor','done','Demo: run finished')],
          [mk('inbox','start','Demo: looking at new mail'), mk('inbox','work','Demo: sorting mail into labels'), mk('inbox','handoff','Demo: filed one for the Executive'), mk('inbox','done','Demo: run finished')],
          [mk('executive','start','Demo: preparing the morning brief'), mk('executive','work','Demo: all agents ran'), rep, mk('executive','deliver','Demo: filed the brief on your desk'), mk('executive','done','Demo: brief done')]];
}
function runDemo(){ resetFloor(); queueRuns(demoEvents()); }
function startDemo(){ if (demo) return; demo = true; applyRegistry(DEMO); $('replay').disabled = false; $('replay').textContent = 'Play demo'; renderStaff([]); renderLog([]); renderDesk([]); renderGoals(); renderBudgets(); runDemo(); clearInterval(demoTimer); demoTimer = setInterval(() => { if (!document.hidden && !runQueue.length && Object.values(agents).every(a => !a.busy())) runDemo(); }, 30000); }
