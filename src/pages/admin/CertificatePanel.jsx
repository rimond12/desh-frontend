import { useState, useEffect, useRef, useCallback } from 'react';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

const SERVER_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

// ── Tier colour lookup ────────────────────────────────────────────
const TIER_HEX = {
  D: { hex: '#7a1f1f', label: 'Red',    range: '0 – 39%',  statusText: 'ENTRY LEVEL',           statusGrade: 'D' },
  E: { hex: '#c9531e', label: 'Orange', range: '40 – 59%', statusText: 'MODERATE PERFORMANCE',  statusGrade: 'E' },
  S: { hex: '#d9a41e', label: 'Yellow', range: '60 – 79%', statusText: 'GOOD PERFORMANCE',      statusGrade: 'S' },
  H: { hex: '#1f6e34', label: 'Green',  range: '80 – 100%',statusText: 'EXCELLENT PERFORMANCE', statusGrade: 'H' },
};

// ── Derive tier from score ───────────────────────────────────────
function tierFromPercent(pct) {
  if (pct >= 80) return 'H';
  if (pct >= 60) return 'S';
  if (pct >= 40) return 'E';
  return 'D';
}

// ── Build full certificate HTML string ──────────────────────────
// Darken a hex color by mixing with black
function darkenHex(hex, amount = 0.35) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

// ── Build full certificate HTML string ──────────────────────────
// ── Helper to resolve dynamic leaf level from score percentage ──
function getDeshGrade(minPercent, maxPercent, name) {
  const min = Number(minPercent || 0);
  const n = String(name || "").toLowerCase();
  if (min >= 80 || n.includes("green") || n.includes("excellent")) return "H";
  if (min >= 60 || n.includes("yellow") || n.includes("good")) return "S";
  if (min >= 40 || n.includes("orange") || n.includes("moderate")) return "E";
  return "D";
}

function formatLeafName(name) {
  if (!name) return "";
  const clean = name.trim();
  if (clean.toLowerCase().endsWith("leaf")) {
    const main = clean.slice(0, -4).trim();
    return `${main.charAt(0).toUpperCase() + main.slice(1)} Leaf`;
  }
  return `${clean.charAt(0).toUpperCase() + clean.slice(1)} Leaf`;
}


function getLeafInfoForPercent(percent, rules) {
  const sorted = [...(rules || [])].sort((a, b) => b.minPercent - a.minPercent);
  const match = sorted.find(r => percent >= r.minPercent && percent <= r.maxPercent);
  if (match) {
    return {
      hex: match.colorCode || '#22C55E',
      label: match.name || 'Leaf',
      range: `${match.minPercent} – ${match.maxPercent}%`,
      statusText: (match.name || 'Performance').toUpperCase(),
      statusGrade: getDeshGrade(match.minPercent, match.maxPercent, match.name),
      imageUrl: match.imageUrl ? (match.imageUrl.startsWith('data:') ? match.imageUrl : `${SERVER_BASE}${match.imageUrl}`) : null,
    };
  }
  // Fallback defaults
  if (percent >= 80) return { hex: '#1f6e34', label: 'Green', range: '80 – 100%', statusText: 'EXCELLENT', statusGrade: 'H', imageUrl: null };
  if (percent >= 60) return { hex: '#d9a41e', label: 'Yellow', range: '60 – 79%', statusText: 'GOOD', statusGrade: 'S', imageUrl: null };
  if (percent >= 40) return { hex: '#c9531e', label: 'Orange', range: '40 – 59%', statusText: 'MODERATE', statusGrade: 'E', imageUrl: null };
  return { hex: '#7a1f1f', label: 'Red', range: '0 – 39%', statusText: 'ENTRY LEVEL', statusGrade: 'D', imageUrl: null };
}

// ── Build full certificate HTML string ──────────────────────────
function buildCertificateHTML(data, settings, evalRules) {
  const tierInfo = getLeafInfoForPercent(data.scorePercent, evalRules);
  const activeColor = tierInfo.hex;
  const darkColor = darkenHex(activeColor, 0.32);
  const activeLabel = tierInfo.label;
  const activeRange = tierInfo.range;
  const activeStatusText = tierInfo.statusText;
  const activeStatusGrade = tierInfo.statusGrade;

  const categoriesRows = (data.categories || []).map(c =>
    `<tr data-row="category"><td>${escHtml(c.code)}</td><td>${c.achieved}/${c.total}</td></tr>`
  ).join('');

  const totalRow = `<tr class="total-row"><td>Total</td><td>${data.achievedPoints}/${data.totalPoints}</td></tr>`;

  // Scale timeline rules - sort ascending (from lowest percent to highest)
  const sortedRulesAsc = [...(evalRules || [])].sort((a, b) => a.minPercent - b.minPercent);
  const rulesToUse = sortedRulesAsc.length > 0 ? sortedRulesAsc : [
    { name: 'Red', colorCode: '#7a1f1f', minPercent: 0, maxPercent: 39, imageUrl: null },
    { name: 'Orange', colorCode: '#c9531e', minPercent: 40, maxPercent: 59, imageUrl: null },
    { name: 'Yellow', colorCode: '#d9a41e', minPercent: 60, maxPercent: 79, imageUrl: null },
    { name: 'Green', colorCode: '#1f6e34', minPercent: 80, maxPercent: 100, imageUrl: null },
  ];

  // Dynamic Rating Scale items
  const tierItems = rulesToUse.map(r => {
    const isActive = data.scorePercent >= r.minPercent && data.scorePercent <= r.maxPercent;
    const isCustom = !!r.imageUrl;
    const src = isCustom ? (r.imageUrl.startsWith('data:') ? r.imageUrl : (r.imageUrl.startsWith('/uploads/') ? `${SERVER_BASE}${r.imageUrl}` : r.imageUrl)) : null;
    const grade = getDeshGrade(r.minPercent, r.maxPercent, r.name);

    return `
      <div class="tier-item${isActive ? ' is-achieved' : ''}" data-tier="${escHtml(r.name)}">
        ${isCustom ? `
          <img crossorigin="anonymous" src="${src}" alt="${escHtml(r.name)}" style="width:42px; height:56px; object-fit:contain; border:none;" onerror="this.style.opacity='0.5'" />
        ` : `
          <svg viewBox="0 0 80 100" width="32" height="42">
            <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z" fill="${r.colorCode || '#999'}"/>
            <text x="40" y="58" fill="#ffffff" font-size="28" font-weight="900" text-anchor="middle" font-family="'Segoe UI', Montserrat, Arial, sans-serif">${grade}</text>
          </svg>
        `}
      </div>`;
  }).join('');

  // Historical scores mapped dynamically
  const historyHTML = (data.history || []).map(h => {
    const histRule = rulesToUse.find(r => h.percent >= r.minPercent && h.percent <= r.maxPercent);
    const histLabel = histRule ? histRule.name : h.label;
    return `<div class="hist-line"><b>${h.year}</b> Label: ${escHtml(formatLeafName(histLabel))}; Score ${h.percent}% (${escHtml(h.points)} PTS)</div>`;
  }).join('');

  // Main scorecard leaf image: either matching rule's custom image, or SVG fallback
  let leafHTML = '';
  if (tierInfo.imageUrl) {
    leafHTML = `<img crossorigin="anonymous" class="leaf-img" src="${tierInfo.imageUrl}" alt="${escHtml(tierInfo.label)}" />`;
  } else {
    leafHTML = `
      <svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg" width="76" height="102">
        <defs>
          <linearGradient id="leafGrad-main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${activeColor}" />
            <stop offset="100%" stop-color="${darkColor}" />
          </linearGradient>
        </defs>
        <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z" fill="url(#leafGrad-main)"/>
        <path d="M40 8 C30 18 22 35 25 55 C30 40 36 25 40 8Z" fill="rgba(255,255,255,0.22)" />
        <path d="M40 16 C40 42 40 66 40 90" stroke="rgba(255,255,255,0.32)" stroke-width="1.5" fill="none" stroke-linecap="round" />
      </svg>`;
  }

  // Mini-tier image or SVG
  let miniLeafHTML = '';
  if (tierInfo.imageUrl) {
    miniLeafHTML = `<img crossorigin="anonymous" src="${tierInfo.imageUrl}" alt="${escHtml(tierInfo.label)}" style="height:24px; width:auto; max-width:24px; vertical-align:middle;" />`;
  } else {
    miniLeafHTML = `
      <svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg" width="18" height="24">
        <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z" fill="${activeColor}"/>
      </svg>`;
  }
  const chartDataJSON = JSON.stringify({
    labels: (data.categories || []).map(c => c.code.split('. ')[1] || c.code),
    assessed: (data.categories || []).map(c => c.total),
    achieved: (data.categories || []).map(c => c.achieved),
  });

  // Header Logo URL from settings or default fallback
  let logoHTML = `
    <svg class="leaf-mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="52" height="52">
      <path d="M50 8 C70 15 82 35 78 55 C74 75 55 88 40 82 C25 76 18 58 24 42 C30 26 40 12 50 8 Z" fill="var(--tier-h)"/>
      <path d="M45 20 C60 24 68 40 63 55 C58 70 42 78 32 72 C22 66 18 50 25 38 C31 27 38 22 45 20 Z" fill="#c9531e" opacity="0.85"/>
      <path d="M40 34 C50 36 55 46 51 55 C47 64 36 68 30 63 C24 58 23 48 28 41 C32 36 36 34 40 34 Z" fill="#d9a41e" opacity="0.9"/>
    </svg>`;
  if (settings?.authHeaderLogo) {
    const src = settings.authHeaderLogo.startsWith('data:') 
      ? settings.authHeaderLogo 
      : (settings.authHeaderLogo.startsWith('/uploads/') ? `${SERVER_BASE}${settings.authHeaderLogo}` : settings.authHeaderLogo);
    logoHTML = `<img crossorigin="anonymous" class="logo-img" src="${src}" alt="DESH Logo" onerror="this.style.opacity='0.5'" />`;
  }

  // Footer partner logos from settings or default fallback
  const partnerLogos = (settings?.footerPartnerLogos && settings.footerPartnerLogos.length > 0)
    ? settings.footerPartnerLogos
    : [
        '/images/1_UNOPS_Picture4.png',
        '/images/3_UN_HABITAT_Picture8.png',
        '/images/0_HBRI_Picture3.png',
        '/images/bdLogo.jpg',
        '/images/4_UNEP_Picture6.png',
        '/images/5_GABC_Picture7.png',
        '/images/federal-ministry.png',
      ];

  const partnersHTML = partnerLogos.map(logo => {
    if (!logo) return '';
    const src = logo.startsWith('data:') ? logo : (logo.startsWith('/uploads/') ? `${SERVER_BASE}${logo}` : logo);
    return `<img crossorigin="anonymous" src="${src}" alt="Partner" onerror="this.style.display='none'">`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>DESH Certificate — ${escHtml(data.serialNumber || '')}</title>
<style>
  :root{
    --tier-active-color: ${activeColor};
    --tier-active-glow: ${activeColor}2e;
    --tier-d: #7a1f1f;
    --tier-e: #c9531e;
    --tier-s: #d9a41e;
    --tier-h: #1f6e34;
    --ink: #1c1c1c;
    --ink-soft: #4a4a4a;
    --paper: #ffffff;
    --card-bg: #ffffff;
    --card-border: #e2e8f0;
    --hairline: #e2e8f0;
    --bar-assessed: #2f7d3c;
    --bar-achieved: #7a2020;
  }
  *{ box-sizing: border-box; margin:0; padding:0; }
  html,body{
    background:#e9e9e9;
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: var(--ink);
  }
  .cert-page{
    width: 900px;
    height: 1270px;
    margin: 24px auto;
    background: var(--paper);
    position: relative;
    padding: 18px 56px 36px;
    overflow: hidden;
    box-shadow: 0 6px 30px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .cert-page::before,.cert-page::after{
    content:""; position:absolute; width:14px; top:0; bottom:0;
  }
  .cert-page::before{ left:0; background:linear-gradient(180deg,var(--tier-h) 0%,var(--tier-h) 55%,var(--tier-d) 55%,var(--tier-d) 100%); }
  .cert-page::after{ right:0; background:linear-gradient(180deg,var(--tier-d) 0%,var(--tier-d) 45%,var(--tier-h) 45%,var(--tier-h) 100%); }
  .cert-body{ display: flex; flex-direction: column; position: relative; z-index: 1; }

  /* HEADER */
  .cert-header{ text-align:center; margin-bottom:4px; }
  .cert-header .leaf-mark, .cert-header .logo-img{ width:auto; height:52px; max-width:260px; object-fit:contain; margin:0 auto 2px; display:block; }
  .cert-header .desh-wordmark-img{ height:58px; width:auto; object-fit:contain; margin:0 auto; display:block; }

  /* RECIPIENT */
  .recipient-block{ text-align:center; margin:12px 0 10px; line-height:1.6; }
  .recipient-block .field{ font-weight:800; font-size:14.5px; text-transform:uppercase; letter-spacing:0.2px; }
  .recipient-block .connector{ font-weight:400; font-size:12.5px; color:var(--ink-soft); }

  /* SCORE CARD */
  .score-card{ display:flex; align-items:stretch; gap:24px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:10px; padding:12px 20px; margin-bottom:18px; }
  .score-card .leaf-col{ display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:140px; border-right:1px solid var(--card-border); padding-right:20px; }
  .score-card .leaf-col svg{ width:76px; height:102px; }
  .score-card .leaf-col img{ height:102px; width:auto; max-width:120px; object-fit:contain; }
  .score-card .leaf-col .tier-name{ font-weight:800; font-size:13px; margin-top:5px; color:var(--tier-active-color); }
  .score-card .leaf-col .tier-range{ font-size:11px; color:var(--ink-soft); margin-top:2px; }
  .score-card .score-col{ flex:1; display:flex; flex-direction:column; justify-content:center; }
  .score-col .score-label{ font-size:11px; font-weight:700; letter-spacing:0.5px; color:var(--ink-soft); }
  .score-col .score-value{ font-size:34px; font-weight:900; color:var(--tier-active-color); line-height:1.1; margin:2px 0 4px 0; }
  .score-col .score-points{ font-size:12.5px; color:var(--ink-soft); margin-bottom:6px; }
  .score-col .score-divider{ height:1px; background:var(--hairline); margin:6px 0; }
  .score-col .mini-tier{ display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; margin-bottom:6px; }
  .score-col .mini-tier svg{ width:18px; height:24px; }
  .score-col .mini-tier img{ height:24px; width:auto; max-width:24px; object-fit:contain; }
  .score-col .status-line{ font-size:12.5px; font-weight:700; }
  .score-col .status-line .status-grade{ color:var(--tier-active-color); }

  /* TABLE + CHART */
  .assessment-row{ display:flex; gap:20px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:10px; padding:12px 18px; margin-bottom:18px; }
  .assessment-row .table-col{ flex:1.1; }
  .assessment-row .chart-col{ flex:1; display:flex; flex-direction:column; }
  .table-col h3{ font-size:12px; letter-spacing:0.3px; margin:0 0 6px; text-transform:uppercase; font-weight:800; }
  table.tar-table{ width:100%; border-collapse:collapse; font-size:11.5px; }
  table.tar-table th{ text-align:left; text-transform:uppercase; font-size:10.5px; padding:4px 6px 6px; border-bottom:2px solid var(--ink); color:var(--ink-soft); font-weight:700; }
  table.tar-table th:last-child,table.tar-table td:last-child{ text-align:right; }
  table.tar-table td{ padding:4px 6px; border-bottom:1px solid var(--hairline); }
  table.tar-table tr.total-row td{ font-weight:800; border-top:2px solid var(--ink); border-bottom:none; }
  .chart-col .chart-legend{ display:flex; gap:14px; justify-content:center; font-size:10px; margin-bottom:4px; }
  .chart-col .chart-legend span{ display:flex; align-items:center; gap:4px; }
  .chart-col .legend-dot{ width:9px; height:9px; display:inline-block; border-radius:2px; }
  .chart-col canvas{ max-width:100%; }

  /* RATING SCALE */
  .rating-scale{ display:flex; justify-content:center; align-items:flex-end; gap:28px; margin:16px 0 10px; position:relative; }
  .rating-scale .tier-item{ display:flex; flex-direction:column; align-items:center; opacity:0.35; filter:grayscale(55%); transition:all .2s ease; }
  .rating-scale .tier-item.is-achieved{ opacity:1; filter:none; transform:scale(1.18); }
  .rating-scale .tier-item svg{ width:32px; height:42px; }
  .rating-scale .tier-item img{ height:42px; width:auto; max-width:50px; object-fit:contain; }
  .rating-scale .achieved-tag{ position:absolute; top:-16px; right:20%; font-size:11px; font-weight:800; letter-spacing:0.5px; color:var(--ink); }

  /* HISTORY */
  .history-block{ text-align:center; margin:12px 0 12px; font-size:12px; color:var(--ink); line-height:1.6; }
  .history-block .hist-line b{ font-weight:700; }

  /* FOOTER */
  .cert-footer{ text-align:center; position: relative; z-index: 2; width: 100%; }
  .qr-wrap{ text-align:center; margin-bottom:10px; }
  .qr-wrap img{ width:72px; height:72px; }
  .meta-line{ text-align:center; font-size:11px; color:var(--ink-soft); margin-bottom:10px; letter-spacing:0.2px; }
  .meta-line span{ margin:0 8px; }
  .partners-row{ display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; padding-top:10px; border-top:1px solid var(--hairline); }
  .partners-row img{ height:24px; width:auto; object-fit:contain; filter:grayscale(35%); opacity:0.9; }

  @media print{
    html,body{ background:none; margin:0; padding:0; }
    .cert-page{ margin:0; box-shadow:none; width:210mm; height:297mm; }
    @page{ size:A4 portrait; margin:0; }
  }
</style>
</head>
<body>
<div class="cert-page" id="certRoot">
<div class="cert-body">

  <header class="cert-header">
    ${logoHTML}
    <img class="desh-wordmark-img" src="/images/logo (1).png" alt="DESH Logo" />
  </header>

  <section class="recipient-block">
    <div class="field">Recipient Name: <span>${escHtml(data.recipientName || '')}</span></div>
    <div class="connector">For the project:</div>
    <div class="field">Project Name: <span>${escHtml(data.projectName || '')}</span></div>
    <div class="connector">Located at:</div>
    <div class="field">Location: <span>${escHtml(data.location || '')}</span></div>
  </section>

  <section class="score-card">
    <div class="leaf-col">
      ${leafHTML}
      <div class="tier-name">${escHtml(formatLeafName(activeLabel))}</div>
      <div class="tier-range">${escHtml(activeRange)}</div>
    </div>
    <div class="score-col">
      <div class="score-label">SCORE:</div>
      <div class="score-value">${data.scorePercent}%</div>
      <div class="score-points">${data.achievedPoints}/${data.totalPoints} PTS</div>
      <div class="score-divider"></div>
      <div class="mini-tier">
        ${miniLeafHTML}
        ${escHtml(formatLeafName(activeLabel))}
      </div>
      <div class="status-line">STATUS: ${escHtml(activeStatusText)} (<span class="status-grade">${activeStatusGrade}</span>)</div>
    </div>
  </section>

  <section class="assessment-row">
    <div class="table-col">
      <h3>Assessment Areas &amp; Performance</h3>
      <table class="tar-table" id="tarTable">
        <thead><tr><th>7 TAR</th><th>Achieved Score</th></tr></thead>
        <tbody>${categoriesRows}${totalRow}</tbody>
      </table>
    </div>
    <div class="chart-col">
      <div class="chart-legend">
        <span><i class="legend-dot" style="background:var(--bar-assessed)"></i>Assessed Points</span>
        <span><i class="legend-dot" style="background:var(--bar-achieved)"></i>Achieved Points</span>
      </div>
      <canvas id="tarChart" height="125"></canvas>
    </div>
  </section>

  <section class="rating-scale" id="ratingScale">
    <span class="achieved-tag">ACHIEVED &#8599;</span>
    ${tierItems}
  </section>

  <section class="history-block" id="historyBlock">
    ${historyHTML}
  </section>

</div>

  <div class="cert-footer">
    <div class="qr-wrap">
      <img crossorigin="anonymous" src="${escHtml(data.qrImageUrl || '')}" alt="Certificate verification QR code" onerror="this.style.opacity='0.3'">
    </div>

    <div class="meta-line">
      DATE OF ISSUE: ${escHtml(data.issueDate || '')}
      <span>|</span> VALID TILL: ${escHtml(data.expiryDate || '')}
      <span>|</span> SERIAL NO: ${escHtml(data.serialNumber || '')}
    </div>

    <div class="partners-row">
      ${partnersHTML}
    </div>
  </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script>
(function(){
  const chartData = ${chartDataJSON};
  const ctx = document.getElementById('tarChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        { label: 'Assessed Points', data: chartData.assessed, backgroundColor: '#2f7d3c', borderRadius: 3 },
        { label: 'Achieved Points', data: chartData.achieved, backgroundColor: '#7a2020', borderRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      animation: {
        onComplete: function() {
          window.chartRendered = true;
        }
      },
      scales: {
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
        y: { 
          beginAtZero: true, 
          ticks: { font: { size: 9 } }, 
          grid: { color: '#f1f5f9', drawBorder: false } 
        }
      }
    }
  });
})();
</script>
</body>
</html>`;
}
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Default blank form ───────────────────────────────────────────
function blankForm() {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(now.getFullYear() + 1);
  expiry.setDate(expiry.getDate() - 1);

  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    recipientName: '',
    projectName: '',
    location: '',
    scorePercent: 0,
    achievedPoints: 0,
    totalPoints: 150,
    ratingTier: 'H',
    categories: [
      { code: '1. CAR', achieved: 0, total: 30 },
      { code: '2. SSP', achieved: 0, total: 30 },
      { code: '3. MR',  achieved: 0, total: 20 },
      { code: '4. WWM', achieved: 0, total: 30 },
      { code: '5. ECE', achieved: 0, total: 20 },
      { code: '6. EER', achieved: 0, total: 20 },
      { code: '7. LSH', achieved: 0, total: 20 },
    ],
    history: [
      { year: now.getFullYear() - 1, label: 'YELLOW', percent: 65, points: '91/140' },
    ],
    qrImageUrl: '',
    issueDate: fmt(now),
    expiryDate: fmt(expiry),
    serialNumber: `DESH-${now.getFullYear()}-BAN-00001`,
  };
}

// ── Main CertificatePanel component ─────────────────────────────
export default function CertificatePanel({ project, onClose, onIssued }) {
  const axiosSecure = useAxiosSecure();
  const iframeRef = useRef(null);
  const [form, setForm] = useState(() => blankForm());
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [activeSection, setActiveSection] = useState('recipient'); // recipient | score | categories | history | meta

  // ── Generate (fetch from API) ─────────────────────────────────
  const fetchFromAPI = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosSecure.post('/manager/certificate/generate', { projectId: project._id });
      const d = res.data.certificateData;
      if (!d) { toast.error('No certificate data returned'); return; }


      const now = new Date(d.issuedAt || Date.now());

      const expiry = new Date(d.expiryAt || Date.now());
      const fmt = (dt) => new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      const cats = (d.breakdown || []).map((b, i) => ({
        code: `${i + 1}. ${b.abbr || b.fullName?.substring(0, 3).toUpperCase() || 'TAB'}`,
        achieved: b.achieved || 0,
        total: b.allocated || 20,
      }));

      const hist = (d.historicalScores || []).map(h => ({
        year: h.label?.match(/\d{4}/)?.[0] || new Date().getFullYear() - 1,
        label: (h.leafLevel || '').split(' ')[0].toUpperCase(),
        percent: h.scorePercent || 0,
        points: `${h.totalPoints || 0}/${h.maxPoints || 0}`,
      }));

      const verifyUrl = `https://desh-verify.example.com/${d.serialNumber}`;
      const qr = d.qrCodeDataUrl?.startsWith('http')
        ? d.qrCodeDataUrl
        : `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;

      setForm({
        recipientName: d.recipientName || '',
        projectName: d.projectTitle || project?.title || '',
        location: d.location || '',
        scorePercent: d.percentage || 0,
        achievedPoints: d.totalPoints || 0,
        totalPoints: d.maxPoints || 150,
        ratingTier: tierFromPercent(d.percentage || 0),
        categories: cats,
        history: hist,
        qrImageUrl: qr,
        issueDate: fmt(now),
        expiryDate: fmt(expiry),
        serialNumber: d.serialNumber || `DESH-${new Date().getFullYear()}-BAN-00001`,
        leafImageUrl: d.leafImageUrl ? (d.leafImageUrl.startsWith('data:') ? d.leafImageUrl : `${SERVER_BASE}${d.leafImageUrl}`) : null,
      });
      toast.success('Certificate data loaded from database');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate certificate data');
    } finally {
      setLoading(false);
    }

  }, [project._id, axiosSecure]);

    const [evalRules, setEvalRules] = useState([]);

  useEffect(() => {
    axiosSecure.get('/settings/eval-rules')
      .then(res => {
        if (res.data?.rules) {
          setEvalRules(res.data.rules);
        }
      })
      .catch(err => {
        console.error("Failed to load evaluation rules:", err);
      });
  }, [axiosSecure]);

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axiosSecure.get('/settings')
      .then(res => {
        if (res.data?.settings) {
          setSettings(res.data.settings);
        }
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
      });
  }, [axiosSecure]);

  useEffect(() => { fetchFromAPI(); }, [fetchFromAPI]);

  // ── Auto-update QR when serial changes ───────────────────────
  useEffect(() => {
    if (form.serialNumber) {
      const verifyUrl = `https://desh-verify.example.com/${form.serialNumber}`;
      setForm(prev => ({
        ...prev,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`,
      }));
    }
  }, [form.serialNumber]);

  // ── Auto-update tier when score changes ──────────────────────
  useEffect(() => {
    if (evalRules.length > 0) {
      const sorted = [...evalRules].sort((a, b) => b.minPercent - a.minPercent);
      const match = sorted.find(r => form.scorePercent >= r.minPercent && form.scorePercent <= r.maxPercent);
      if (match && form.ratingTier !== match.name) {
        setForm(prev => ({ ...prev, ratingTier: match.name }));
      }
    } else {
      const autoTier = tierFromPercent(form.scorePercent);
      if (form.ratingTier !== autoTier) {
        setForm(prev => ({ ...prev, ratingTier: autoTier }));
      }
    }
  }, [form.scorePercent, evalRules, form.ratingTier]);

  // ── iframe src doc ───────────────────────────────────────────
  const certHTML = buildCertificateHTML(form, settings, evalRules);

  // ── Field helpers ─────────────────────────────────────────────
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setCat = (i, field, val) => setForm(prev => {
    const cats = [...prev.categories];
    cats[i] = { ...cats[i], [field]: field === 'code' ? val : Number(val) };
    return { ...prev, categories: cats };
  });
  const setHist = (i, field, val) => setForm(prev => {
    const hist = [...prev.history];
    hist[i] = { ...hist[i], [field]: field === 'year' || field === 'percent' ? Number(val) : val };
    return { ...prev, history: hist };
  });
  const addHist = () => setForm(prev => ({
    ...prev,
    history: [...prev.history, { year: new Date().getFullYear() - prev.history.length, label: 'YELLOW', percent: 60, points: '90/150' }],
  }));
  const removeHist = (i) => setForm(prev => ({ ...prev, history: prev.history.filter((_, idx) => idx !== i) }));

  // ── Print ─────────────────────────────────────────────────────
  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow.print();
  };

  // ── Download PDF using print dialog in new window ─────────────
  const handleDownload = () => {
    const win = window.open('', '_blank', 'width=1100,height=900');
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups'); return; }
    win.document.write(certHTML.replace('</body>', `
      <div style="position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,0.97);
        padding:10px 22px;display:flex;align-items:center;gap:14px;z-index:9999;
        border-bottom:1px solid #ddd;box-shadow:0 2px 14px rgba(0,0,0,.08)">
        <div style="flex:1;font-family:Montserrat,sans-serif;font-weight:800;font-size:13px;color:#111">
          ${escHtml(form.serialNumber)} — DESH Certificate
        </div>
        <button onclick="window.print()" style="
          background:#1f6e34;color:#fff;border:none;padding:9px 22px;border-radius:9px;
          font-size:13px;font-weight:700;cursor:pointer;font-family:Montserrat,sans-serif">
          🖨 Print / Save as PDF
        </button>
        <button onclick="window.close()" style="
          background:#f3f4f6;color:#555;border:1px solid #ddd;padding:9px 16px;border-radius:9px;
          font-size:13px;font-weight:600;cursor:pointer">✕ Close</button>
      </div>
      <style>
        @media print { [style*="position:fixed"] { display:none!important; } body{padding-top:0!important;} }
        body { padding-top: 56px; }
      </style>
      </body>`));
    win.document.close();
  };

  // ── Approve & Issue ──────────────────────────────────────────
  const handleApprove = async () => {
    if (!window.confirm('Issue this certificate? The project status will change to CERTIFICATE ISSUED and the user will be able to download it.')) return;
    setApproving(true);
    const toastId = toast.loading('Issuing certificate…');
    try {
      // Capture the cert page as PDF via html2canvas + jsPDF in a hidden iframe
      const pdfDataUrl = await captureCertAsPdf(certHTML);

      await axiosSecure.post('/manager/certificate/approve', {
        projectId: project._id,
        pdfData: pdfDataUrl,
        serialNumber: form.serialNumber,
        issuedAt: form.issueDate,
        expiryAt: form.expiryDate,
        recipientName: form.recipientName,
        projectTitle: form.projectName,
        location: form.location,
        historicalScores: form.history.map(h => ({
          label: `${h.year} Label`,
          leafLevel: `${h.label} Leaf`,
          scorePercent: h.percent,
          totalPoints: parseInt(h.points?.split('/')[0] || 0),
          maxPoints: parseInt(h.points?.split('/')[1] || 150),
        })),
      });

      toast.success('Certificate issued successfully! The professional can now download it.', { id: toastId });
      onIssued?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue certificate', { id: toastId });
    } finally {
      setApproving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,20,10,0.92)',
      backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        padding: '12px 20px',
        background: 'linear-gradient(90deg,#051A0A,#0D3B1A)',
        borderBottom: '1px solid rgba(52,201,97,0.2)',
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#1A7A35,#22A84B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🏅</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 14, color: '#fff', margin: 0 }}>
              Certificate Studio
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project?.title}
            </p>
          </div>
        </div>

        {/* Tier badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 99,
          background: `${TIER_HEX[form.ratingTier]?.hex}22`,
          border: `1px solid ${TIER_HEX[form.ratingTier]?.hex}66`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: TIER_HEX[form.ratingTier]?.hex }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: TIER_HEX[form.ratingTier]?.hex, fontFamily: 'Montserrat,sans-serif' }}>
            {TIER_HEX[form.ratingTier]?.label} Leaf · {form.scorePercent}%
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={fetchFromAPI} disabled={loading} style={btnStyle('#1A3D28', '#22A84B', loading)}>
            {loading ? '⟳ Loading…' : '↺ Reload from DB'}
          </button>
          <button onClick={handlePrint} style={btnStyle('#1a2d3a', '#3B82F6')}>
            🖨 Print
          </button>
          <button onClick={handleDownload} style={btnStyle('#1a2d3a', '#60A5FA')}>
            ⬇ Download PDF
          </button>
          <button onClick={handleApprove} disabled={approving} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10, border: 'none', cursor: approving ? 'wait' : 'pointer',
            background: approving ? '#888' : 'linear-gradient(135deg,#1A7A35,#22A84B)',
            color: '#fff', fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
            fontSize: 13, opacity: approving ? 0.7 : 1,
            boxShadow: approving ? 'none' : '0 4px 16px rgba(34,168,75,0.4)',
            transition: 'all 0.2s',
          }}>
            {approving ? '⟳ Issuing…' : '✓ Approve & Issue'}
          </button>
          <button onClick={onClose} style={btnStyle('#3d1a1a', '#f87171')}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* ── Body: form + preview ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT PANEL: editable form ── */}
        <div style={{
          width: 380, flexShrink: 0,
          background: '#0a1f0f',
          borderRight: '1px solid rgba(52,201,97,0.15)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Section tabs */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 2,
            padding: '10px 12px', borderBottom: '1px solid rgba(52,201,97,0.1)',
            position: 'sticky', top: 0, background: '#0a1f0f', zIndex: 2,
          }}>
            {[
              { key: 'recipient', label: '👤 Recipient' },
              { key: 'score', label: '📊 Score' },
              { key: 'categories', label: '📋 Categories' },
              { key: 'history', label: '📅 History' },
              { key: 'meta', label: '🔑 Meta' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                style={{
                  padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat,sans-serif',
                  background: activeSection === s.key ? 'rgba(34,168,75,0.25)' : 'rgba(255,255,255,0.05)',
                  color: activeSection === s.key ? '#5DD882' : 'rgba(255,255,255,0.4)',
                  borderBottom: activeSection === s.key ? '2px solid #22A84B' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >{s.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(34,168,75,0.2)', borderTopColor: '#22A84B', animation: 'cspin 0.8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading certificate data…</p>
              <style>{`@keyframes cspin{to{transform:rotate(360deg);}}`}</style>
            </div>
          ) : (
            <div style={{ flex: 1, padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── RECIPIENT ── */}
              {activeSection === 'recipient' && <>
                <FormField label="Recipient / Organization Name">
                  <input value={form.recipientName} onChange={e => set('recipientName', e.target.value)} style={inputStyle} placeholder="e.g. Reliable Eco-Developers Ltd." />
                </FormField>
                <FormField label="Project Name">
                  <input value={form.projectName} onChange={e => set('projectName', e.target.value)} style={inputStyle} placeholder="e.g. Shuchi Eco-Resort Development" />
                </FormField>
                <FormField label="Project Location / Address">
                  <textarea value={form.location} onChange={e => set('location', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="e.g. Sector 5, Paba Upazila, Rajshahi" />
                </FormField>
              </>}

              {/* ── SCORE ── */}
              {activeSection === 'score' && <>
                <FormField label="Score Percentage">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" min={0} max={100} value={form.scorePercent} onChange={e => set('scorePercent', Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>%</span>
                  </div>
                </FormField>
                <FormField label="Achieved Points">
                  <input type="number" min={0} value={form.achievedPoints} onChange={e => set('achievedPoints', Number(e.target.value))} style={inputStyle} />
                </FormField>
                <FormField label="Total Points (Max)">
                  <input type="number" min={1} value={form.totalPoints} onChange={e => set('totalPoints', Number(e.target.value))} style={inputStyle} />
                </FormField>
                <FormField label="Rating Tier (auto-set from score)">
                  <select value={form.ratingTier} onChange={e => set('ratingTier', e.target.value)} style={inputStyle}>
                    <option value="H">H — Green Leaf (80–100%)</option>
                    <option value="S">S — Yellow Leaf (60–79%)</option>
                    <option value="E">E — Orange Leaf (40–59%)</option>
                    <option value="D">D — Red Leaf (0–39%)</option>
                  </select>
                </FormField>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: `${TIER_HEX[form.ratingTier]?.hex}18`, border: `1px solid ${TIER_HEX[form.ratingTier]?.hex}44` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: TIER_HEX[form.ratingTier]?.hex, fontFamily: 'Montserrat,sans-serif' }}>
                    {TIER_HEX[form.ratingTier]?.label} Leaf · {TIER_HEX[form.ratingTier]?.range}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    Status: {TIER_HEX[form.ratingTier]?.statusText}
                  </p>
                </div>
              </>}

              {/* ── CATEGORIES ── */}
              {activeSection === 'categories' && <>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat,sans-serif' }}>
                  Edit the 7 TAR assessment area scores
                </p>
                {form.categories.map((cat, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, alignItems: 'end' }}>
                    <FormField label={i === 0 ? 'Category Code' : undefined}>
                      <input value={cat.code} onChange={e => setCat(i, 'code', e.target.value)} style={inputStyle} placeholder="e.g. 1. CAR" />
                    </FormField>
                    <FormField label={i === 0 ? 'Achieved' : undefined}>
                      <input type="number" min={0} value={cat.achieved} onChange={e => setCat(i, 'achieved', e.target.value)} style={inputStyle} />
                    </FormField>
                    <FormField label={i === 0 ? 'Total' : undefined}>
                      <input type="number" min={0} value={cat.total} onChange={e => setCat(i, 'total', e.target.value)} style={inputStyle} />
                    </FormField>
                  </div>
                ))}
              </>}

              {/* ── HISTORY ── */}
              {activeSection === 'history' && <>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat,sans-serif' }}>
                  Past years' performance (shown at the bottom of the certificate)
                </p>
                {form.history.map((h, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat,sans-serif' }}>YEAR {i + 1}</span>
                      <button onClick={() => removeHist(i)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>✕ Remove</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 70px 1fr', gap: 8 }}>
                      <FormField label="Year">
                        <input type="number" value={h.year} onChange={e => setHist(i, 'year', e.target.value)} style={inputStyle} />
                      </FormField>
                      <FormField label="Label (YELLOW/GREEN…)">
                        <input value={h.label} onChange={e => setHist(i, 'label', e.target.value.toUpperCase())} style={inputStyle} placeholder="YELLOW" />
                      </FormField>
                      <FormField label="%">
                        <input type="number" min={0} max={100} value={h.percent} onChange={e => setHist(i, 'percent', e.target.value)} style={inputStyle} />
                      </FormField>
                      <FormField label="Points (e.g. 91/140)">
                        <input value={h.points} onChange={e => setHist(i, 'points', e.target.value)} style={inputStyle} placeholder="91/140" />
                      </FormField>
                    </div>
                  </div>
                ))}
                {form.history.length < 5 && (
                  <button onClick={addHist} style={{
                    padding: '8px 14px', borderRadius: 9, border: '1.5px dashed rgba(34,168,75,0.4)',
                    background: 'transparent', color: '#5DD882', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', transition: 'all 0.15s',
                  }}>+ Add Year</button>
                )}
              </>}

              {/* ── META ── */}
              {activeSection === 'meta' && <>
                <FormField label="Serial Number">
                  <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} style={inputStyle} placeholder="DESH-2026-BAN-00123" />
                </FormField>
                <FormField label="Issue Date">
                  <input value={form.issueDate} onChange={e => set('issueDate', e.target.value)} style={inputStyle} placeholder="June 20, 2026" />
                </FormField>
                <FormField label="Expiry Date">
                  <input value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} style={inputStyle} placeholder="June 19, 2027" />
                </FormField>
                <FormField label="QR Code URL (auto-generated)">
                  <input value={form.qrImageUrl} onChange={e => set('qrImageUrl', e.target.value)} style={inputStyle} placeholder="https://api.qrserver.com/..." />
                </FormField>
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat,sans-serif', marginBottom: 6 }}>
                    QR CODE PREVIEW
                  </p>
                  {form.qrImageUrl ? (
                    <img src={form.qrImageUrl} alt="QR" style={{ width: 80, height: 80, borderRadius: 8, background: '#fff', padding: 4 }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      QR
                    </div>
                  )}
                </div>
              </>}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: live iframe preview ── */}
        <div style={{ flex: 1, minWidth: 0, background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 16px', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat,sans-serif' }}>
              LIVE PREVIEW — CERTIFICATE
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              Updates instantly as you edit
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            <iframe
              ref={iframeRef}
              srcDoc={certHTML}
              title="Certificate Preview"
              style={{
                width: '100%',
                minHeight: 900,
                border: 'none',
                borderRadius: 8,
                display: 'block',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Capture certificate as PDF data URL ─────────────────────────
async function captureCertAsPdf(certHTML) {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  // Create a hidden isolated iframe to render the certificate without host CSS bleeding.
  // We run it as a standard same-origin iframe to execute our trusted Chart.js script without console warnings.
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:900px;height:1270px;opacity:0.01;pointer-events:none;z-index:-1000;border:none;';
  document.body.appendChild(iframe);

  // Set the srcdoc to render the full HTML
  iframe.srcdoc = certHTML;

  // Wait for iframe document to initialize and load
  await new Promise((resolve) => {
    iframe.onload = resolve;
  });

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Ensure all images inside the iframe are fully loaded before rendering
  const images = Array.from(iframeDoc.querySelectorAll('img'));
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // Poll for Chart.js rendering to be completely finished (max 6 seconds timeout)
  let checkCount = 0;
  while (!iframe.contentWindow?.chartRendered && checkCount < 60) {
    await new Promise(r => setTimeout(r, 100));
    checkCount++;
  }

  try {
    const certEl = iframeDoc.querySelector('.cert-page') || iframeDoc.body;
    const canvas = await html2canvas(certEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 900,
      allowTaint: false,
    });

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const printW = pageW;
    const imgH = (canvas.height / canvas.width) * printW;

    let drawW = pageW;
    let drawH = imgH;
    let xOffset = 0;
    let yOffset = 0;

    // Strict single-page output constraints - scale down proportionally to fit inside A4 page height
    if (drawH > pageH) {
      drawH = pageH;
      drawW = (canvas.width / canvas.height) * pageH;
      xOffset = (pageW - drawW) / 2;
    } else {
      yOffset = (pageH - drawH) / 2;
    }

    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', xOffset, yOffset, drawW, drawH);

    return doc.output('datauristring');
  } finally {
    document.body.removeChild(iframe);
  }
}

// ── Small UI helpers ─────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
          fontFamily: 'Montserrat,sans-serif', marginBottom: 5,
        }}>{label}</label>
      )}
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(52,201,97,0.2)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e2f5ea', fontSize: 13, fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s',
};

function btnStyle(bg, accent, disabled) {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 9, border: `1px solid ${accent}44`,
    background: bg, color: accent,
    fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 12,
    cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  };
}
