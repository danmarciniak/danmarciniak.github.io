// Interactive estimate for the post "Retrospective facial recognition in UK policing: more evidence is needed".
// Kept in its own file because the theme compresses page HTML onto one line, which breaks inline scripts with // comments.
(() => {
"use strict";
// ---------- fixed inputs ----------
const V = 291341;                 // PND facial searches, year to March 2026 (HMICFRS)
const BTP_SEARCHES = 29742, BTP_RESUB = 0.75;
const BTP_REP = BTP_SEARCHES * BTP_RESUB / (1 + BTP_RESUB);  // ≈ 12,747
const NONEMPTY_TODAY = 74, ORIG = 56, STRICT = 14;           // per 100 searches
const R = 1.2 / 32.6;             // share of wrong faces still returned at the stricter setting
// share of look-alikes living within the radius (ONS, population-weighted): top-ranked face, any of 12 faces
const DIST = {10:{top:0.0196,any:0.183}, 25:{top:0.071,any:0.4866}, 50:{top:0.1784,any:0.8123}, 100:{top:0.4387,any:0.9788}};

const POST = {rep:42, susp:96, btp:true, s:50, sameMix:true, e:100, pa:30, pp:0, radius:25, top:true, act:10};
const HIGH = {...POST, pa:50, top:false, act:100/3};
let P = {...POST};

// ---------- model ----------
function model(p){
  const s = p.s/100;
  const afterBtp = V - (p.btp ? BTP_REP : 0);
  const distinct = afterBtp * (1 - p.rep/100);
  const suspects = distinct * p.susp/100;
  const lists = suspects * NONEMPTY_TODAY/100;
  // per 100 searches at the original setting
  const y = Math.max(0, (ORIG - STRICT/s) / (1 - R/s));     // only wrong faces
  const x = R * y;
  const g0 = ORIG - y;                                       // right person on the list
  const g1 = STRICT - x;
  const extra = NONEMPTY_TODAY - ORIG;
  let gT, wT;
  if (p.sameMix){ gT = g0/ORIG*NONEMPTY_TODAY; wT = y/ORIG*NONEMPTY_TODAY; }
  else { gT = g0 + extra*(1 - p.e/100); wT = y + extra*p.e/100; }
  const wrongLists = suspects * wT/100, genLists = suspects * gT/100;
  const pickedA = wrongLists * p.pa/100, pickedP = genLists * p.pp/100;
  const near = p.radius ? (p.top ? DIST[p.radius].top : DIST[p.radius].any) : 1;
  const kept = (pickedA + pickedP) * near;
  const contact = kept * p.act/100;
  return {afterBtp, distinct, suspects, lists, y, x, g0, g1, gT, wT, wrongLists, genLists, pickedA, pickedP, near, kept, contact};
}

// ---------- formatting ----------
function round(n){
  if (!isFinite(n)) return 0;
  const a = Math.abs(n);
  if (a >= 10000) { const m = Math.pow(10, Math.floor(Math.log10(a)) - 2); return Math.round(n/m)*m; }
  if (a >= 100)   { const m = Math.pow(10, Math.floor(Math.log10(a)) - 1); return Math.round(n/m)*m; }
  if (a >= 10)    return Math.round(n);
  return Math.round(n*10)/10;
}
const fmt = n => round(n).toLocaleString("en-GB");
const pct = (n, d=0) => (Math.round(n*Math.pow(10,d))/Math.pow(10,d)).toLocaleString("en-GB") + "%";
function millions(a,b){ return (Math.round(a/1e5)/10).toLocaleString("en-GB") + " to " + (Math.round(b/1e5)/10).toLocaleString("en-GB") + " million"; }

// ---------- controls ----------
const $ = id => document.getElementById(id);
const sliders = ["rep","susp","s","e","pa","pp","act"];
const outFmt = {rep:v=>pct(v), susp:v=>pct(v), s:v=>pct(v), e:v=>pct(v), pa:v=>pct(v), pp:v=>pct(v), act:v=>pct(v,1)};
sliders.forEach(k => $(k).addEventListener("input", ev => { P[k] = +ev.target.value; render(); }));
$("btp").addEventListener("change", ev => { P.btp = ev.target.checked; render(); });
$("sameMix").addEventListener("change", ev => { P.sameMix = ev.target.checked; render(); });
document.querySelectorAll("#radius button").forEach(b => b.addEventListener("click", () => { P.radius = +b.dataset.val; render(); }));
document.querySelectorAll("#topany button").forEach(b => b.addEventListener("click", () => { P.top = b.dataset.val === "top"; render(); }));
document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => { P = {...(b.dataset.preset === "high" ? HIGH : POST)}; render(); }));

// tick marks under sliders
document.querySelectorAll(".marks").forEach(m => {
  const inp = $(m.dataset.for), lo = +inp.min, hi = +inp.max;
  m.dataset.marks.split("|").forEach(t => {
    const [v, label] = t.split(":"); const sp = document.createElement("span");
    sp.style.left = ((+v - lo) / (hi - lo) * 100) + "%"; sp.textContent = v + "% " + label; m.appendChild(sp);
  });
});

function same(a,b){ return Object.keys(POST).every(k => Math.abs((a[k]===true?1:a[k]===false?0:a[k]) - (b[k]===true?1:b[k]===false?0:b[k])) < 1e-9 || (k==="e" && a.sameMix && b.sameMix)); }

// ---------- render ----------
let last = {};
function setV(key, text){
  document.querySelectorAll('[data-v="'+key+'"]').forEach(el => {
    if (el.textContent !== text){ el.textContent = text; if (last[key] !== undefined){ el.classList.remove("changed"); void el.offsetWidth; el.classList.add("changed"); } }
  });
  last[key] = text;
}
function cond(name, on){
  document.querySelectorAll('[data-if="'+name+'"]').forEach(el => el.classList.toggle("hide", !on));
  document.querySelectorAll('[data-ifnot="'+name+'"]').forEach(el => el.classList.toggle("hide", on));
}
function render(){
  // controls reflect state
  sliders.forEach(k => { $(k).value = P[k]; $("o-"+k).textContent = outFmt[k](P[k]); });
  $("btp").checked = P.btp; $("sameMix").checked = P.sameMix;
  $("e-row").style.opacity = P.sameMix ? .4 : 1; $("e").disabled = P.sameMix;
  document.querySelectorAll("#radius button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.val === P.radius));
  document.querySelectorAll("#topany button").forEach(b => b.setAttribute("aria-pressed", (b.dataset.val === "top") === P.top));
  $("topwrap").style.display = P.radius ? "" : "none";

  const m = model(P);
  const isPost = same(P, POST);
  cond("btp", P.btp); cond("sameMix", P.sameMix); cond("ppOn", P.pp > 0); cond("distOn", P.radius > 0); cond("top", P.top); cond("isPost", isPost);

  setV("btpRep", fmt(BTP_REP)); setV("afterBtp", fmt(m.afterBtp));
  setV("repPct", pct(P.rep)); setV("suspPct", pct(P.susp));
  setV("distinct", fmt(m.distinct)); setV("suspects", fmt(m.suspects)); setV("lists", fmt(m.lists));
  setV("faces", millions(m.lists*9, m.lists*15));
  setV("wrongLists", fmt(m.wrongLists)); setV("genLists", fmt(m.genLists));
  setV("sPct", P.s === 50 ? "half" : pct(P.s));
  setV("t_g1", Math.round(m.g1)); setV("t_x", Math.round(m.x)); setV("t_g0", Math.round(m.g0)); setV("t_y", Math.round(m.y));
  setV("t_gT", Math.round(m.gT)); setV("t_wT", Math.round(m.wT)); setV("ePct", pct(P.e));
  setV("range40", fmt(model({...P, s:40}).wrongLists)); setV("range100", fmt(model({...P, s:100}).wrongLists));
  setV("paPct", pct(P.pa)); setV("pickedA", fmt(m.pickedA));
  setV("ppTen", fmt(m.genLists*0.1)); setV("ppPct", pct(P.pp)); setV("pickedP", fmt(m.pickedP));
  if (P.radius){ setV("radius", String(P.radius)); setV("topPct", pct(DIST[P.radius].top*100)); setV("anyPct", pct(DIST[P.radius].any*100)); }
  setV("kept", fmt(m.kept));
  setV("actPct", Math.abs(P.act-10)<1e-9 ? "one in ten" : Math.abs(P.act-100/3)<0.01 ? "one in three" : pct(P.act,1));
  setV("contact", fmt(m.contact));
  setV("highVal", fmt(model({...P, pa:50, top:false, radius:P.radius||25, act:100/3}).contact));

  $("bar-n").textContent = fmt(m.contact);
  const perWeek = m.contact/52;
  $("bar-sub").textContent = (perWeek >= 1 ? "about " + fmt(perWeek) + " a week" : "about one every " + fmt(365/Math.max(m.contact,0.01)) + " days") + (isPost ? " · the post's values" : " · post: about 130");
  $("cap-mode").textContent = isPost ? "the post's cautious values" : "your chosen values";
  drawFunnel(m);
  $("mc-post").textContent = fmt(model(POST).contact);
}

// ---------- funnel chart ----------
function drawFunnel(m){
  const rows = [
    ["All searches", V],
    ["Distinct searches for a suspect", m.suspects],
    ["Return candidates", m.lists],
    ["Right person not on the list", m.wrongLists],
    ["Reviewer accepts a wrong face", m.pickedA + m.pickedP],
    [P.radius ? "Passes the distance check" : "No distance check", m.kept],
    ["Contact on a wrong match", m.contact]
  ];
  const x0 = 250, W = 330, top = 64, step = 48;
  const css = getComputedStyle(document.documentElement);
  let s = '<text x="0" y="22" font-size="15" font-weight="600" fill="var(--ink)">Of ' + V.toLocaleString("en-GB") + ' searches a year, about ' + fmt(m.contact) + ' may end in contact on a wrong match</text>';
  s += '<text x="0" y="42" font-size="11.5" fill="var(--ink2)">' + (same(P,POST) ? "The post's cautious values multiplied through" : "Your chosen values multiplied through") + '</text>';
  rows.forEach((r,i) => {
    const y = top + i*step, w = Math.max(r[1]/V*W, 3), last = i === rows.length-1;
    s += '<text x="0" y="' + (y+19) + '" font-size="13" fill="var(--ink)"' + (last?' font-weight="600"':'') + '>' + r[0] + '</text>';
    s += '<rect x="' + x0 + '" y="' + y + '" width="' + w + '" height="28" rx="4" fill="' + (last ? 'var(--accent)' : 'var(--bar)') + '"><title>' + fmt(r[1]) + ' a year</title></rect>';
    s += '<text x="' + (x0 + w + 8) + '" y="' + (y+19) + '" font-size="13" fill="var(--ink)"' + (last?' font-weight="600"':'') + '>' + (i ? "about " + fmt(r[1]) : r[1].toLocaleString("en-GB")) + '</text>';
  });
  $("funnel").innerHTML = s;
}

// ---------- Monte Carlo ----------
const MC = [
  {k:"rep",  label:"Repeat searches (%)", lo:30, hi:50, min:0, max:60},
  {k:"susp", label:"Searches for suspects (%)", lo:90, hi:100, min:50, max:100},
  {k:"s",    label:"Genuine matches surviving the stricter setting (%)", lo:40, hi:100, min:30, max:100},
  {k:"e",    label:"Extra lists today holding only wrong faces (%)", lo:54, hi:100, min:0, max:100},
  {k:"pa",   label:"Wrong picks, lists without the right person (%)", lo:30, hi:54, min:0, max:100},
  {k:"pp",   label:"Wrong picks, lists with the right person (%)", lo:0, hi:10, min:0, max:100},
  {k:"act",  label:"Wrong leads acted on as evidence (%)", lo:9.4, hi:34, min:0, max:100}
];
const tb = $("mc-rows");
MC.forEach(r => {
  const tr = document.createElement("tr");
  tr.innerHTML = '<td>' + r.label + '</td><td><input type="number" step="any" min="'+r.min+'" max="'+r.max+'" value="'+r.lo+'" data-k="'+r.k+'" data-end="lo" aria-label="'+r.label+' from"></td><td><input type="number" step="any" min="'+r.min+'" max="'+r.max+'" value="'+r.hi+'" data-k="'+r.k+'" data-end="hi" aria-label="'+r.label+' to"></td>';
  tb.appendChild(tr);
});
const GRID = {r:[5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125,130,135,140,145,150],
 top:[0.006,0.0196,0.0356,0.053,0.071,0.0907,0.1109,0.133,0.1552,0.1784,0.2012,0.2251,0.2502,0.2763,0.3023,0.3287,0.3561,0.3836,0.4112,0.4387,0.4665,0.4943,0.5225,0.5476,0.5701,0.5934,0.6169,0.6409,0.6659,0.6901],
 any:[0.0658,0.183,0.2899,0.3934,0.4866,0.5747,0.6482,0.7138,0.7682,0.8123,0.8473,0.8768,0.9018,0.9196,0.9351,0.9472,0.9581,0.9674,0.9735,0.9788,0.9839,0.9871,0.9899,0.9915,0.9929,0.994,0.9953,0.9961,0.9967,0.9974]};
function gridShare(radius, key){
  const r = Math.min(150, Math.max(5, radius)), j = Math.min(GRID.r.length-2, Math.floor((r-5)/5)), t = (r - GRID.r[j])/5;
  return GRID[key][j]*(1-t) + GRID[key][j+1]*t;
}
[["rad","Distance radius (miles)",10,50,5,150],["none","Investigators doing no distance check (%)",0,0,0,100]].forEach(([k,label,lo,hi,min,max]) => {
  const tr = document.createElement("tr");
  tr.innerHTML = '<td>' + label + '</td><td><input type="number" step="any" min="'+min+'" max="'+max+'" value="'+lo+'" data-k="'+k+'" data-end="lo" aria-label="'+label+' from"></td><td><input type="number" step="any" min="'+min+'" max="'+max+'" value="'+hi+'" data-k="'+k+'" data-end="hi" aria-label="'+label+' to"></td>';
  tb.appendChild(tr);
});
const trf = document.createElement("tr");
trf.innerHTML = '<td>Faces investigators consider</td><td colspan="2"><select id="mc-faces" style="font:inherit;font-size:.85rem;padding:3px;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--ink)"><option value="top">only the top-ranked face</option><option value="between" selected>somewhere between top face and any face</option><option value="any">any face on the list</option></select></td>';
tb.appendChild(trf);
$("mc-btp").checked = true;

let lastRun = null, histScale = "linear";
$("mc-run").addEventListener("click", () => {
  const rng = {};
  tb.querySelectorAll("input").forEach(i => { (rng[i.dataset.k] = rng[i.dataset.k] || {})[i.dataset.end] = Math.min(+i.max, Math.max(+i.min, +i.value)); });
  Object.values(rng).forEach(r => { if (r.lo > r.hi) [r.lo, r.hi] = [r.hi, r.lo]; });
  const faces = $("mc-faces").value;
  const N = 10000, out = new Float64Array(N);
  const u = (r) => r.lo + Math.random()*(r.hi - r.lo);
  for (let i = 0; i < N; i++){
    const p = {btp: $("mc-btp").checked, sameMix:false, radius:0, top:true,
      rep:u(rng.rep), susp:u(rng.susp), s:Math.max(30,u(rng.s)), e:u(rng.e), pa:u(rng.pa), pp:u(rng.pp), act:u(rng.act)};
    const m = model(p);
    const rad = u(rng.rad), tp = gridShare(rad, "top"), an = gridShare(rad, "any");
    const share = faces === "top" ? tp : faces === "any" ? an : tp + Math.random()*(an - tp);
    const none = u(rng.none)/100;
    const near = none + (1 - none)*share;
    out[i] = (m.pickedA + m.pickedP) * near * p.act/100;
  }
  const sorted = Array.from(out).sort((a,b)=>a-b), q = f => sorted[Math.floor(f*(N-1))];
  $("mc-med").textContent = fmt(q(.5));
  $("mc-int").textContent = fmt(q(.05)) + " to " + fmt(q(.95));
  $("mc-out").classList.remove("hide");
  lastRun = {sorted, med:q(.5)};
  drawHist();
});
document.querySelectorAll("#mc-scale button").forEach(b => b.addEventListener("click", () => { histScale = b.dataset.val; drawHist(); }));

function niceStep(range, n){ const raw = range/n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw/p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10)*p; }
function drawHist(){
  if (!lastRun) return;
  document.querySelectorAll("#mc-scale button").forEach(b => b.setAttribute("aria-pressed", b.dataset.val === histScale));
  const {sorted, med} = lastRun, N = sorted.length, pm = model(POST).contact;
  const W = 640, H = 190, x0 = 30, y0 = 34;
  let s = '', X, bins, nb, ticks = [], note = '';
  if (histScale === "log"){
    const lo = Math.log10(Math.max(1, Math.min(sorted[0], pm*0.8))), hi = Math.log10(Math.max(10, sorted[N-1]));
    const a = Math.floor(lo*4)/4, b = Math.ceil(hi*4)/4; nb = Math.max(8, Math.round((b-a)*8));
    bins = new Array(nb).fill(0);
    sorted.forEach(v => { const t = (Math.log10(Math.max(1,v)) - a)/(b-a); bins[Math.min(nb-1, Math.max(0, Math.floor(t*nb)))]++; });
    X = v => x0 + (Math.log10(Math.max(1,v)) - a)/(b-a)*W;
    [1,10,100,1000,10000,100000].forEach(t => { if (Math.log10(t) >= a-1e-9 && Math.log10(t) <= b+1e-9) ticks.push(t); });
  } else {
    const cap = sorted[Math.floor(0.99*(N-1))], step = niceStep(cap, 30), top = Math.ceil(cap/step)*step;
    nb = Math.round(top/step); bins = new Array(nb).fill(0); let over = 0;
    sorted.forEach(v => { if (v >= top) over++; else bins[Math.floor(v/step)]++; });
    X = v => x0 + Math.min(v, top)/top*W;
    const ts = niceStep(top, 5); for (let t = 0; t <= top + 1e-9; t += ts) ticks.push(t);
    if (over) note = over.toLocaleString("en-GB") + " draws above " + fmt(top) + " not shown";
  }
  const mx = Math.max(...bins), bw = W/nb;
  bins.forEach((c,i) => { const h = c/mx*H; s += '<rect x="'+(x0+i*bw+0.5)+'" y="'+(y0+H-h)+'" width="'+Math.max(bw-1,1)+'" height="'+h+'" rx="1.5" fill="var(--bar)"><title>'+c+' draws</title></rect>'; });
  s += '<line x1="'+x0+'" x2="'+(x0+W)+'" y1="'+(y0+H)+'" y2="'+(y0+H)+'" stroke="var(--muted)"/>';
  ticks.forEach(t => { s += '<text x="'+X(t)+'" y="'+(y0+H+18)+'" font-size="12" text-anchor="middle" fill="var(--ink2)">'+t.toLocaleString("en-GB")+'</text>'; });
  const xm = X(med), xp = X(pm);
  s += '<line x1="'+xm+'" x2="'+xm+'" y1="'+(y0-6)+'" y2="'+(y0+H)+'" stroke="var(--accent)" stroke-width="2"/><text x="'+(xm+5)+'" y="'+(y0-8)+'" font-size="12" fill="var(--accent)">median '+fmt(med)+'</text>';
  s += '<line x1="'+xp+'" x2="'+xp+'" y1="'+(y0+12)+'" y2="'+(y0+H)+'" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="'+(xp+5)+'" y="'+(y0+12)+'" font-size="12" fill="var(--ink2)">post '+fmt(pm)+'</text>';
  if (note) s += '<text x="'+(x0+W)+'" y="'+(y0+H+36)+'" font-size="11.5" text-anchor="end" fill="var(--ink2)">'+note+'</text>';
  $("mc-hist").innerHTML = s;
  $("mc-scale-note").textContent = "log scale: each labelled step along the axis is ten times the last"; $("mc-scale-note-wrap").style.display = histScale === "log" ? "" : "none";
}

render();
})();
