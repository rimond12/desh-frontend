// ===== Calculation Engine (MERN port) =====
// This module mirrors the logic from the original engine.js

export function getNum(cell) {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === "number") return isFinite(cell) ? cell : 0;
  if (typeof cell === "object") {
    const val = cell.numValue ?? cell.num_value ?? cell.numVal ?? cell.numeric_value ?? cell.numericValue ?? cell.rawValue ?? (typeof cell.value === "number" ? cell.value : undefined) ?? cell.v ?? cell.area ?? 0;
    const n = parseFloat(val);
    return isFinite(n) ? n : 0;
  }
  const n = parseFloat(cell);
  return isFinite(n) ? n : 0;
}

export function isHidden(item) {
  return item?.hidden === true || item?.visible === false;
}

// ── Split table helpers ───────────────────────────────────────────────────────

export function parseTableNumbers(tableNo) {
  if (Array.isArray(tableNo)) {
    const nums = tableNo.map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
    return nums.length ? [...new Set(nums)].sort((a, b) => a - b) : [1];
  }
  if (typeof tableNo === "number") {
    return isNaN(tableNo) || tableNo < 1 ? [1] : [Math.floor(tableNo)];
  }
  if (!tableNo) return [1];
  const parts = String(tableNo)
    .split(/[,|\s]+/)
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n > 0);
  return parts.length ? [...new Set(parts)].sort((a, b) => a - b) : [1];
}

export function formatTableNumbers(tableNo) {
  const nums = parseTableNumbers(tableNo);
  return nums.join(", ");
}

export function getSectionTableGroups(columns = [], tableColumnOrders = {}, tableNames = {}) {
  const tableMap = {};
  
  columns.forEach(col => {
    const tableNums = parseTableNumbers(col.table_no);
    tableNums.forEach(tNum => {
      if (!tableMap[tNum]) tableMap[tNum] = [];
      tableMap[tNum].push(col);
    });
  });

  // Also include any table numbers that exist in tableNames or tableColumnOrders
  Object.keys(tableNames || {}).forEach(k => {
    const n = parseInt(k);
    if (!isNaN(n) && n > 0 && !tableMap[n]) {
      tableMap[n] = [];
    }
  });

  const sortedTableNums = Object.keys(tableMap)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedTableNums.length === 0) {
    const defaultName = tableNames?.[1] || tableNames?.["1"] || "Table 1";
    return [{ tableNo: 1, name: defaultName, columns: [] }];
  }

  return sortedTableNums.map(tNum => {
    let cols = tableMap[tNum] || [];
    const customOrder = tableColumnOrders?.[tNum] || tableColumnOrders?.[String(tNum)];
    if (Array.isArray(customOrder) && customOrder.length > 0) {
      cols = [...cols].sort((a, b) => {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }
    const customName = tableNames?.[tNum] || tableNames?.[String(tNum)] || `Table ${tNum}`;
    return { tableNo: tNum, name: customName, columns: cols };
  });
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
  // JSON.parse always produces string-keyed objects, so coerce secOrder to string
  return parseFloat(data.sums?.[String(secOrder)]?.[summaryId] ?? data.sums?.[secOrder]?.[summaryId] ?? 0) || 0;
}

export function getCrossCalcAggregate(calcOrder, secOrder, fn, colId, calcOrderMap, crossCalcCache) {
  const calcId = calcOrderMap[calcOrder] || calcOrder;
  const data = loadCrossCalcData(calcId, crossCalcCache);
  // JSON.parse always produces string-keyed objects, so coerce secOrder to string
  const rows = data.rows?.[String(secOrder)] || data.rows?.[secOrder] || [];
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
    if (srcCell === null || srcCell === undefined) {
      row[col.id] = { rawValue: 0, numValue: 0 };
      return;
    }

    const rawField = col.source_field !== undefined && col.source_field !== null ? String(col.source_field).trim() : "numValue";
    const field = rawField || "numValue";
    const fieldLower = field.toLowerCase();
    let val = undefined;

    if (typeof srcCell === "number") {
      val = srcCell;
    } else if (typeof srcCell === "string") {
      val = srcCell;
    } else if (typeof srcCell === "object") {
      if (
        !field ||
        fieldLower === "numvalue" ||
        fieldLower === "num_value" ||
        fieldLower === "numval" ||
        fieldLower === "numeric_value" ||
        fieldLower === "numericvalue" ||
        fieldLower === "num" ||
        fieldLower === "v" ||
        fieldLower === "value"
      ) {
        val =
          srcCell.numValue ??
          srcCell.num_value ??
          srcCell.numVal ??
          srcCell.numeric_value ??
          srcCell.numericValue ??
          srcCell.rawValue ??
          (typeof srcCell.value === "number" ? srcCell.value : undefined) ??
          srcCell.v ??
          (srcCell[field] !== undefined ? srcCell[field] : undefined);

        if ((val === undefined || val === 0) && srcCell._sourceRow) {
          const sRow = srcCell._sourceRow;
          if (sRow[col.source_col] !== undefined) {
            val = getNum(sRow[col.source_col]);
          } else if (sRow["fa"] !== undefined) {
            val = getNum(sRow["fa"]);
          } else if (sRow["area"] !== undefined) {
            val = getNum(sRow["area"]);
          } else {
            for (const k of Object.keys(sRow)) {
              const num = getNum(sRow[k]);
              if (num !== 0) { val = num; break; }
            }
          }
        }

        if (val === undefined) {
          val = getNum(srcCell);
        }
      } else if (fieldLower === "area") {
        val = srcCell.area ?? srcCell.numValue ?? (srcCell._sourceRow ? getNum(srcCell._sourceRow["area"]) : 0);
      } else if (fieldLower === "key" || fieldLower === "item_key") {
        val = srcCell.key ?? srcCell.item_key ?? srcCell.k ?? (srcCell._sourceRow?.[col.source_col]?.key) ?? "";
      } else if (fieldLower === "label" || fieldLower === "item_label") {
        val = srcCell.label ?? srcCell.item_label ?? srcCell.l ?? (srcCell.isOther ? srcCell.otherText : "") ?? (srcCell._sourceRow?.[col.source_col]?.label) ?? "";
      } else if (fieldLower === "text") {
        val = srcCell.text ?? srcCell.label ?? (srcCell._sourceRow?.[col.source_col]?.text) ?? "";
      } else {
        // Custom extra value field (e.g. value1, density, note, etc.)
        if (srcCell[field] !== undefined) {
          val = srcCell[field];
        } else if (srcCell.extra_values?.[field] !== undefined) {
          val = srcCell.extra_values[field];
        } else if (srcCell._sourceRow) {
          const sRow = srcCell._sourceRow;
          if (sRow[field] !== undefined) {
            val = typeof sRow[field] === "object" ? (sRow[field]?.rawValue ?? sRow[field]?.numValue ?? sRow[field]?.text ?? getNum(sRow[field])) : sRow[field];
          } else if (sRow[col.source_col]?.[field] !== undefined) {
            val = sRow[col.source_col][field];
          } else if (sRow[col.source_col]?.extra_values?.[field] !== undefined) {
            val = sRow[col.source_col].extra_values[field];
          } else {
            for (const k of Object.keys(sRow)) {
              if (sRow[k]?.[field] !== undefined) {
                val = sRow[k][field];
                break;
              }
              if (sRow[k]?.extra_values?.[field] !== undefined) {
                val = sRow[k].extra_values[field];
                break;
              }
            }
          }
        }
      }
    }

    if (val === undefined) val = 0;
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
    // Prefer sectionRows when the calc_ref section is editable (rows stored locally)
    const localRows = sectionRows[col.ref_section_order];
    if (localRows?.length) return localRows;
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

  const findDropdownCell = (row) => {
    if (!row) return null;
    if (row["fa"]) return row["fa"];
    for (const k of Object.keys(row)) {
      const c = row[k];
      if (c && typeof c === "object" && (c.key !== undefined || c.label !== undefined)) return c;
    }
    return null;
  };

  sourceRows.forEach(row => {
    const fa = findDropdownCell(row);
    if (!fa) return;
    const key = fa.isOther ? "__other__:" + fa.otherText : (fa.key || "");
    counts[key] = (counts[key] || 0) + 1;
  });

  sourceRows.forEach((row, i) => {
    const fa = findDropdownCell(row);
    if (!fa) return;
    const key = fa.isOther ? "__other__:" + fa.otherText : (fa.key || "");
    const label = fa.isOther ? fa.otherText || "Others" : fa.label || fa.key || "";
    idx[key] = (idx[key] || 0) + 1;
    const dispLabel = counts[key] > 1 ? `${label}(${idx[key]})` : label;
    opts.push({ rowIndex: i, key, label: dispLabel, area: getNum(row["area"]), faNumValue: getNum(fa) });
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
