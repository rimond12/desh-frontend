// ===== Calculation Engine (MERN port) =====
// This module mirrors the logic from the original engine.js

export function getNum(cell) {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === "number") return cell;
  if (typeof cell === "object") return parseFloat(cell.numValue ?? cell.v ?? 0) || 0;
  return parseFloat(cell) || 0;
}

export function isHidden(item) {
  return item?.hidden === true || item?.visible === false;
}

// ── Cross-calc data helpers ───────────────────────────────────────────────────

export function loadCrossCalcData(calcId, crossCalcCache) {
  if (crossCalcCache[calcId]) return crossCalcCache[calcId];
  try {
    const raw = localStorage.getItem(`ce_calc_${calcId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      crossCalcCache[calcId] = { rows: parsed.rows || {}, sums: parsed.sums || {} };
    } else {
      crossCalcCache[calcId] = { rows: {}, sums: {} };
    }
  } catch {
    crossCalcCache[calcId] = { rows: {}, sums: {} };
  }
  return crossCalcCache[calcId];
}

export function getCrossCalcSummary(calcOrder, secOrder, summaryId, calcOrderMap, crossCalcCache) {
  const calcId = calcOrderMap[calcOrder] || calcOrder;
  const data = loadCrossCalcData(calcId, crossCalcCache);
  return parseFloat(data.sums?.[secOrder]?.[summaryId] ?? 0) || 0;
}

export function getCrossCalcAggregate(calcOrder, secOrder, fn, colId, calcOrderMap, crossCalcCache) {
  const calcId = calcOrderMap[calcOrder] || calcOrder;
  const data = loadCrossCalcData(calcId, crossCalcCache);
  const rows = data.rows?.[secOrder] || [];
  const vals = rows.map(r => getNum(r[colId]));
  if (!vals.length) return 0;
  switch (fn.toUpperCase()) {
    case "SUM":   return vals.reduce((a, b) => a + b, 0);
    case "AVG":   return vals.reduce((a, b) => a + b, 0) / vals.length;
    case "MIN":   return Math.min(...vals);
    case "MAX":   return Math.max(...vals);
    case "COUNT": return vals.length;
    default:      return 0;
  }
}

// ── Expression evaluators ─────────────────────────────────────────────────────

export function evalExpr(expr, secOrder, rowIdx, sectionRows, summaries, calcOrderMap, crossCalcCache) {
  if (!expr) return 0;
  let e = String(expr);

  e = e.replace(/CAL\((\d+)\)\.SEC\((\d+)\)\.(SUM|AVG|MIN|MAX|COUNT)\((\w+)\)/gi, (_, cid, sid, fn, colId) =>
    getCrossCalcAggregate(parseInt(cid), parseInt(sid), fn.toUpperCase(), colId, calcOrderMap, crossCalcCache)
  );
  e = e.replace(/CAL\((\d+)\)\.SEC\((\d+)\)\.(\w+)/gi, (_, cid, sid, sumId) =>
    getCrossCalcSummary(parseInt(cid), parseInt(sid), sumId, calcOrderMap, crossCalcCache)
  );
  e = e.replace(/SEC\((\d+)\)\.(\w+)/gi, (_, n, sid) =>
    parseFloat(summaries[parseInt(n)]?.[sid] ?? 0) || 0
  );
  if (rowIdx !== undefined) {
    e = e.replace(/ROW\.([\w-]+)/gi, (_, colId) => {
      const cell = sectionRows[secOrder]?.[rowIdx]?.[colId];
      return parseFloat(getNum(cell)) || 0;
    });
  }

  try {
    if (/[^0-9+\-*/().\s]/.test(e)) return 0;
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + e + ")")();
    return isFinite(result) ? result : 0;
  } catch { return 0; }
}

export function evalSummaryExpr(formula, secOrder, sectionRows, summaries, calcOrderMap, crossCalcCache) {
  const rows = sectionRows[secOrder] || [];
  let expr = String(formula);

  expr = expr.replace(/CAL\((\d+)\)\.SEC\((\d+)\)\.(SUM|AVG|MIN|MAX|COUNT)\((\w+)\)/gi, (_, cid, sid, fn, colId) =>
    getCrossCalcAggregate(parseInt(cid), parseInt(sid), fn.toUpperCase(), colId, calcOrderMap, crossCalcCache)
  );
  expr = expr.replace(/CAL\((\d+)\)\.SEC\((\d+)\)\.(\w+)/gi, (_, cid, sid, sumId) =>
    getCrossCalcSummary(parseInt(cid), parseInt(sid), sumId, calcOrderMap, crossCalcCache)
  );

  const aggrFn = (fn, colId) => {
    const vals = rows.map(r => getNum(r[colId]));
    if (!vals.length) return 0;
    switch (fn.toUpperCase()) {
      case "SUM": return vals.reduce((a, b) => a + b, 0);
      case "AVG": return vals.reduce((a, b) => a + b, 0) / vals.length;
      case "MIN": return Math.min(...vals);
      case "MAX": return Math.max(...vals);
      default:    return 0;
    }
  };
  expr = expr.replace(/\b(SUM|AVG|MIN|MAX)\((\w+)\)/gi, (_, fn, colId) => aggrFn(fn, colId));
  expr = expr.replace(/\bCOUNT\(\)/gi, rows.length);
  expr = expr.replace(/SEC\((\d+)\)\.(\w+)/gi, (_, n, sid) =>
    parseFloat(summaries[parseInt(n)]?.[sid] ?? 0) || 0
  );

  try {
    if (/[^0-9+\-*/().\s]/.test(expr)) return 0;
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ")")();
    return isFinite(result) ? result : 0;
  } catch { return 0; }
}

// ── Locked & formula column resolvers ────────────────────────────────────────

export function resolveLockedCols(secOrder, rowIdx, sectionRows, sections) {
  const sec = sections.find(s => s.order_num === secOrder);
  if (!sec?.config?.columns) return;
  const row = sectionRows[secOrder]?.[rowIdx];
  if (!row) return;

  sec.config.columns.forEach(col => {
    if (col.type !== "locked") return;
    const existing = row[col.id];
    if (col.allow_unlock && existing?.unlocked) return;

    const srcCell = row[col.source_col];
    if (!srcCell) { row[col.id] = { numValue: 0 }; return; }

    let val = 0;
    if (col.source_field === "area") {
      val = srcCell.area ?? srcCell.numValue ?? 0;
    } else if (col.source_field === "numValue") {
      val = srcCell.numValue ?? srcCell.v ?? 0;
    } else {
      if (srcCell[col.source_field] !== undefined) {
        val = srcCell[col.source_field];
      } else if (srcCell._sourceRow) {
        val = getNum(srcCell._sourceRow[col.source_field]);
      }
    }
    const asNum = parseFloat(val);
    row[col.id] = {
      rawValue: val,
      text: typeof val === "string" ? val : undefined,
      numValue: Number.isFinite(asNum) ? asNum : 0,
    };
  });
}

export function resolveFormulaColumns(secOrder, rowIdx, sectionRows, sections, summaries, calcOrderMap, crossCalcCache) {
  const sec = sections.find(s => s.order_num === secOrder);
  if (!sec?.config?.columns) return;
  const row = sectionRows[secOrder]?.[rowIdx];
  if (!row) return;

  sec.config.columns.forEach(col => {
    if (col.type === "formula") {
      row[col.id] = { numValue: evalExpr(col.expr, secOrder, rowIdx, sectionRows, summaries, calcOrderMap, crossCalcCache) };
    }
  });
}

// ── Section summaries ─────────────────────────────────────────────────────────

export function calcSectionSummaries(secOrder, sectionRows, summaries, sections, calcOrderMap, crossCalcCache) {
  const sec = sections.find(s => s.order_num === secOrder);
  if (!sec?.config?.summaries) return;
  if (!summaries[secOrder]) summaries[secOrder] = {};
  sec.config.summaries.forEach(s => {
    summaries[secOrder][s.id] = evalSummaryExpr(s.formula, secOrder, sectionRows, summaries, calcOrderMap, crossCalcCache);
  });
}

export function calcFormulaSection(secOrder, sectionRows, summaries, sections, calcOrderMap, crossCalcCache) {
  const sec = sections.find(s => s.order_num === secOrder);
  if (!sec || sec.config.type !== "formula_display") return;
  if (!summaries[secOrder]) summaries[secOrder] = {};
  sec.config.formulas.forEach(f => {
    summaries[secOrder][f.id] = evalExpr(f.expr, secOrder, undefined, sectionRows, summaries, calcOrderMap, crossCalcCache);
  });
}

// ── Full recalc ───────────────────────────────────────────────────────────────

export function recalcAll(sectionRows, summaries, sections, calcOrderMap, crossCalcCache) {
  // Invalidate cross-calc cache
  Object.keys(crossCalcCache).forEach(k => delete crossCalcCache[k]);

  sections.forEach(sec => {
    const cfg = sec.config;
    if (cfg.type === "input_table") {
      const rows = sectionRows[sec.order_num] || [];
      rows.forEach((_, ri) => {
        resolveLockedCols(sec.order_num, ri, sectionRows, sections);
        resolveFormulaColumns(sec.order_num, ri, sectionRows, sections, summaries, calcOrderMap, crossCalcCache);
      });
      calcSectionSummaries(sec.order_num, sectionRows, summaries, sections, calcOrderMap, crossCalcCache);
    } else if (cfg.type === "formula_display") {
      calcFormulaSection(sec.order_num, sectionRows, summaries, sections, calcOrderMap, crossCalcCache);
    }
  });
}

// ── Section-ref helpers ───────────────────────────────────────────────────────

export function getRefSourceRows(col, sections, sectionRows, crossCalcRows) {
  if (col.type === "cross_calc_ref") {
    const key = `${col.ref_calc_id}_${col.ref_section_order}`;
    return crossCalcRows[key] || [];
  }
  const srcSec = sections.find(s => s.order_num === col.ref_section_order);
  if (srcSec?.config?.type === "calc_ref") {
    const key = `${srcSec.config.ref_calc_id}_${srcSec.config.ref_section_order}`;
    return crossCalcRows[key] || [];
  }
  return sectionRows[col.ref_section_order] || [];
}

export function buildRefOptions(sourceRows) {
  const counts = {};
  const idx = {};
  const opts = [];
  if (!sourceRows?.length) return opts;

  sourceRows.forEach(row => {
    const fa = row["fa"];
    if (!fa) return;
    const key = fa.isOther ? "__other__:" + fa.otherText : (fa.key || "");
    counts[key] = (counts[key] || 0) + 1;
  });

  sourceRows.forEach((row, i) => {
    const fa = row["fa"];
    if (!fa) return;
    const key = fa.isOther ? "__other__:" + fa.otherText : (fa.key || "");
    const label = fa.isOther ? fa.otherText || "Others" : fa.label || fa.key || "";
    idx[key] = (idx[key] || 0) + 1;
    const dispLabel = counts[key] > 1 ? `${label}(${idx[key]})` : label;
    opts.push({ rowIndex: i, key, label: dispLabel, area: getNum(row["area"]), faNumValue: fa.numValue || fa.v || 0 });
  });
  return opts;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function saveToStorage(calcId, sectionRows, summaries) {
  try {
    localStorage.setItem(`ce_calc_${calcId}`, JSON.stringify({ rows: sectionRows, sums: summaries }));
  } catch {}
}

export function loadFromStorage(calcId) {
  try {
    const raw = localStorage.getItem(`ce_calc_${calcId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ── Number formatting ─────────────────────────────────────────────────────────
export function fmtNum(val) {
  if (val === null || val === undefined) return "-";
  const n = parseFloat(val);
  if (!isFinite(n)) return "N/A";
  return n.toFixed(4).replace(/(\.\d*[1-9])0+$|\.0+$/, "$1");
}
