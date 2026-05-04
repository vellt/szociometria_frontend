import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

const API = "https://nodejs119.dszcbaross.edu.hu/api";

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700;800;900&family=Roboto:wght@400;500;700&display=swap";

const QUESTIONS = [
  { id: 1, text: "Kikkel vagy barátságban az osztályban?", type: "positive", core: true, area: "rokonszenv" },
  { id: 2, text: "Kik a legjobb tanulók az osztályban?", type: "positive", core: false, area: "tanulmányi" },
  { id: 3, text: "Viselkedésükkel, humorukkal kik tudják megnevettetni az osztályt?", type: "positive", core: false, area: "közösségi szerep" },
  { id: 4, text: "Kiket fegyelmeznek legtöbbször a tanárok?", type: "negative", core: false, area: "pedagógiai figyelem" },
  { id: 5, text: "Osztálykirándulásra utazván vonaton, kikkel lennél legszívesebben egy fülkében?", type: "positive", core: true, area: "rokonszenv" },
  { id: 6, text: "Kik azok, akiket a tanárok leginkább kedvelnek?", type: "positive", core: false, area: "tanári megítélés" },
  { id: 7, text: "Ha volna egy titkod, társaid közül ki(k)re bízhatnád?", type: "positive", core: true, area: "bizalom" },
  { id: 8, text: "Egy osztálykarácsonyi műsort kik tudnák legjobban megszervezni?", type: "positive", core: false, area: "szervezés" },
  { id: 9, text: "Kik a legügyesebbek valamilyen sportágban?", type: "positive", core: false, area: "sport" },
  { id: 10, text: "Kik a leggyengébb tanulók az osztályban?", type: "negative", core: false, area: "pedagógiai figyelem" },
  { id: 11, text: "Kik azok a fiúk, akik a legjobbak a lányoknál?", type: "positive", core: false, area: "népszerűség" },
  { id: 12, text: "Kik azok a lányok, akik a legjobbak a fiúknál?", type: "positive", core: false, area: "népszerűség" },
  { id: 13, text: "Ha egy iskolai órán a tanár(nő) nem tud bent lenni, ki(ke)t bízhatna meg a helyettesítésével?", type: "positive", core: false, area: "felelősség" },
  { id: 14, text: "Ha születésnapi bulit rendeznél, kiket hívnál meg legszívesebben?", type: "positive", core: true, area: "rokonszenv" },
  { id: 15, text: "Kik azok a társaid, akiket az osztályból a legtöbben kedvelnek?", type: "positive", core: false, area: "népszerűség" },
  { id: 16, text: "Kinek vannak a legjobb holmijai (öltözék, felszerelés)?", type: "positive", core: false, area: "presztízs" },
  { id: 17, text: "Kik azok a társaid, akiket az osztályból a legkevésbé kedvelnek?", type: "negative", core: false, area: "pedagógiai figyelem" },
  { id: 18, text: "Kik azok, akiknek gondolkodását, viselkedését sokan követik?", type: "positive", core: false, area: "követett minta" },
  { id: 19, text: "Egy műveltségi vetélkedőn ki képviselhetné legjobban az osztályt?", type: "positive", core: false, area: "tanulmányi" },
  { id: 20, text: "Kiről gondolod, hogy jól érvényesül majd az életben?", type: "positive", core: false, area: "jövőkép" },
];

const CORE_IDS = QUESTIONS.filter(q => q.core).map(q => q.id);
const NEGATIVE_IDS = QUESTIONS.filter(q => q.type === "negative").map(q => q.id);

const initials = (s = "") =>
  String(s).replace(/[^A-ZÁÉÍÓÖŐÚÜŰ0-9]/gi, "").slice(0, 3).toUpperCase() || "??";

const displayName = st => st?.name || st?.code || "";

const pct = (part, whole) => whole ? Math.round((part / whole) * 100) : 0;

const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const stdDev = arr => {
  if (!arr.length) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
};

const zScore = (value, m, sd) => sd > 0 ? (value - m) / sd : 0;

const fmt = n => Number.isFinite(n) ? n.toFixed(2) : "0.00";

function normLevel(z) {
  if (z >= 1.25) return "magas";
  if (z >= 0.5) return "átlag feletti";
  if (z <= -1.25) return "alacsony";
  if (z <= -0.5) return "átlag alatti";
  return "átlagos";
}

function professionalSignal(row) {
  const notes = [];
  if (row.mutual === 0) notes.push("nincs kölcsönös rokonszenvi kapcsolat — tanári megfigyelést igényel");
  else if (row.mutual === 1) notes.push("kevés kölcsönös kapcsolat — kapcsolati támogatás javasolt");
  if (row.posZ >= 1.25 || row.mutualZ >= 1.25) notes.push("sok pozitív/kölcsönös jelölés — közösségi erőforrás lehet");
  if (row.negZ >= 1.25) notes.push("magas negatív jelölésszám — kontextusos értelmezést igényel");
  if (row.bridgeScore >= 2) notes.push("összekötő szerep lehetséges több alcsoport között");
  return notes.length ? notes.join("; ") : "nem kiugró jelzés";
}

const GLOBAL_CSS = `
  :root {
    --bg: #f6f8fc;
    --surface: #ffffff;
    --surface-soft: #f8fafd;
    --border: #e3e7ee;
    --border-strong: #d7dde8;
    --text: #18202f;
    --muted: #657083;
    --muted-2: #8a94a6;
    --blue: #2563eb;
    --blue-dark: #1d4ed8;
    --blue-soft: #eaf1ff;
    --green: #16a34a;
    --green-soft: #eaf8ef;
    --red: #dc2626;
    --red-soft: #fff0ee;
    --amber: #b45309;
    --amber-soft: #fffbeb;
    --pink-soft: #fff0f7;
    --shadow-sm: 0 1px 2px rgba(16, 24, 40, .06);
    --shadow-md: 0 10px 28px rgba(16, 24, 40, .10);
    --shadow-lg: 0 24px 70px rgba(37, 99, 235, .14);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Roboto', Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  button, input, select { font-family: 'Google Sans', 'Roboto', Arial, sans-serif; }

  .landing-wrap {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(420px, .92fr);
    gap: 24px;
    padding: 24px;
    background:
      radial-gradient(circle at 12% 12%, rgba(37, 99, 235, .10), transparent 30%),
      radial-gradient(circle at 90% 92%, rgba(22, 163, 74, .08), transparent 28%),
      #f6f8fc;
  }
  @media (max-width: 960px) {
    .landing-wrap { grid-template-columns: 1fr; padding: 14px; }
  }
  .landing-left {
    position: relative;
    overflow: hidden;
    border-radius: 34px;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.96));
    border: 1px solid #e3e7ee;
    box-shadow: 0 24px 70px rgba(15, 23, 42, .10);
    padding: clamp(24px, 4vw, 48px);
    display: grid;
    grid-template-rows: auto minmax(280px, 1fr);
    gap: 34px;
  }
  .landing-left::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(37,99,235,.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37,99,235,.035) 1px, transparent 1px);
    background-size: 36px 36px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,.65), transparent 64%);
    pointer-events: none;
  }
  .hero-copy { position: relative; z-index: 2; max-width: 660px; }
  .hero-kicker {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #eef4ff;
    border: 1px solid #dbe7ff;
    color: #1d4ed8;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 22px;
  }
  .hero-kicker-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #2563eb;
    box-shadow: 0 0 0 4px rgba(37,99,235,.14);
  }
  .hero-title {
    font-family: 'Google Sans', 'Roboto', sans-serif;
    font-size: clamp(3rem, 6vw, 6rem);
    line-height: .94;
    letter-spacing: -.075em;
    color: #111827;
    font-weight: 900;
    max-width: 760px;
  }
  .hero-panel {
    position: relative;
    z-index: 2;
    align-self: end;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 28px;
    box-shadow: 0 18px 50px rgba(15, 23, 42, .10);
    overflow: hidden;
  }
  .hero-panel-header {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 18px 20px; border-bottom: 1px solid #edf2f7;
  }
  .hero-panel-header strong { display: block; margin-top: 3px; font-size: 18px; color: #111827; }
  .hero-panel-eyebrow {
    color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
  }
  .hero-panel-stat {
    padding: 8px 12px; border-radius: 14px; background: #f8fafd; border: 1px solid #e2e8f0;
    color: #64748b; font-size: 12px; font-weight: 800; white-space: nowrap;
  }
  .hero-panel-stat span { color: #2563eb; font-size: 18px; margin-right: 4px; }
  .hero-graph-wrap {
    height: clamp(280px, 34vh, 380px);
    background:
      radial-gradient(circle at 28% 20%, rgba(37,99,235,.08), transparent 30%),
      radial-gradient(circle at 78% 78%, rgba(22,163,74,.07), transparent 28%),
      #ffffff;
  }
  .hero-graph-canvas { display: block; width: 100%; height: 100%; }
  .hero-panel-footer {
    display: flex; flex-wrap: wrap; gap: 14px; padding: 14px 20px 16px; border-top: 1px solid #edf2f7;
    color: #64748b; font-size: 12px; font-weight: 800;
  }
  .legend-dot { display: inline-block; width: 9px; height: 9px; border-radius: 999px; margin-right: 6px; }
  .legend-dot.blue { background: #2563eb; }
  .legend-dot.green { background: #16a34a; }
  .legend-dot.red { background: #ef4444; }

  .landing-right { display: flex; align-items: center; justify-content: center; overflow-y: auto; }
  .landing-right-inner {
    width: 100%; max-width: 560px; background: #fff; border: 1px solid #e3e7ee;
    border-radius: 32px; box-shadow: 0 18px 48px rgba(15, 23, 42, .08); padding: 30px;
  }
  .landing-badge {
    display: inline-flex; align-items: center; gap: 8px; background: #eef4ff; color: #1d4ed8;
    border: 1px solid #dbe7ff; font-size: 12px; font-weight: 800; padding: 7px 12px; border-radius: 999px; margin-bottom: 18px;
  }
  .landing-title {
    color: #111827; font-family: 'Google Sans', 'Roboto', sans-serif; font-size: clamp(2rem, 4vw, 3.1rem);
    font-weight: 900; letter-spacing: -.055em; line-height: 1.04; margin-bottom: 10px;
  }
  .landing-title em { color: #2563eb; font-style: normal; }
  .landing-sub { color: #64748b; font-size: 15px; line-height: 1.65; margin-bottom: 22px; }
  .student-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px;
    margin-bottom: 20px; max-height: 380px; overflow-y: auto; padding: 2px 4px 2px 2px;
  }
  .student-btn {
    background: #fff; border: 1px solid var(--border); border-radius: 18px; padding: 12px 8px 10px;
    cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text);
    font-size: 12px; font-weight: 700; text-align: center; line-height: 1.3;
    transition: transform .16s, box-shadow .16s, border-color .16s, background .16s;
  }
  .student-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: #bfccff; }
  .student-btn.selected { background: var(--blue-soft); border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); color: #1e40af; }
  .student-btn:disabled, .student-btn.completed {
    opacity: .58; cursor: not-allowed; transform: none; box-shadow: none; background: var(--green-soft); border-color: #b7dfc4;
  }
  .completed-label { color: var(--green); font-size: 11px; font-weight: 800; }

  .s-avatar, .survey-av {
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: 800; flex-shrink: 0; letter-spacing: .02em;
  }
  .s-avatar { width: 42px; height: 42px; font-size: 12px; }
  .s-avatar.boy, .survey-av.boy { background: var(--blue-soft); color: #1e40af; }
  .s-avatar.girl, .survey-av.girl { background: var(--pink-soft); color: #be185d; }
  .selected .s-avatar.boy, .selected .s-avatar.girl { background: #fff; }

  .start-btn, .save-btn, .unlock-btn {
    background: var(--blue); color: #fff; border: none; font-weight: 800; cursor: pointer;
    transition: background .15s, box-shadow .15s, transform .15s;
  }
  .start-btn { width: 100%; padding: 14px 18px; border-radius: 999px; font-size: 15px; margin-bottom: 14px; }
  .start-btn:hover:not(:disabled), .save-btn:hover, .unlock-btn:hover { background: var(--blue-dark); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .start-btn:disabled { background: #c7ceda; cursor: default; transform: none; box-shadow: none; }
  .admin-link-row { display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--muted); font-size: 13px; }
  .text-btn { background: none; border: none; color: var(--blue); font-size: 13px; cursor: pointer; font-weight: 800; }

  .survey-wrap, .admin-wrap { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }
  .survey-header, .admin-header {
    background: rgba(255,255,255,.92); border-bottom: 1px solid var(--border); backdrop-filter: blur(14px);
    padding: .85rem 1.25rem; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 20;
  }
  .survey-av { width: 40px; height: 40px; font-size: 12px; }
  .survey-av.neu { background: var(--surface-soft); color: var(--muted); }
  .survey-av-info { flex: 1; min-width: 0; }
  .survey-av-name, .admin-header-title { font-family: 'Google Sans', 'Roboto', sans-serif; font-size: 1.05rem; font-weight: 900; color: var(--text); }
  .survey-av-sub { font-size: 12px; color: var(--muted); }
  .progress-wrap { width: 180px; }
  .progress-track { background: var(--border); border-radius: 999px; height: 7px; overflow: hidden; }
  .progress-fill { background: var(--blue); height: 7px; border-radius: 999px; transition: width .35s; }
  .progress-label { font-size: 11px; color: var(--muted); text-align: right; margin-top: 4px; }
  .back-btn, .cancel-btn, .admin-back-btn, .anon-btn {
    background: #fff; border: 1px solid var(--border-strong); border-radius: 999px; color: var(--blue);
    font-size: 14px; font-weight: 800; cursor: pointer; transition: background .15s, box-shadow .15s, transform .15s;
  }
  .back-btn, .admin-back-btn { padding: 8px 14px; }
  .back-btn:hover, .cancel-btn:hover, .admin-back-btn:hover, .anon-btn:hover { background: var(--blue-soft); box-shadow: var(--shadow-sm); transform: translateY(-1px); }

  .survey-body { flex: 1; padding: 1.5rem; max-width: 900px; width: 100%; margin: 0 auto; }
  .q-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 1.2rem;
    margin-bottom: .9rem; box-shadow: var(--shadow-sm); transition: box-shadow .16s, border-color .16s, transform .16s;
  }
  .q-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .q-card.answered { border-color: #bfccff; background: #fbfdff; }
  .q-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 1rem; }
  .q-num {
    min-width: 30px; height: 30px; border-radius: 50%; font-size: 12px; font-weight: 800;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
  }
  .q-num.pos { background: var(--blue-soft); color: #1e40af; }
  .q-num.neg { background: var(--red-soft); color: var(--red); }
  .q-text { font-size: 15px; line-height: 1.55; color: var(--text); }
  .q-selects { display: flex; gap: 10px; flex-wrap: wrap; }
  .q-select {
    flex: 1; min-width: 160px; border: 1px solid var(--border-strong); background: #fff; color: var(--text);
    border-radius: 14px; padding: 11px 34px 11px 12px; font-size: 14px; outline: none; cursor: pointer;
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .q-select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
  .q-select.has-val { border-color: var(--green); background-color: var(--green-soft); }
  .survey-footer {
    padding: 1rem 1.5rem; max-width: 900px; width: 100%; margin: 0 auto; display: flex; gap: 10px;
    border-top: 1px solid var(--border); background: rgba(255,255,255,.92); position: sticky; bottom: 0; backdrop-filter: blur(14px);
  }
  .save-btn { flex: 1; padding: 13px; border-radius: 999px; font-size: 15px; }
  .cancel-btn { padding: 13px 20px; color: var(--muted); }

  .admin-header { justify-content: space-between; }
  .admin-tabs {
    display: flex; gap: 6px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,.92);
    padding: 8px 1.5rem 0; overflow-x: auto;
  }
  .admin-tab {
    padding: 12px 18px; font-size: 14px; color: var(--muted); background: transparent; border: none; cursor: pointer;
    border-bottom: 3px solid transparent; font-weight: 800; white-space: nowrap; border-radius: 14px 14px 0 0;
  }
  .admin-tab:hover { background: var(--blue-soft); color: var(--text); }
  .admin-tab.active { color: var(--blue); border-bottom-color: var(--blue); background: var(--blue-soft); }
  .admin-body { flex: 1; padding: 1.5rem; overflow: auto; }

  .notice, .unlock-box, .table-wrap, .sg-outer, .metric-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 22px; box-shadow: var(--shadow-sm);
  }
  .notice {
    padding: 1rem 1.25rem; margin-bottom: 1rem; line-height: 1.65; font-size: 14px; color: #475569;
    background: #fff;
  }
  .notice strong { color: #111827; }
  .notice.warn { background: var(--amber-soft); border-color: #fde68a; color: #713f12; }
  .unlock-box {
    padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  }
  .unlock-box.unlocked { border-color: #bfe7ca; background: var(--green-soft); box-shadow: none; }
  .unlock-label { font-size: 14px; color: var(--muted); }
  .pw-input {
    border: 1px solid var(--border-strong); background: #fff; border-radius: 14px; padding: 10px 12px;
    font-size: 14px; color: var(--text); outline: none;
  }
  .pw-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
  .unlock-btn, .anon-btn { padding: 10px 16px; border-radius: 999px; font-size: 14px; }
  .pw-err { font-size: 13px; color: var(--red); }

  .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 1rem; }
  .metric-card { padding: 1rem 1.15rem; }
  .metric-label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
  .metric-value { font-size: 28px; font-weight: 900; color: var(--text); margin-top: 8px; }
  .metric-help { color: var(--muted); font-size: 12px; line-height: 1.5; margin-top: 6px; }

  .table-wrap { overflow: auto; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .data-table th {
    background: var(--surface-soft); padding: 13px 14px; text-align: left; font-weight: 800; color: var(--muted);
    border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 12px; text-transform: uppercase; letter-spacing: .045em;
  }
  .data-table td { padding: 13px 14px; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text); vertical-align: top; }
  .data-table tr:hover td { background: #fbfdff; }
  .pill-pos, .pill-neg, .pill-neutral, .pill-warn {
    display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; white-space: nowrap;
  }
  .pill-pos { background: var(--green-soft); color: var(--green); }
  .pill-neg { background: var(--red-soft); color: var(--red); }
  .pill-neutral { background: var(--blue-soft); color: #1e40af; }
  .pill-warn { background: var(--amber-soft); color: var(--amber); }

  .sg-outer {
    overflow: hidden; position: relative; transition: border-radius .28s ease, box-shadow .28s ease, transform .28s ease, opacity .28s ease;
  }
  .sg-outer.expanded {
    position: fixed; inset: 0; z-index: 999; width: 100vw; height: 100vh; max-width: none; margin: 0;
    border-radius: 0; border: 0; box-shadow: none; background: var(--surface); display: flex; flex-direction: column;
  }
  .sg-expand-btn {
    position: absolute; top: 12px; right: 12px; z-index: 15; border: 1px solid var(--border-strong);
    background: rgba(255,255,255,.94); color: var(--blue); border-radius: 999px; padding: 9px 13px; font-size: 13px;
    font-weight: 800; cursor: pointer; box-shadow: var(--shadow-sm);
  }
  .sg-outer.expanded .sg-controls { padding-right: 190px; flex-shrink: 0; }
  .sg-outer.expanded .sg-legend { flex-shrink: 0; }
  .sg-outer.expanded .sg-canvas-wrap { flex: 1; height: auto; min-height: 0; }
  .sg-outer.expanded #sg-canvas { height: 100%; }
  body.sg-fullscreen-open { overflow: hidden; }
  .sg-controls {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
    background: var(--surface-soft);
  }
  .sg-select, .filter-pill {
    font-size: 13px; padding: 9px 13px; border-radius: 999px; border: 1px solid var(--border-strong); background: #fff;
    color: var(--muted); cursor: pointer; outline: none; font-weight: 800;
  }
  .filter-pill.on-pos { background: var(--green-soft); color: var(--green); border-color: #b7dfc4; }
  .filter-pill.on-neg { background: var(--red-soft); color: var(--red); border-color: #f6b8b2; }
  .filter-pill.on-mut, .filter-pill.on-boy { background: var(--blue-soft); color: #1e40af; border-color: #bfccff; }
  .filter-pill.on-girl { background: var(--pink-soft); color: #be185d; border-color: #f4bfd8; }
  .sg-legend {
    display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding: .8rem 1.25rem; border-bottom: 1px solid var(--border);
    font-size: 12px; color: var(--muted);
  }
  .leg-item { display: flex; align-items: center; gap: 6px; }
  .leg-line { width: 22px; height: 3px; border-radius: 2px; display: inline-block; }
  .leg-circ { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
  .sg-hint { margin-left: auto; font-size: 12px; color: var(--muted-2); }
  .sg-canvas-wrap { position: relative; width: 100%; height: 540px; }
  #sg-canvas { width: 100%; height: 540px; display: block; cursor: grab; background: #fff; }
  .sg-tooltip {
    position: absolute; pointer-events: none; background: #18202f; color: #fff; padding: 10px 12px; border-radius: 14px;
    font-size: 12px; line-height: 1.7; opacity: 0; transition: opacity .15s; max-width: 260px; z-index: 10; white-space: nowrap;
    box-shadow: var(--shadow-md);
  }
  .sg-tooltip strong { font-weight: 800; font-size: 13px; display: block; margin-bottom: 3px; }
  .sg-tooltip .tt-pos { color: #86efac; }
  .sg-tooltip .tt-neg { color: #fca5a5; }
  .sg-tooltip .tt-mut { color: #93c5fd; }
  .sg-empty { display: flex; align-items: center; justify-content: center; height: 360px; color: var(--muted); font-size: 14px; }
  .completion-bar-bg { background: var(--border); border-radius: 999px; height: 8px; flex: 1; overflow: hidden; }
  .completion-bar-fill { height: 8px; border-radius: 999px; background: var(--blue); transition: width .35s; }
  .toast {
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: #18202f; color: #fff;
    padding: 12px 18px; border-radius: 14px; font-size: 14px; z-index: 1000; transition: opacity .25s, transform .25s;
    box-shadow: var(--shadow-md);
  }
  .toast.hidden { opacity: 0; transform: translateX(-50%) translateY(8px); pointer-events: none; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c7ceda; border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }

  @media (max-width: 640px) {
    .landing-wrap { grid-template-columns: 1fr; padding: 12px; }
    .landing-left { padding: 22px; border-radius: 26px; }
    .hero-title { font-size: 3rem; }
    .hero-panel-stat { display: none; }
    .landing-right-inner { padding: 22px; border-radius: 26px; }
    .progress-wrap { display: none; }
    .admin-body { padding: 1rem; }
  }
`;

function HeroGraphPreview() {
  const canvasRef = useRef(null);
  

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function roundRect(ctx, x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    }

    const draw = () => {
      const parent = canvas.parentElement;
      const width = Math.max(320, parent?.clientWidth || 720);
      const height = Math.max(260, parent?.clientHeight || 320);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const nodes = [
        { id: "A", x: .22, y: .34, label: "AB", color: "#2563eb", size: 24 },
        { id: "B", x: .45, y: .24, label: "LK", color: "#db2777", size: 21 },
        { id: "C", x: .68, y: .36, label: "MP", color: "#2563eb", size: 24 },
        { id: "D", x: .34, y: .66, label: "ZS", color: "#16a34a", size: 22 },
        { id: "E", x: .61, y: .70, label: "TN", color: "#7c3aed", size: 22 },
        { id: "F", x: .80, y: .58, label: "KR", color: "#f59e0b", size: 20 },
      ].map(n => ({ ...n, x: n.x * width, y: n.y * height }));

      const byId = new Map(nodes.map(n => [n.id, n]));
      const links = [
        ["A", "B", "mutual"], ["A", "D", "positive"], ["B", "C", "positive"],
        ["C", "F", "mutual"], ["D", "E", "positive"], ["E", "F", "negative"], ["C", "E", "positive"],
      ];

      ctx.save();
      ctx.strokeStyle = "rgba(148, 163, 184, .16)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y <= height; y += 36) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      ctx.restore();

      links.forEach(([a, b, type]) => {
        const s = byId.get(a), t = byId.get(b);
        const color = type === "negative" ? "#ef4444" : type === "mutual" ? "#2563eb" : "#16a34a";
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = type === "mutual" ? .42 : .28;
        ctx.lineWidth = type === "mutual" ? 3 : 2;
        if (type === "negative") ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo((s.x + t.x) / 2, (s.y + t.y) / 2 - (type === "mutual" ? 18 : 6), t.x, t.y);
        ctx.stroke();
        ctx.restore();
      });

      nodes.forEach(n => {
        ctx.save();
        ctx.shadowColor = "rgba(15, 23, 42, .16)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = "#fff";
        roundRect(ctx, n.x - 42, n.y - 34, 84, 68, 22);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "rgba(226, 232, 240, .95)";
        roundRect(ctx, n.x - 42, n.y - 34, 84, 68, 22);
        ctx.stroke();
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y - 5, n.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "700 12px 'Google Sans', 'Roboto', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y - 5);
        ctx.fillStyle = "#64748b";
        ctx.font = "500 10px 'Google Sans', 'Roboto', sans-serif";
        ctx.fillText("tanuló", n.x, n.y + 24);
        ctx.restore();
      });
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return <canvas ref={canvasRef} className="hero-graph-canvas" aria-label="Szociometriai háló előnézet" />;
}

function Landing({ students, onSelect, selectedId, onStart, onAdmin, completedIds = new Set() }) {
  const selectedCompleted = selectedId && completedIds.has(Number(selectedId));

  return (
    <div className="landing-wrap">
      <section className="landing-left">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-kicker-dot" /> Szociometriai kérdőív</div>
          <h1 className="hero-title">Kapcsolati háló az osztályban.</h1>
          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
            Szociometria forrás: <a href="https://szociometria.blogspot.com/p/blog-page_29.html" target="_blank" rel="noopener noreferrer" style={{ color: "#64748b", textDecoration: "underline" }}>
              szociometria.blogspot.com
            </a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-header">
            <div><span className="hero-panel-eyebrow">Élő előnézet</span><strong>Szociogram</strong></div>
            <div className="hero-panel-stat"><span>{students.length || "—"}</span> tanuló</div>
          </div>
          <div className="hero-graph-wrap"><HeroGraphPreview /></div>
          <div className="hero-panel-footer">
            <span><i className="legend-dot blue" /> kölcsönös</span>
            <span><i className="legend-dot green" /> pozitív</span>
            <span><i className="legend-dot red" /> figyelmet igénylő</span>
          </div>
        </div>
      </section>

      <section className="landing-right">
        <div className="landing-right-inner">
          <div className="landing-badge">Belépés tanulóként</div>
          <h2 className="landing-title">Válaszd ki<br />a <em>neved</em></h2>
          <p className="landing-sub">
            A kitöltés előtt jelöld ki magad a listában. A válaszok pedagógiai célú közösségmegismerést szolgálnak.
            Egy kérdésnél egy, két vagy három osztálytársat választhatsz, vagy ki is hagyhatod a kérdést.
          </p>

          <div className="student-grid">
            {students.length === 0 && <div style={{ color: "#657083", fontSize: 13, padding: "1rem", gridColumn: "1/-1" }}>Betöltés…</div>}
            {students.map(st => {
              const sel = st.id === selectedId;
              const done = completedIds.has(Number(st.id));
              const gClass = st.gender === "f" ? "girl" : "boy";
              return (
                <button
                  key={st.id}
                  className={`student-btn${sel ? " selected" : ""}${done ? " completed" : ""}`}
                  onClick={() => { if (!done) onSelect(st.id); }}
                  disabled={done}
                  title={done ? "Már kitöltötte" : ""}
                >
                  <div className={`s-avatar ${gClass}`}>{initials(displayName(st))}</div>
                  <span>{displayName(st)}</span>
                  {done && <small className="completed-label">✓ Kitöltve</small>}
                </button>
              );
            })}
          </div>

          <button className="start-btn" disabled={!selectedId || selectedCompleted} onClick={onStart}>
            {selectedCompleted ? "Már kitöltve" : "Kérdőív kitöltése →"}
          </button>
          <div className="admin-link-row">
            <span>Tanár vagy?</span>
            <button className="text-btn" onClick={onAdmin}>Admin nézet megnyitása</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Survey({ students, activeId, onSave, onBack }) {
  const [answers, setAnswers] = useState({});
  const others = students.filter(s => s.id !== activeId);
  const active = students.find(s => s.id === activeId);
  const activeName = displayName(active);
  const gClass = active?.gender === "f" ? "girl" : active?.gender === "m" ? "boy" : "neu";
  const answered = QUESTIONS.filter(q => answers[q.id]?.some(Boolean)).length;
  const donePct = pct(answered, QUESTIONS.length);

  function setSlot(qId, i, val) {
    setAnswers(prev => {
      const arr = [...(prev[qId] || ["", "", ""])];
      arr[i] = val;
      return { ...prev, [qId]: arr };
    });
  }

  function handleSave() {
    const payload = [];
    Object.entries(answers).forEach(([qId, arr]) => {
      const uniqueIds = [...new Set(arr.filter(Boolean).map(Number))];
      uniqueIds.forEach(tid => payload.push({ questionId: Number(qId), targetStudentId: Number(tid) }));
    });
    onSave(payload);
  }

  return (
    <div className="survey-wrap">
      <div className="survey-header">
        <div className={`survey-av ${gClass}`}>{initials(activeName)}</div>
        <div className="survey-av-info">
          <div className="survey-av-name">{activeName}</div>
          <div className="survey-av-sub">kérdőív kitöltése</div>
        </div>
        <div className="progress-wrap">
          <div className="progress-track"><div className="progress-fill" style={{ width: donePct + "%" }} /></div>
          <div className="progress-label">{answered} / {QUESTIONS.length}</div>
        </div>
        <button className="back-btn" onClick={onBack}>← Vissza</button>
      </div>

      <div className="survey-body">
        <div className="notice warn">
          <strong>Hogyan töltsd ki?</strong><br />
          Minden kérdésnél válaszolj egy, két vagy három osztálytársad nevével. Nem kötelező mindhárom helyet kitölteni, sőt.
          Egy kérdésen belül ugyanazt az osztálytársat csak egyszer lehet kiválasztani.
        </div>

        {QUESTIONS.map(q => {
          const neg = q.type === "negative";
          const currentAnswers = answers[q.id] || ["", "", ""];
          const isAnswered = currentAnswers.some(Boolean);
          return (
            <div key={q.id} className={`q-card${isAnswered ? " answered" : ""}`}>
              <div className="q-head">
                <div className={`q-num ${neg ? "neg" : "pos"}`}>{q.id}</div>
                <div className="q-text">{q.text}</div>
              </div>
              <div className="q-selects">
                {[0, 1, 2].map(i => {
                  const val = currentAnswers[i] || "";
                  const usedInOtherSlots = new Set(currentAnswers.filter((x, idx) => idx !== i && x));
                  return (
                    <select key={i} className={`q-select${val ? " has-val" : ""}`} value={val} onChange={e => setSlot(q.id, i, e.target.value)}>
                      <option value="">– {i + 1}. választás –</option>
                      {others
                        .filter(st => !usedInOtherSlots.has(String(st.id)))
                        .map(st => <option key={st.id} value={st.id}>{displayName(st)}</option>)}
                    </select>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="survey-footer">
        <button className="save-btn" onClick={handleSave}>Mentés ✓</button>
        <button className="cancel-btn" onClick={onBack}>Mégse</button>
      </div>
    </div>
  );
}


function SociogramCanvas({ students, responses }) {
  const [expanded, setExpanded] = useState(false);
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const simRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const draggingRef = useRef(null);
  const hoveredRef = useRef(null);
  const rafRef = useRef(null);
  const d3Ref = useRef(window.d3 || null);
  const [questionScope, setQuestionScope] = useState("all");

  const [d3Ready, setD3Ready] = useState(Boolean(window.d3));
  const [relationMode, setRelationMode] = useState("all");
  const [showMut, setShowMut] = useState(false);
  const [mutualOnly, setMutualOnly] = useState(false);
  const [showBoy, setShowBoy] = useState(true);
  const [showGirl, setShowGirl] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, node: null, stats: null });

  const filterRef = useRef({
    questionScope: "all",
    relationMode: "all",
    showMut: false,
    mutualOnly: false,
    showBoy: true,
    showGirl: true,
  });

  useEffect(() => {
    filterRef.current = { questionScope, relationMode, showMut, mutualOnly, showBoy, showGirl };
    drawFrame();
  }, [questionScope, relationMode, showMut, mutualOnly, showBoy, showGirl]);

  useEffect(() => {
    if (window.d3) {
      d3Ref.current = window.d3;
      setD3Ready(true);
      return;
    }

    const existing = document.querySelector("script[data-d3-loader='true']");
    if (existing) {
      existing.addEventListener("load", () => {
        d3Ref.current = window.d3;
        setD3Ready(true);
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js";
    script.async = true;
    script.dataset.d3Loader = "true";
    script.onload = () => {
      d3Ref.current = window.d3;
      setD3Ready(true);
    };
    document.head.appendChild(script);
  }, []);

  const filteredResponses = useMemo(() => {
    if (questionScope === "core") {
      const coreSet = new Set(CORE_IDS);
      return responses.filter(r => coreSet.has(Number(r.question_id)));
    }

    return responses;
  }, [responses, questionScope]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return { width: 900, height: 540 };

    const width = Math.max(320, Math.floor(wrapper.clientWidth));
    const height = expanded ? Math.max(300, Math.floor(wrapper.clientHeight)) : 540;
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { width, height };
  }, [expanded]);

  const buildGraph = useCallback(() => {
    const d3 = d3Ref.current;
    if (!d3 || !canvasRef.current || students.length === 0) return;

    const { width, height } = resizeCanvas();
    if (simRef.current) simRef.current.stop();

    const previous = new Map(nodesRef.current.map(n => [n.id, n]));
    const centerX = width / 2;
    const centerY = height / 2;
    const layoutScale = expanded ? Math.min(2.35, Math.max(1.45, Math.min(width / 900, height / 540))) : 1;
    const radius = expanded ? Math.min(width, height) * 0.42 : Math.min(width, height) * 0.32;

    const nodes = students.map((s, i) => {
      const old = previous.get(Number(s.id));
      const angle = (i / Math.max(students.length, 1)) * Math.PI * 2;

      return {
        id: Number(s.id),
        label: s.displayName || s.code || `#${s.id}`,
        code: s.code,
        gender: s.gender || "m",
        x: Number.isFinite(old?.x) ? old.x : centerX + Math.cos(angle) * radius,
        y: Number.isFinite(old?.y) ? old.y : centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    const validIds = new Set(nodes.map(n => n.id));
    const directedMap = new Map();

    filteredResponses.forEach(r => {
      const source = Number(r.voter_student_id);
      const target = Number(r.target_student_id);
      const qid = Number(r.question_id);

      if (!validIds.has(source) || !validIds.has(target) || source === target) return;

      const q = QUESTIONS.find(x => x.id === qid);
      if (!q) return;

      const key = `${source}_${target}_${q.type}`;
      const existing = directedMap.get(key) || {
        source,
        target,
        type: q.type,
        weight: 0,
      };

      existing.weight += 1;
      directedMap.set(key, existing);
    });

    const pairMap = new Map();

    [...directedMap.values()].forEach(e => {
      const a = Math.min(e.source, e.target);
      const b = Math.max(e.source, e.target);
      const key = `${a}_${b}_${e.type}`;

      const item = pairMap.get(key) || {
        a,
        b,
        type: e.type,
        forwardWeight: 0,
        backwardWeight: 0,
        weight: 0,
        mutualCount: 0,
        mutual: false,
      };

      if (e.source === a && e.target === b) {
        item.forwardWeight += e.weight;
      } else {
        item.backwardWeight += e.weight;
      }

      item.weight = item.forwardWeight + item.backwardWeight;
      item.mutualCount = Math.min(item.forwardWeight, item.backwardWeight);
      item.mutual = item.mutualCount > 0;

      pairMap.set(key, item);
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));

    const links = [...pairMap.values()]
      .map(e => ({
        source: nodeById.get(e.a),
        target: nodeById.get(e.b),
        sourceId: e.a,
        targetId: e.b,
        type: e.type,
        weight: e.weight,
        forwardWeight: e.forwardWeight,
        backwardWeight: e.backwardWeight,
        mutualCount: e.mutualCount,
        mutual: e.mutual,
      }))
      .filter(e => e.source && e.target);

    nodesRef.current = nodes;
    linksRef.current = links;

    simRef.current = d3.forceSimulation(nodes)
      .alpha(expanded ? 0.9 : 0.45)
      .alphaMin(expanded ? 0.02 : 0.04)
      .alphaDecay(expanded ? 0.035 : 0.06)
      .velocityDecay(expanded ? 0.64 : 0.82)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => {
        if (!expanded) return d.mutual ? 76 : 108;
        return (d.mutual ? 150 : 215) * layoutScale;
      }).strength(d => expanded ? Math.min(0.07 + d.weight * 0.006, 0.13) : Math.min(0.12 + d.weight * 0.01, 0.2)))
      .force("charge", d3.forceManyBody().strength(expanded ? -210 * layoutScale : -38))
      .force("center", d3.forceCenter(centerX, centerY).strength(expanded ? 0.035 : 0.05))
      .force("x", d3.forceX(centerX).strength(expanded ? 0.012 : 0.018))
      .force("y", d3.forceY(centerY).strength(expanded ? 0.012 : 0.018))
      .force("collide", d3.forceCollide(expanded ? 54 * layoutScale : 36).strength(0.95))
      .on("tick", () => {
        nodes.forEach(n => {
          const padX = expanded ? 80 : 40;
          const padY = expanded ? 90 : 40;
          n.x = Math.max(padX, Math.min(width - padX, n.x));
          n.y = Math.max(padY, Math.min(height - padY, n.y));
        });
        scheduleDraw();
      })
      .on("end", drawFrame);

    window.setTimeout(() => {
      if (simRef.current) simRef.current.stop();
      drawFrame();
    }, 900);

    drawFrame();
  }, [students.length, filteredResponses, resizeCanvas, expanded]);

  useEffect(() => {
    if (!d3Ready) return;
    buildGraph();

    const onResize = () => buildGraph();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (simRef.current) simRef.current.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [d3Ready, buildGraph]);

  useEffect(() => {
    document.body.classList.toggle("sg-fullscreen-open", expanded);
    return () => document.body.classList.remove("sg-fullscreen-open");
  }, [expanded]);

  useEffect(() => {
    if (!d3Ready) return;
    const t = window.setTimeout(() => buildGraph(), 280);
    return () => window.clearTimeout(t);
  }, [expanded, d3Ready, buildGraph]);

  useEffect(() => {
    const labelById = new Map(students.map(s => [Number(s.id), s.displayName || s.code || `#${s.id}`]));
    nodesRef.current.forEach(n => { n.label = labelById.get(Number(n.id)) || n.label; });
    drawFrame();
  }, [students]);

  function scheduleDraw() {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawFrame();
    });
  }

  function isNodeVisible(n) {
    const f = filterRef.current;
    return (f.showBoy && n.gender === "m") || (f.showGirl && n.gender === "f");
  }

  function relationMatchesMode(l) {
    const f = filterRef.current;
    if (f.relationMode === "positive") return l.type === "positive";
    if (f.relationMode === "negative") return l.type === "negative";
    return l.type === "positive" || l.type === "negative";
  }

  function shouldShowBaseLink(l) {
    const f = filterRef.current;
    if (!isNodeVisible(l.source) || !isNodeVisible(l.target)) return false;
    if (f.mutualOnly) return false;
    if (l.mutual && f.showMut) return false;
    return relationMatchesMode(l);
  }

  function shouldShowMutualLayer(l) {
    const f = filterRef.current;
    if (!f.showMut && !f.mutualOnly) return false;
    if (!l.mutual) return false;
    if (!isNodeVisible(l.source) || !isNodeVisible(l.target)) return false;
    return relationMatchesMode(l);
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || 900;
    const height = expanded ? canvas.clientHeight : (canvas.clientHeight || 540);

    ctx.clearRect(0, 0, width, height);

    if (linksRef.current.length === 0) {
      ctx.save();
      ctx.fillStyle = "#5f6368";
      ctx.font = "14px 'Roboto', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Még nincs elég mentett választás a kapcsolati hálóhoz.", width / 2, height / 2);
      ctx.restore();
    }

    linksRef.current.forEach(l => {
      if (!shouldShowBaseLink(l)) return;
      drawRelationLink(ctx, l, false);
    });

    linksRef.current.forEach(l => {
      if (!shouldShowMutualLayer(l)) return;
      drawRelationLink(ctx, l, true);
    });

    nodesRef.current.forEach(n => {
      if (!isNodeVisible(n)) return;

      const isHovered = hoveredRef.current === n.id;
      const r = expanded ? (isHovered ? 32 : 27) : (isHovered ? 23 : 19);
      const fill = n.gender === "f" ? "#c33d7b" : "#1a73e8";

      ctx.save();

      if (isHovered) {
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `700 ${expanded ? (isHovered ? 13 : 12) : (isHovered ? 10 : 9)}px 'Google Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(n.label), n.x, n.y);

      ctx.fillStyle = "rgba(32,33,36,.74)";
      ctx.font = expanded ? `${isHovered ? "600 14px" : "500 13px"} 'Roboto', sans-serif` : `${isHovered ? "500 11px" : "400 10px"} 'Roboto', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(n.label, n.x, n.y + r + 5);

      ctx.restore();
    });
  }

  function drawRelationLink(ctx, l, asMutualLayer) {
  const sx = l.source.x;
  const sy = l.source.y;
  const tx = l.target.x;
  const ty = l.target.y;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const nx = -uy;
  const ny = ux;

  const nodeR = expanded ? 28 : 23;
  const startX = sx + ux * nodeR;
  const startY = sy + uy * nodeR;
  const endX = tx - ux * nodeR;
  const endY = ty - uy * nodeR;
  const angle = Math.atan2(endY - startY, endX - startX);

  if (asMutualLayer) {
    const count = Math.max(1, Math.min(l.forwardWeight || 0, l.backwardWeight || 0));
    const spacing = expanded ? 7 : 5;
    const totalWidth = (count - 1) * spacing;

    ctx.save();
    ctx.strokeStyle = "#1a73e8";
    ctx.fillStyle = "#1a73e8";
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = expanded ? 2.2 : 1.9;

    for (let i = 0; i < count; i++) {
      const offset = i * spacing - totalWidth / 2;

      const aX = startX + nx * offset;
      const aY = startY + ny * offset;
      const bX = endX + nx * offset;
      const bY = endY + ny * offset;

      ctx.beginPath();
      ctx.moveTo(aX, aY);
      ctx.lineTo(bX, bY);
      ctx.stroke();

    }

    ctx.restore();
    return;
  }

  const color = l.type === "negative" ? "#d93025" : "#188038";
  const spacing = expanded ? 7 : 5;

  const forwardCount = Math.max(0, l.forwardWeight || 0);
  const backwardCount = Math.max(0, l.backwardWeight || 0);
  const totalCount = Math.max(1, forwardCount + backwardCount);
  const totalWidth = (totalCount - 1) * spacing;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.48;
  ctx.lineWidth = 1.7;
  ctx.setLineDash([5, 5]);

  let lineIndex = 0;

  for (let i = 0; i < forwardCount; i++) {
    const offset = lineIndex * spacing - totalWidth / 2;
    lineIndex++;

    const aX = startX + nx * offset;
    const aY = startY + ny * offset;
    const bX = endX + nx * offset;
    const bY = endY + ny * offset;

    ctx.beginPath();
    ctx.moveTo(aX, aY);
    ctx.lineTo(bX, bY);
    ctx.stroke();
    drawArrow(ctx, bX, bY, angle);
  }

  for (let i = 0; i < backwardCount; i++) {
    const offset = lineIndex * spacing - totalWidth / 2;
    lineIndex++;

    const aX = endX + nx * offset;
    const aY = endY + ny * offset;
    const bX = startX + nx * offset;
    const bY = startY + ny * offset;

    ctx.beginPath();
    ctx.moveTo(aX, aY);
    ctx.lineTo(bX, bY);
    ctx.stroke();
    drawArrow(ctx, bX, bY, angle + Math.PI);
  }

  ctx.restore();
}

  function drawArrow(ctx, x, y, angle) {
    const size = 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
    ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  const getNodeAt = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    return nodesRef.current.find(n => isNodeVisible(n) && Math.hypot(n.x - mx, n.y - my) <= 25) || null;
  }, []);

  function nodeStats(nodeId) {
    const posRec = filteredResponses.filter(r =>
      Number(r.target_student_id) === nodeId &&
      QUESTIONS.find(q => q.id === Number(r.question_id))?.type === "positive"
    ).length;

    const negRec = filteredResponses.filter(r =>
      Number(r.target_student_id) === nodeId &&
      QUESTIONS.find(q => q.id === Number(r.question_id))?.type === "negative"
    ).length;

    const given = filteredResponses.filter(r => Number(r.voter_student_id) === nodeId).length;

    const mutual = linksRef.current.filter(l =>
      l.mutual &&
      (l.source.id === nodeId || l.target.id === nodeId)
    ).length;

    return { posRec, negRec, given, mutual };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = e => {
      const point = e.touches?.[0] || e;
      const rect = canvas.getBoundingClientRect();
      const clientX = point.clientX;
      const clientY = point.clientY;

      if (draggingRef.current) {
        draggingRef.current.fx = clientX - rect.left;
        draggingRef.current.fy = clientY - rect.top;
        draggingRef.current.x = draggingRef.current.fx;
        draggingRef.current.y = draggingRef.current.fy;

        if (simRef.current) simRef.current.alphaTarget(0.03).restart();

        scheduleDraw();
        e.preventDefault?.();
        return;
      }

      const n = getNodeAt(clientX, clientY);
      hoveredRef.current = n ? n.id : null;
      canvas.style.cursor = n ? "pointer" : "grab";

      if (n) {
        const mx = clientX - rect.left;
        const my = clientY - rect.top;

        setTooltip({
          visible: true,
          x: Math.min(mx + 14, canvas.clientWidth - 255),
          y: Math.max(my - 80, 5),
          node: n,
          stats: nodeStats(n.id),
        });
      } else {
        setTooltip(t => ({ ...t, visible: false }));
      }

      scheduleDraw();
    };

    const onDown = e => {
      const point = e.touches?.[0] || e;
      const n = getNodeAt(point.clientX, point.clientY);
      if (!n) return;

      draggingRef.current = n;
      n.fx = n.x;
      n.fy = n.y;

      if (simRef.current) simRef.current.alphaTarget(0.03).restart();

      e.preventDefault?.();
    };

    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current.fx = null;
        draggingRef.current.fy = null;
        draggingRef.current = null;
      }

      if (simRef.current) simRef.current.alphaTarget(0);
    };

    const onLeave = () => {
      hoveredRef.current = null;
      setTooltip(t => ({ ...t, visible: false }));
      onUp();
      scheduleDraw();
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchend", onUp);
    };
  }, [getNodeAt, filteredResponses]);

  if (students.length === 0) return <div className="sg-empty">Nincs adat a megjelenítéshez.</div>;

  return (
    <div className={`sg-outer${expanded ? " expanded" : ""}`}>
      <button className="sg-expand-btn" onClick={() => setExpanded(v => !v)}>
        {expanded ? "↙ Eredeti méret" : "⛶ Teljes szélesség"}
      </button>

      <div className="sg-controls">
        <button
          className={`filter-pill${questionScope === "all" ? " on-mut" : ""}`}
          onClick={() => setQuestionScope("all")}
        >
          20 kérdés
        </button>

        <button
          className={`filter-pill${questionScope === "core" ? " on-mut" : ""}`}
          onClick={() => setQuestionScope("core")}
        >
          Főkérdések
        </button>
        <button
          className={`filter-pill${relationMode === "all" ? " on-mut" : ""}`}
          onClick={() => setRelationMode("all")}
        >
          Összes
        </button>

        <button
          className={`filter-pill${relationMode === "positive" ? " on-pos" : ""}`}
          onClick={() => setRelationMode("positive")}
        >
          Pozitív
        </button>

        <button
          className={`filter-pill${relationMode === "negative" ? " on-neg" : ""}`}
          onClick={() => setRelationMode("negative")}
        >
          Figyelmet igénylő
        </button>

        <button
          className={`filter-pill${showMut ? " on-mut" : ""}`}
          onClick={() => {
            setShowMut(v => {
              const next = !v;
              if (next) setMutualOnly(false);
              return next;
            });
          }}
        >
          Kölcsönös
        </button>

        <button
          className={`filter-pill${mutualOnly ? " on-mut" : ""}`}
          onClick={() => {
            setMutualOnly(v => {
              const next = !v;
              if (next) setShowMut(false);
              return next;
            });
          }}
        >
          Csak kölcsönös
        </button>

        <button
          className={`filter-pill${showBoy ? " on-boy" : ""}`}
          onClick={() => setShowBoy(v => !v)}
        >
          Fiú
        </button>

        <button
          className={`filter-pill${showGirl ? " on-girl" : ""}`}
          onClick={() => setShowGirl(v => !v)}
        >
          Lány
        </button>
      </div>

      <div className="sg-legend">
        <span className="leg-item"><span className="leg-line" style={{ background: "#188038", opacity: .7 }} /> pozitív</span>
        <span className="leg-item"><span className="leg-line" style={{ background: "#d93025", opacity: .7 }} /> pedagógiai figyelmet igénylő</span>
        <span className="leg-item"><span className="leg-line" style={{ background: "#1a73e8", height: 3 }} /> kölcsönös párhuzamos szálak</span>
        <span className="leg-item"><span className="leg-circ" style={{ background: "#1a73e8" }} /> fiú</span>
        <span className="leg-item"><span className="leg-circ" style={{ background: "#c33d7b" }} /> lány</span>
        <span className="sg-hint">Húzd a csomópontokat</span>
      </div>

      <div className="sg-canvas-wrap" ref={wrapperRef}>
        <canvas ref={canvasRef} id="sg-canvas" />
        {tooltip.visible && tooltip.node && (
          <div className="sg-tooltip" style={{ left: tooltip.x, top: tooltip.y, opacity: 1 }}>
            <strong>{tooltip.node.label}</strong>
            <span className="tt-pos">▲ Pozitív kapott: {tooltip.stats?.posRec ?? 0}</span><br />
            <span className="tt-neg">▼ Figyelmet igénylő: {tooltip.stats?.negRec ?? 0}</span><br />
            <span className="tt-mut">⟷ Kölcsönös: {tooltip.stats?.mutual ?? 0}</span><br />
            Adott választás: {tooltip.stats?.given ?? 0}
          </div>
        )}
      </div>
    </div>
  );
}

function buildSociometricAnalysis(students, responses, nameOf) {
  const qById = new Map(QUESTIONS.map(q => [q.id, q]));
  const studentIds = students.map(s => Number(s.id));
  const studentById = new Map(students.map(s => [Number(s.id), s]));

  const validResponses = responses
    .map(r => ({
      voter: Number(r.voter_student_id),
      target: Number(r.target_student_id),
      question: Number(r.question_id),
      q: qById.get(Number(r.question_id)),
    }))
    .filter(r => studentById.has(r.voter) && studentById.has(r.target) && r.q && r.voter !== r.target);

  const positiveResponses = validResponses.filter(r => r.q.type === "positive");
  const negativeResponses = validResponses.filter(r => r.q.type === "negative");
  const coreResponses = validResponses.filter(r => r.q.core);

  const directedCore = new Set(coreResponses.map(r => `${r.voter}->${r.target}`));
  const mutualPairsMap = new Map();

  coreResponses.forEach(r => {
    const reverse = `${r.target}->${r.voter}`;
    if (!directedCore.has(reverse)) return;
    const a = Math.min(r.voter, r.target);
    const b = Math.max(r.voter, r.target);
    mutualPairsMap.set(`${a}-${b}`, { a, b });
  });

  const mutualPairs = [...mutualPairsMap.values()];
  const mutualDegree = Object.fromEntries(studentIds.map(id => [id, 0]));
  mutualPairs.forEach(({ a, b }) => { mutualDegree[a]++; mutualDegree[b]++; });

  const adjacency = new Map(studentIds.map(id => [id, new Set()]));
  mutualPairs.forEach(({ a, b }) => {
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  });

  const seen = new Set();
  const groups = [];
  studentIds.forEach(id => {
    if (seen.has(id)) return;
    const stack = [id];
    const comp = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      adjacency.get(cur)?.forEach(next => {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      });
    }
    groups.push({
      size: comp.length,
      members: comp.map(mid => ({ id: mid, label: nameOf(studentById.get(mid)) })),
      edgeCount: mutualPairs.filter(p => comp.includes(p.a) && comp.includes(p.b)).length,
    });
  });
  groups.sort((a, b) => b.size - a.size || b.edgeCount - a.edgeCount);

  const groupOf = new Map();
  groups.forEach((g, i) => g.members.forEach(m => groupOf.set(m.id, i + 1)));

  const positiveCounts = students.map(s => positiveResponses.filter(r => r.target === Number(s.id)).length);
  const negativeCounts = students.map(s => negativeResponses.filter(r => r.target === Number(s.id)).length);
  const mutualCounts = students.map(s => mutualDegree[Number(s.id)] || 0);

  const posMean = mean(positiveCounts);
  const negMean = mean(negativeCounts);
  const mutualMean = mean(mutualCounts);
  const posSd = stdDev(positiveCounts);
  const negSd = stdDev(negativeCounts);
  const mutualSd = stdDev(mutualCounts);

  const maxDirectedCore = students.length * Math.max(students.length - 1, 0);
  const directedCoreCount = coreResponses.length;
  const mutualEdgeCount = mutualPairs.length;

  const classMetrics = {
    studentCount: students.length,
    responseCount: validResponses.length,
    directedCoreCount,
    mutualEdgeCount,
    mutualDensity: pct(mutualEdgeCount, students.length * Math.max(students.length - 1, 0) / 2),
    reciprocityRate: pct(mutualEdgeCount * 2, Math.max(directedCoreCount, 1)),
    componentCount: groups.length,
    isolatedCount: students.filter(s => (mutualDegree[Number(s.id)] || 0) === 0).length,
    oneMutualCount: students.filter(s => (mutualDegree[Number(s.id)] || 0) === 1).length,
    norm: {
      posMean, negMean, mutualMean, posSd, negSd, mutualSd,
    },
  };

  const isolated = students
    .filter(s => (mutualDegree[Number(s.id)] || 0) === 0)
    .map(s => ({ id: Number(s.id), label: nameOf(s) }));

  const oneMutual = students
    .filter(s => (mutualDegree[Number(s.id)] || 0) === 1)
    .map(s => ({ id: Number(s.id), label: nameOf(s) }));

  const topConnections = students
    .map(s => ({ id: Number(s.id), label: nameOf(s), count: mutualDegree[Number(s.id)] || 0 }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)))
    .filter(x => x.count > 0)
    .slice(0, 8);

  const questionFrequency = QUESTIONS.map(q => {
    const rows = students
      .map(s => ({
        id: Number(s.id),
        label: nameOf(s),
        count: validResponses.filter(r => r.question === q.id && r.target === Number(s.id)).length,
      }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
    return { question: q, rows, top: rows.slice(0, 5) };
  });

  const topByQuestion = (qid, limit = 5) =>
    questionFrequency.find(x => x.question.id === qid)?.rows.slice(0, limit) || [];

  const rows = students.map(s => {
    const id = Number(s.id);
    const pos = positiveResponses.filter(r => r.target === id).length;
    const neg = negativeResponses.filter(r => r.target === id).length;
    const mutual = mutualDegree[id] || 0;
    const given = validResponses.filter(r => r.voter === id).length;
    const posZ = zScore(pos, posMean, posSd);
    const negZ = zScore(neg, negMean, negSd);
    const mutualZ = zScore(mutual, mutualMean, mutualSd);

    const neighborGroups = new Set([...adjacency.get(id) || []].map(nid => groupOf.get(nid)).filter(Boolean));
    const bridgeScore = neighborGroups.size >= 2 ? neighborGroups.size : 0;

    return {
      id,
      label: nameOf(s),
      code: s.code,
      pos,
      neg,
      mutual,
      given,
      group: groupOf.get(id) || "-",
      posZ,
      negZ,
      mutualZ,
      posLevel: normLevel(posZ),
      negLevel: normLevel(negZ),
      mutualLevel: normLevel(mutualZ),
      bridgeScore,
    };
  }).map(row => ({ ...row, signal: professionalSignal(row) }));

  const statusRows = [...rows].sort((a, b) => b.pos - a.pos || b.mutual - a.mutual || String(a.label).localeCompare(String(b.label)));
  const attentionRows = [...rows]
    .filter(r => r.mutual === 0 || r.mutual === 1 || r.negZ >= 1.25 || r.bridgeScore >= 2)
    .sort((a, b) => b.negZ - a.negZ || a.mutual - b.mutual || String(a.label).localeCompare(String(b.label)));

  return {
    validResponses,
    isolated,
    oneMutual,
    topConnections,
    groups,
    questionFrequency,
    topByQuestion,
    statusRows,
    attentionRows,
    classMetrics,
  };
}

function formatList(items) {
  if (!items || items.length === 0) return "nincs kiemelhető tanuló";
  return items.map(x => `${x.label}${typeof x.count === "number" ? ` (${x.count})` : ""}`).join(", ");
}

function Admin({ students, responses, onBack, initialNameToken = "", initialRealNames = {} }) {
  const [tab, setTab] = useState("overview");
  const [password, setPassword] = useState("");
  const [nameToken, setNameToken] = useState(initialNameToken);
  const [realNames, setRealNames] = useState(initialRealNames);
  const [pwMsg, setPwMsg] = useState("");

  const adminLabel = useCallback((st) => nameToken ? (realNames[st.id] || st.name || st.code) : st.code, [nameToken, realNames]);

  const analysis = useMemo(
    () => buildSociometricAnalysis(students, responses, adminLabel),
    [students, responses, adminLabel]
  );

  const stats = analysis.statusRows;

  async function unlockNames() {
    try {
      const res = await fetch(`${API}/auth/name-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMsg(data.error || "Hibás jelszó");
        return;
      }
      setNameToken(data.token || "name-access-granted");
      setRealNames(Object.fromEntries((data.students || []).map(st => [st.id, st.name])));
      setPwMsg("");
      setPassword("");
    } catch {
      setPwMsg("Csatlakozási hiba");
    }
  }

  const voterSet = new Set(responses.map(r => Number(r.voter_student_id)));
  const filledCount = students.filter(s => voterSet.has(Number(s.id))).length;
  const m = analysis.classMetrics;

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <span className="admin-header-title">Szociometria — Admin</span>
        <button className="admin-back-btn" onClick={onBack}>← Vissza</button>
      </div>

      <div className="admin-tabs">
        {[
          ["overview", "Áttekintés"],
          ["sociogram", "Szociogram"],
          ["analysis", "Szakmai elemzés"],
          ["frequency", "Gyakoriság"],
          ["responses", "Kitöltöttség"],
        ].map(([key, label]) => (
          <button key={key} className={`admin-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div className="admin-body">
        {!nameToken ? (
          <div className="unlock-box">
            <span className="unlock-label">Anonim mód — nevek feloldásához külön jelszó szükséges:</span>
            <input
              className="pw-input"
              type="password"
              placeholder="Jelszó"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") unlockNames(); }}
            />
            <button className="unlock-btn" onClick={unlockNames}>Nevek feloldása</button>
            {pwMsg && <span className="pw-err">{pwMsg}</span>}
          </div>
        ) : (
          <div className="unlock-box unlocked">
            <span style={{ fontSize: 13, color: "#188038", fontWeight: 700 }}>✓ Névfeloldás aktív</span>
            <button className="anon-btn" onClick={() => { setNameToken(""); setRealNames({}); }}>Anonim mód</button>
          </div>
        )}

        <div className="notice warn">
          <strong>Értelmezési keret:</strong> Az eredmények nem minősítések és nem diagnózisok.
          A mutatók a közösségi kapcsolatok pillanatfelvételei. A jelzéseket tanári megfigyeléssel,
          beszélgetéssel és kontextussal együtt kell értelmezni.
        </div>

        {tab === "overview" && (
          <>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Kitöltöttség</div>
                <div className="metric-value">{filledCount}/{students.length}</div>
                <div className="metric-help">{pct(filledCount, students.length)}% kitöltött kérdőív</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Kölcsönös rokonszenvi kapcsolatok</div>
                <div className="metric-value">{m.mutualEdgeCount}</div>
                <div className="metric-help">A főkérdések alapján számolt kölcsönös kapcsolatok.</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Kölcsönösségi arány</div>
                <div className="metric-value">{m.reciprocityRate}%</div>
                <div className="metric-help">Kölcsönössé vált rokonszenvi jelölések aránya.</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Alcsoportok / komponensek</div>
                <div className="metric-value">{m.componentCount}</div>
                <div className="metric-help">Kölcsönös kapcsolatokból kirajzolódó csoportok.</div>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanuló</th>
                    <th>Pozitív kapott</th>
                    <th>Figyelmet igénylő</th>
                    <th>Kölcsönös</th>
                    <th>Relatív pozitív</th>
                    <th>Relatív figyelem</th>
                    <th>Pedagógiai jelzés</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.label}</td>
                      <td><span className="pill-pos">{r.pos}</span></td>
                      <td><span className="pill-neg">{r.neg}</span></td>
                      <td><span className="pill-neutral">{r.mutual}</span></td>
                      <td>{r.posLevel} <small>z={fmt(r.posZ)}</small></td>
                      <td>{r.negLevel} <small>z={fmt(r.negZ)}</small></td>
                      <td>{r.signal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "sociogram" && (
          <SociogramCanvas
            students={students.map(st => ({ ...st, displayName: nameToken ? (realNames[st.id] || st.name || st.code) : st.code }))}
            responses={responses}
          />
        )}

        {tab === "analysis" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="notice">
              <strong>Szociometriai elemzés</strong><br />
              A kapcsolati háló a rokonszenvi főkérdések alapján készült. A kölcsönös kapcsolat akkor jelenik meg,
              ha két tanuló egymást rokonszenvi kritériumban jelölte. Az app az abszolút darabszámok mellett
              osztályon belüli relatív jelzéseket is számol: átlaghoz és szóráshoz viszonyított z-mutatókat.
            </div>

            <div className="notice">
              Az osztályban <strong>{analysis.isolated.length}</strong> tanulónál nincs kölcsönös rokonszenvi kapcsolat:
              {" "}{formatList(analysis.isolated)}.<br />
              <strong>{analysis.oneMutual.length}</strong> tanulónál egy kölcsönös rokonszenvi kapcsolat látható:
              {" "}{formatList(analysis.oneMutual)}.<br />
              A legtöbb kölcsönös kapcsolati szállal rendelkező tanulók: {formatList(analysis.topConnections)}.
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Csoport</th><th>Létszám</th><th>Kölcsönös szálak</th><th>Tagok</th></tr></thead>
                <tbody>
                  {analysis.groups.map((g, i) => (
                    <tr key={i}>
                      <td>{i + 1}. csoport</td>
                      <td>{g.size}</td>
                      <td>{g.edgeCount}</td>
                      <td>{g.members.map(m => m.label).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanuló</th>
                    <th>Csoport</th>
                    <th>Pozitív</th>
                    <th>Negatív / figyelmet igénylő</th>
                    <th>Kölcsönös</th>
                    <th>Z pozitív</th>
                    <th>Z negatív</th>
                    <th>Z kölcsönös</th>
                    <th>Pedagógiai jelzés</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.statusRows.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.label}</td>
                      <td>{r.group}</td>
                      <td><span className="pill-pos">{r.pos}</span></td>
                      <td><span className="pill-neg">{r.neg}</span></td>
                      <td><span className="pill-neutral">{r.mutual}</span></td>
                      <td>{fmt(r.posZ)}</td>
                      <td>{fmt(r.negZ)}</td>
                      <td>{fmt(r.mutualZ)}</td>
                      <td>{r.signal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Tanuló</th><th>Miért került ide?</th><th>Javasolt tanári nézőpont</th></tr></thead>
                <tbody>
                  {analysis.attentionRows.length === 0 ? (
                    <tr><td colSpan="3">Nincs kiugró pedagógiai jelzés.</td></tr>
                  ) : analysis.attentionRows.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.label}</td>
                      <td>{r.signal}</td>
                      <td>Ne címkézésként, hanem további megfigyelési szempontként használd.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "frequency" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="notice">
              <strong>Gyakorisági mutatók</strong><br />
              A gyakorisági táblák azt mutatják, hogy az egyes kritériumokban kik kapták a legtöbb jelölést.
              Ezek nem rangsorok az osztály előtt, hanem tanári elemzési szempontok.
            </div>

            <div className="notice">
              <p><strong>Szervezési kritérium, 8. kérdés:</strong> {formatList(analysis.topByQuestion(8, 5))}</p>
              <p><strong>Követendő minta, 18. kérdés:</strong> {formatList(analysis.topByQuestion(18, 5))}</p>
              <p><strong>Fegyelmezési problémák, 4. kérdés:</strong> {formatList(analysis.topByQuestion(4, 5))}</p>
              <p><strong>Gyenge tanulmányi megítélés, 10. kérdés:</strong> {formatList(analysis.topByQuestion(10, 5))}</p>
              <p><strong>Legkevésbé kedvelt, 17. kérdés:</strong> {formatList(analysis.topByQuestion(17, 5))}</p>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Kérdés</th><th>Terület</th><th>Típus</th><th>Leggyakoribb jelölések</th></tr></thead>
                <tbody>
                  {analysis.questionFrequency.map(row => (
                    <tr key={row.question.id}>
                      <td>{row.question.id}. {row.question.text}</td>
                      <td>{row.question.area}</td>
                      <td>{row.question.type === "negative" ? <span className="pill-neg">figyelmet igénylő</span> : <span className="pill-pos">pozitív</span>}</td>
                      <td>{formatList(row.top)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "responses" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem", padding: "1rem 1.25rem", background: "#fff", borderRadius: 18, border: "1px solid #e8eaed", boxShadow: "0 1px 2px rgba(60,64,67,.12)" }}>
              <span style={{ fontSize: 14, color: "#5f6368" }}>Kitöltöttség:</span>
              <div className="completion-bar-bg"><div className="completion-bar-fill" style={{ width: pct(filledCount, students.length) + "%" }} /></div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{filledCount} / {students.length}</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>{["Tanuló", "Állapot", "Választások száma"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {students.map(st => {
                    const done = voterSet.has(Number(st.id));
                    const cnt = responses.filter(r => Number(r.voter_student_id) === Number(st.id)).length;
                    return (
                      <tr key={st.id}>
                        <td style={{ fontWeight: 700 }}>{adminLabel(st)}</td>
                        <td><span className={done ? "pill-pos" : "pill-neg"}>{done ? "✓ Kitöltve" : "Hiányzik"}</span></td>
                        <td style={{ color: "#5f6368" }}>{cnt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess, onBack }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!password.trim()) {
      setMsg("Add meg a jelszót.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API}/auth/name-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.error || "Hibás jelszó");
        return;
      }

      onSuccess({
        token: "admin-access-granted",
        realNames: {},
      });
    } catch {
      setMsg("Csatlakozási hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      background: "radial-gradient(circle at 20% 15%, rgba(37,99,235,.12), transparent 30%), radial-gradient(circle at 85% 85%, rgba(22,163,74,.10), transparent 28%), #f6f8fc",
    }}>
      <div style={{
        width: "100%", maxWidth: 520, background: "rgba(255,255,255,.96)", borderRadius: 30, padding: 34,
        border: "1px solid #e3e7ee", boxShadow: "0 24px 70px rgba(15,23,42,.12)", position: "relative", overflow: "hidden",
      }}>
        <button
          onClick={onBack}
          aria-label="Vissza"
          style={{
            width: 42, height: 42, borderRadius: "50%", border: "1px solid #dbe7ff", background: "#eef4ff",
            color: "#2563eb", fontSize: 20, cursor: "pointer", fontWeight: 900, marginBottom: 24,
          }}
        >
          ←
        </button>

        <h2 style={{
          fontFamily: "Google Sans, Roboto, sans-serif", fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
          lineHeight: 0.98, letterSpacing: "-.06em", fontWeight: 900, color: "#111827", marginBottom: 12,
        }}>
          Jelszó<br /><span style={{ color: "#2563eb" }}>szükséges</span>
        </h2>

        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7, marginBottom: 24, maxWidth: 400 }}>
          Add meg az admin jelszót az anonim összesítés, szociogram és kitöltöttségi adatok megnyitásához.
          A nevek feloldása az admin nézeten belül külön jelszóval történik.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <input
            className="pw-input"
            type="password"
            placeholder="Admin jelszó"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") login(); }}
            style={{ width: "100%", height: 48, borderRadius: 16, fontSize: 15 }}
            autoFocus
          />

          {msg && (
            <div style={{
              background: "#fff0ee", color: "#dc2626", border: "1px solid #fecaca",
              borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: 700,
            }}>
              {msg}
            </div>
          )}

          <button className="start-btn" onClick={login} disabled={loading} style={{ height: 48, marginBottom: 0, borderRadius: 999, fontSize: 15 }}>
            {loading ? "Belépés…" : "Belépés →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("landing");
  const [students, setStudents] = useState([]);
  const [responses, setResponses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [adminAccess, setAdminAccess] = useState({ token: "", realNames: {} });
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const completedIds = useMemo(() => new Set(responses.map(r => Number(r.voter_student_id))), [responses]);

  function showToast(msg, dur = 3000) {
    setToast(msg);
    setToastVisible(true);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToastVisible(false), dur);
  }

  const loadData = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([fetch(`${API}/students`), fetch(`${API}/responses`)]);
      if (!sRes.ok || !rRes.ok) throw new Error("backend error");
      const sData = await sRes.json();
      const rData = await rRes.json();

      setStudents((sData.students || []).map(s => ({ ...s, id: Number(s.id) })));
      setResponses((rData.responses || []).map(r => ({
        voter_student_id: Number(r.voter_student_id),
        question_id: Number(r.question_id),
        target_student_id: Number(r.target_student_id),
      })));
    } catch {
      showToast("Nem sikerült csatlakozni a backendhez.");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startSurvey() {
    if (!selectedId) return;
    if (completedIds.has(Number(selectedId))) {
      showToast("Ezt a kérdőívet már kitöltötted.");
      return;
    }
    setView("survey");
  }

  async function handleSave(payload) {
    if (!selectedId) {
      showToast("Nincs kiválasztott tanuló.");
      setView("landing");
      return;
    }

    if (completedIds.has(Number(selectedId))) {
      showToast("Ezt a kérdőívet már kitöltötted.");
      await loadData();
      setSelectedId(null);
      setView("landing");
      return;
    }

    try {
      const res = await fetch(`${API}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterStudentId: Number(selectedId), answers: payload }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast(`✓ Mentve! ${data.inserted ?? payload.length} választás rögzítve.`);
        await loadData();
        setSelectedId(null);
        setView("landing");
      } else {
        showToast(data.error || "Mentési hiba.");
        await loadData();
        setSelectedId(null);
        setView("landing");
      }
    } catch {
      showToast("Hálózati hiba – ellenőrizd a backend kapcsolatot.");
    }
  }

  return (
    <>
      <style>{`@import url('${FONT_LINK}');${GLOBAL_CSS}`}</style>

      {view === "landing" && (
        <Landing
          students={students}
          selectedId={selectedId}
          completedIds={completedIds}
          onSelect={setSelectedId}
          onStart={startSurvey}
          onAdmin={() => setView("admin-login")}
        />
      )}

      {view === "survey" && (
        <Survey
          students={students}
          activeId={selectedId}
          onSave={handleSave}
          onBack={() => setView("landing")}
        />
      )}

      {view === "admin-login" && (
        <AdminLogin
          onBack={() => setView("landing")}
          onSuccess={(access) => {
            setAdminAccess(access);
            setView("admin");
          }}
        />
      )}

      {view === "admin" && (
        adminAccess.token ? (
          <Admin
            students={students}
            responses={responses}
            initialNameToken=""
            initialRealNames={{}}
            onBack={() => setView("landing")}
          />
        ) : (
          <AdminLogin
            onBack={() => setView("landing")}
            onSuccess={(access) => {
              setAdminAccess(access);
              setView("admin");
            }}
          />
        )
      )}

      <div className={`toast${toastVisible ? "" : " hidden"}`}>{toast}</div>
    </>
  );
}
