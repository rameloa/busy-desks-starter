/* ---------------- DOM helpers ---------------- */
const $ = id => document.getElementById(id);
const TZ = '{{timezone}}';
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-CA', {timeZone:TZ, hour:'numeric', minute:'2-digit'});
const fmtDay = iso => new Date(iso).toLocaleDateString('en-CA', {timeZone:TZ, month:'short', day:'numeric'});
// A date with no time (due_date, target_date) is a calendar day, the same everywhere: format it as is, never shifted by a zone.
const fmtDate = (ymd, opts = {month:'short', day:'numeric'}) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-CA', {...opts, timeZone:'UTC'});
