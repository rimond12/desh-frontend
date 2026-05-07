/**
 * CalcEngine.jsx — DESH-integrated Calculation Engine
 * Uses axiosSecure for admin API calls and plain fetch for public reads.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import useAxiosSecure from "../../hooks/useAxiosSecure.jsx";
import {
  getNum, isHidden, fmtNum,
  buildRefOptions, getRefSourceRows,
  resolveLockedCols, resolveFormulaColumns,
  saveToStorage, loadFromStorage, evalExpr,
} from "./calcEngine.js";
import "./calcEngine.css";

const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api") + "/calc";

async function publicGet(path) {
  const res = await fetch(API_BASE + path);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ getValue, className = "" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = String(getValue());
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(flash).catch(flash);
    else flash();
    function flash() { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };
  return (
    <button className={`ce-copy-btn${copied ? " copied" : ""} ${className}`} onClick={handleCopy} title="Copy value">
      {copied ? "✓" : "📋"}
    </button>
  );
}

// ── Cell Components ───────────────────────────────────────────────────────────

function DropdownCell({ col, row, dropdowns, onChange }) {
  const items = dropdowns[col.dropdown_master_id] || [];
  const cell = row[col.id];
  const selKey = cell?.key || "";
  return (
    <div>
      <select className="ce-select" value={selKey} onChange={e => {
        const key = e.target.value;
        if (key === "__other__") { onChange(col.id, { key: "__other__", label: "Others", numValue: 0, isOther: true, otherText: "" }); return; }
        const item = items.find(i => (i.item_key || i.k) === key);
        if (item) onChange(col.id, { key: item.item_key||item.k, label: item.item_label||item.l, numValue: item.num_value ?? item.v ?? 0, isOther: false, ...(item.extra_values||{}) });
        else onChange(col.id, null);
      }}>
        <option value="">-- Select --</option>
        {items.map(it => <option key={it._id||it.id||it.item_key||it.k} value={it.item_key||it.k}>{it.item_label||it.l}</option>)}
        {col.allow_others && <option value="__other__">Others</option>}
      </select>
      {selKey === "__other__" && (
        <input type="text" className="ce-others-input" placeholder="Enter option..."
          value={cell?.otherText||""} onChange={e => onChange(col.id, {...cell, otherText: e.target.value})} />
      )}
    </div>
  );
}

function NestedDropdownCell({ col, row, dropdowns, sec }) {
  const parentCell = row[col.parent_col];
  const parentColCfg = sec.config.columns?.find(c => c.id === col.parent_col);
  const allItems = dropdowns[parentColCfg?.dropdown_master_id] || [];
  const cell = row[col.id];
  if (!parentCell?.key) return <select className="ce-select" disabled><option>-- Select {col.parent_col} first --</option></select>;
  if (parentCell?.isOther) return <span className="ce-locked">Others</span>;
  const parentItem = allItems.find(i => (i.item_key||i.k) === parentCell.key);
  const children = parentItem?.children || [];
  return (
    <select className="ce-select" value={cell?.key||""} onChange={e => {
      const key = e.target.value;
      if (!key) { return; }
      if (key === "__other__") { return; }
      const found = children.find(c => (c.item_key||c.k) === key);
      if (found) return; // handled by parent
    }}>
      <option value="">-- Select --</option>
      {children.map(c => <option key={c._id||c.id||c.item_key||c.k} value={c.item_key||c.k}>{c.item_label||c.l}</option>)}
      {col.allow_others && <option value="__other__">Others</option>}
    </select>
  );
}

function SectionRefCell({ col, row, sections, sectionRows, crossCalcRows, onChange }) {
  const sourceRows = getRefSourceRows(col, sections, sectionRows, crossCalcRows);
  const opts = buildRefOptions(sourceRows);
  const cell = row[col.id];
  const selIdx = cell?.rowIndex !== undefined ? cell.rowIndex : -1;
  return (
    <select className="ce-select" value={selIdx === -1 ? "" : selIdx} onChange={e => {
      const val = e.target.value;
      if (val === "") { onChange(col.id, null); return; }
      const rowIndex = parseInt(val);
      const srcRow = sourceRows[rowIndex] || {};
      const area = getNum(srcRow["area"]);
      const opt = opts.find(o => o.rowIndex === rowIndex);
      onChange(col.id, { rowIndex, label: opt?.label||"", area, numValue: area, _sourceRow: srcRow });
    }}>
      <option value="">-- Select --</option>
      {opts.map(o => <option key={o.rowIndex} value={o.rowIndex}>{o.label}</option>)}
    </select>
  );
}

function LockedCell({ col, row, onUnlockEdit, onToggleLock }) {
  const cell = row[col.id];
  const rawVal = cell ? (cell.rawValue ?? cell.text ?? cell.numValue ?? cell.v ?? 0) : 0;
  const numVal = parseFloat(rawVal);
  const display = Number.isFinite(numVal) ? fmtNum(numVal) : String(rawVal ?? "");
  const isUnlocked = cell?.unlocked === true;
  if (col.allow_unlock && isUnlocked) {
    return (
      <div className="ce-locked-wrap">
        <input type="number" className="ce-input ce-input-num" value={Number.isFinite(numVal) ? numVal : 0} step="any"
          onChange={e => onUnlockEdit(col.id, parseFloat(e.target.value)||0)} />
        <button className="ce-lock-btn unlocked" onClick={() => onToggleLock(col.id)} title="Re-lock">🔓</button>
      </div>
    );
  }
  if (col.allow_unlock) {
    return (
      <div className="ce-locked-wrap">
        <span className="ce-locked">{display}</span>
        <button className="ce-lock-btn" onClick={() => onToggleLock(col.id)} title="Unlock">🔒</button>
      </div>
    );
  }
  return <span className="ce-locked">{display || "-"}</span>;
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function TableRow({ sec, rowIdx, sections, sectionRows, summaries, crossCalcRows, dropdowns, onCellChange, onRemove }) {
  const row = sectionRows[sec.order_num]?.[rowIdx] || {};
  const visibleCols = (sec.config.columns||[]).filter(col => !isHidden(col));

  function handleChange(colId, value) { onCellChange(sec.order_num, rowIdx, colId, value, sec); }
  function handleUnlockEdit(colId, val) { onCellChange(sec.order_num, rowIdx, colId, { numValue: val, unlocked: true }, sec); }
  function handleToggleLock(colId) {
    const cell = row[colId] || { numValue: 0 };
    if (cell.unlocked) { const next={...cell}; delete next.unlocked; onCellChange(sec.order_num, rowIdx, colId, next, sec, true); }
    else { onCellChange(sec.order_num, rowIdx, colId, {...cell, unlocked: true}, sec); }
  }

  function renderCell(col) {
    const cell = row[col.id];
    switch(col.type) {
      case "dropdown": return <DropdownCell col={col} row={row} dropdowns={dropdowns} onChange={handleChange} />;
      case "nested_dropdown": return <NestedDropdownCell col={col} row={row} dropdowns={dropdowns} sec={sec} />;
      case "section_ref": case "cross_calc_ref":
        return <SectionRefCell col={col} row={row} sections={sections} sectionRows={sectionRows} crossCalcRows={crossCalcRows} onChange={handleChange} />;
      case "locked": return <LockedCell col={col} row={row} onUnlockEdit={handleUnlockEdit} onToggleLock={handleToggleLock} />;
      case "formula": { const val = cell?.numValue ?? 0; return <span className="ce-formula">{isNaN(val)?"-":fmtNum(val)}</span>; }
      case "number": return <input type="number" className="ce-input ce-input-num" value={cell?.numValue??""} step="any" onChange={e=>handleChange(col.id,{numValue:parseFloat(e.target.value)||0})} />;
      case "text": return <input type="text" className="ce-input" value={cell?.text??""} onChange={e=>handleChange(col.id,{text:e.target.value,numValue:0})} />;
      default: return <span>?</span>;
    }
  }

  return (
    <tr>
      {visibleCols.map(col => <td key={col.id}>{renderCell(col)}</td>)}
      <td><button className="ce-remove-btn" onClick={onRemove} title="Remove">✕</button></td>
    </tr>
  );
}

// ── Section Components ────────────────────────────────────────────────────────

function InputTableSection({ sec, sections, sectionRows, setSectionRows, summaries, crossCalcRows, dropdowns, onRecalc }) {
  const rows = sectionRows[sec.order_num] || [];
  const visibleCols = (sec.config.columns||[]).filter(c=>!isHidden(c));
  const visibleSums = (sec.config.summaries||[]).filter(s=>!isHidden(s));

  function handleCellChange(secOrder, rowIdx, colId, value, secObj) {
    setSectionRows(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[secOrder]) next[secOrder] = [];
      if (!next[secOrder][rowIdx]) next[secOrder][rowIdx] = {};
      next[secOrder][rowIdx][colId] = value;
      secObj.config.columns?.forEach(c => {
        if (c.type === "nested_dropdown" && c.parent_col === colId) {
          next[secOrder][rowIdx][c.id] = null;
          secObj.config.columns?.forEach(lc => {
            if (lc.type === "locked" && lc.source_col === c.id) next[secOrder][rowIdx][lc.id] = { numValue: 0 };
          });
        }
      });
      return next;
    });
    onRecalc();
  }

  return (
    <div className="ce-section-body">
      <table className="ce-table">
        <thead><tr>{visibleCols.map(c=><th key={c.id}>{c.label}</th>)}<th style={{width:40}}></th></tr></thead>
        <tbody>
          {rows.map((_,ri) => (
            <TableRow key={ri} sec={sec} rowIdx={ri} sections={sections} sectionRows={sectionRows}
              summaries={summaries} crossCalcRows={crossCalcRows} dropdowns={dropdowns}
              onCellChange={handleCellChange}
              onRemove={() => {
                setSectionRows(prev => { const n={...prev}; n[sec.order_num]=n[sec.order_num].filter((_,i)=>i!==ri); return n; });
                onRecalc();
              }} />
          ))}
        </tbody>
      </table>
      {sec.config.can_add_rows !== false && (
        <div className="ce-add-row">
          <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => {
            setSectionRows(prev => { const n={...prev}; const row={}; (sec.config.columns||[]).forEach(c=>{row[c.id]=null;}); n[sec.order_num]=[...(n[sec.order_num]||[]),row]; return n; });
            onRecalc();
          }}>+ Add Row</button>
        </div>
      )}
      {visibleSums.length > 0 && (
        <div className="ce-summary">
          {visibleSums.map(s => (
            <div key={s.id} className="ce-summary-item">
              <div className="ce-summary-label">{s.label}</div>
              <div className="ce-summary-value-wrap">
                <div className="ce-summary-value">{fmtNum(summaries[sec.order_num]?.[s.id]??0)}</div>
                <CopyBtn getValue={() => fmtNum(summaries[sec.order_num]?.[s.id]??0)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormulaDisplaySection({ sec, summaries }) {
  return (
    <div className="ce-section-body">
      <div className="ce-formula-grid">
        {(sec.config.formulas||[]).filter(f=>!isHidden(f)).map(f => {
          const val = summaries[sec.order_num]?.[f.id]??0;
          const display = !isFinite(val) ? "N/A" : fmtNum(val);
          return (
            <div key={f.id} className="ce-formula-card">
              <CopyBtn getValue={() => display} className="ce-copy-card" />
              <div className="ce-formula-label">{f.label}</div>
              <div className="ce-formula-value">{display}</div>
              {f.description && <div className="ce-formula-desc">{f.description}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalcRefSection({ sec, crossCalcRows }) {
  const cfg = sec.config;
  const key = `${cfg.ref_calc_id}_${cfg.ref_section_order}`;
  const srcRows = crossCalcRows[key] || [];
  return (
    <div className="ce-section-body">
      <div className="ce-ref-notice">📌 {cfg.description || `Data from Calc ${cfg.ref_calc_id}, Section ${cfg.ref_section_order}`}</div>
      {srcRows.length === 0 ? (
        <div className="ce-alert-info">No data yet. Open the source calculation first.</div>
      ) : (
        <table className="ce-table">
          <thead><tr><th>Facility Area</th><th>Area (m²)</th></tr></thead>
          <tbody>{srcRows.map((row,i) => {
            const fa=row["fa"]; const faLabel=fa?(fa.isOther?fa.otherText||"Others":fa.label):"-";
            return <tr key={i}><td>{faLabel}</td><td className="ce-locked">{getNum(row["area"])}</td></tr>;
          })}</tbody>
        </table>
      )}
    </div>
  );
}

// ── Main CalcEngine ───────────────────────────────────────────────────────────

export default function CalcEngine({ calcId }) {
  const [calcConfig, setCalcConfig] = useState(null);
  const [sectionRows, setSectionRows] = useState({});
  const [summaries, setSummaries] = useState({});
  const [dropdowns, setDropdowns] = useState({});
  const [crossCalcRows, setCrossCalcRows] = useState({});
  const [error, setError] = useState(null);
  const calcOrderMapRef = useRef({});
  const crossCalcCacheRef = useRef({});

  function doRecalc(rows, sums, sections) {
    if (!sections) return { rows, sums };
    const newRows = JSON.parse(JSON.stringify(rows));
    const newSums = JSON.parse(JSON.stringify(sums));
    crossCalcCacheRef.current = {};
    sections.forEach(sec => {
      const cfg = sec.config;
      if (cfg.type === "input_table") {
        const srs = newRows[sec.order_num] || [];
        srs.forEach((_,ri) => {
          resolveLockedCols(sec.order_num, ri, newRows, sections);
          resolveFormulaColumns(sec.order_num, ri, newRows, sections, newSums, calcOrderMapRef.current, crossCalcCacheRef.current);
        });
        if (!newSums[sec.order_num]) newSums[sec.order_num] = {};
        (cfg.summaries||[]).forEach(s => {
          const r2 = newRows[sec.order_num]||[];
          let expr = String(s.formula);
          const aggrFn = (fn,colId) => { const vs=r2.map(r=>getNum(r[colId])); if(!vs.length)return 0; switch(fn.toUpperCase()){case"SUM":return vs.reduce((a,b)=>a+b,0);case"AVG":return vs.reduce((a,b)=>a+b,0)/vs.length;case"MIN":return Math.min(...vs);case"MAX":return Math.max(...vs);default:return 0;}};
          expr = expr.replace(/\b(SUM|AVG|MIN|MAX)\((\w+)\)/gi, (_,fn,colId)=>aggrFn(fn,colId));
          expr = expr.replace(/\bCOUNT\(\)/gi, r2.length);
          expr = expr.replace(/SEC\((\d+)\)\.(\w+)/gi, (_,n,sid)=>parseFloat(newSums[parseInt(n)]?.[sid]??0)||0);
          try { if(/[^0-9+\-*/().\s]/.test(expr)){newSums[sec.order_num][s.id]=0;return;} const result=Function('"use strict"; return ('+expr+")")(); newSums[sec.order_num][s.id]=isFinite(result)?result:0; } catch{newSums[sec.order_num][s.id]=0;}
        });
      } else if (cfg.type === "formula_display") {
        if (!newSums[sec.order_num]) newSums[sec.order_num] = {};
        (cfg.formulas||[]).forEach(f => { newSums[sec.order_num][f.id]=evalExpr(f.expr,sec.order_num,undefined,newRows,newSums,calcOrderMapRef.current,crossCalcCacheRef.current); });
      }
    });
    return { rows: newRows, sums: newSums };
  }

  function handleRecalc() {
    if (!calcConfig) return;
    setSectionRows(prev => {
      const {rows:newRows,sums:newSums} = doRecalc(prev,{},calcConfig.sections);
      setSummaries(newSums);
      saveToStorage(calcId,newRows,newSums);
      return newRows;
    });
  }

  useEffect(() => {
    async function init() {
      try {
        const allCalcs = await publicGet("/calculations");
        allCalcs.forEach(c => { calcOrderMapRef.current[c.order_num] = c._id||c.id; });
        const cfg = await publicGet(`/calculations/${calcId}`);
        cfg.sections.sort((a,b)=>a.order_num-b.order_num);
        setCalcConfig(cfg);
        const masterIds = new Set();
        cfg.sections.forEach(sec => (sec.config.columns||[]).forEach(col => { if(col.dropdown_master_id) masterIds.add(col.dropdown_master_id); }));
        const ddMap = {};
        await Promise.all([...masterIds].map(async mid => { ddMap[mid]=await publicGet(`/dropdowns/${mid}`); }));
        setDropdowns(ddMap);
        const ccRows = {};
        for (const sec of cfg.sections) {
          if (sec.config.type==="calc_ref"||sec.config.cross_calc_fa) {
            const refId=sec.config.ref_calc_id||sec.config.cross_calc_fa?.calc_id;
            const refOrd=sec.config.ref_section_order||sec.config.cross_calc_fa?.section_order;
            if (refId&&refOrd) { const key=`${refId}_${refOrd}`; const stored=loadFromStorage(refId); ccRows[key]=stored?.rows?.[refOrd]||[]; }
          }
          (sec.config.columns||[]).forEach(col => { if(col.type==="cross_calc_ref"){const key=`${col.ref_calc_id}_${col.ref_section_order}`;if(!ccRows[key]){const s=loadFromStorage(col.ref_calc_id);ccRows[key]=s?.rows?.[col.ref_section_order]||[];}} });
        }
        setCrossCalcRows(ccRows);
        const stored = loadFromStorage(calcId);
        const initRows={}, initSums={};
        cfg.sections.forEach(sec => {
          initRows[sec.order_num]=[];
          initSums[sec.order_num]={};
          if (stored?.rows?.[sec.order_num]) initRows[sec.order_num]=stored.rows[sec.order_num];
          else if (sec.config.can_add_rows) { const row={}; (sec.config.columns||[]).forEach(c=>{row[c.id]=null;}); initRows[sec.order_num]=[row]; }
        });
        const {rows:newRows,sums:newSums}=doRecalc(initRows,initSums,cfg.sections);
        setSectionRows(newRows); setSummaries(newSums);
      } catch(e) { setError(e.message); }
    }
    init();
  }, [calcId]);

  function handleReset() {
    if(!window.confirm("Reset all data?")) return;
    if(!calcConfig) return;
    const initRows={};
    calcConfig.sections.forEach(sec => {
      initRows[sec.order_num]=[];
      if(sec.config.can_add_rows){const row={};(sec.config.columns||[]).forEach(c=>{row[c.id]=null;});initRows[sec.order_num]=[row];}
    });
    const {rows:newRows,sums:newSums}=doRecalc(initRows,{},calcConfig.sections);
    setSectionRows(newRows); setSummaries(newSums); saveToStorage(calcId,newRows,newSums);
  }

  function handleExport() {
    const payload={schema:"calc-engine-export",version:1,calc_id:calcId,calc_name:calcConfig?.name||"",exported_at:new Date().toISOString(),data:{rows:sectionRows,summaries}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    const safe=(calcConfig?.name||`calc-${calcId}`).replace(/[^\w-]+/g,"_");
    a.href=url; a.download=`${safe}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try {
        const payload=JSON.parse(ev.target.result);
        if(payload.schema!=="calc-engine-export") throw new Error("Not a calc-engine export file");
        if(!payload.data?.rows) throw new Error("Missing data");
        if(!window.confirm("Import will replace your current inputs. Continue?")) return;
        const {rows:newRows,sums:newSums}=doRecalc(payload.data.rows,payload.data.summaries||{},calcConfig.sections);
        setSectionRows(newRows); setSummaries(newSums); saveToStorage(calcId,newRows,newSums);
      } catch(err){alert("Import failed: "+err.message);}
    };
    reader.readAsText(file); e.target.value="";
  }

  if (error) return <div className="ce-alert-error">Failed to load: {error}</div>;
  if (!calcConfig) return <div className="ce-loading">Loading calculation…</div>;

  const visibleSections = calcConfig.sections.filter(sec => !isHidden(sec.config||{}));

  return (
    <div className="ce-root">
      <div className="ce-calc-hero">
        <div>
          <h2 className="ce-calc-title">{calcConfig.name}</h2>
          {calcConfig.description && <p className="ce-calc-desc">{calcConfig.description}</p>}
        </div>
        <div className="ce-actions">
          <button className="ce-btn ce-btn-outline" onClick={handleExport}>📥 Export</button>
          <label className="ce-btn ce-btn-outline" style={{cursor:"pointer"}}>
            📤 Import <input type="file" accept=".json" style={{display:"none"}} onChange={handleImport} />
          </label>
          <button className="ce-btn ce-btn-secondary" onClick={handleReset}>↺ Reset</button>
        </div>
      </div>

      {visibleSections.map(sec => (
        <div key={sec._id||sec.order_num} className="ce-section">
          <div className="ce-section-header">
            <div className="ce-section-order">§{sec.order_num}</div>
            <h3 className="ce-section-title">{sec.name}</h3>
          </div>
          {sec.config.type==="input_table" && (
            <InputTableSection sec={sec} sections={calcConfig.sections} sectionRows={sectionRows}
              setSectionRows={setSectionRows} summaries={summaries} crossCalcRows={crossCalcRows}
              dropdowns={dropdowns} onRecalc={handleRecalc} />
          )}
          {sec.config.type==="formula_display" && <FormulaDisplaySection sec={sec} summaries={summaries} />}
          {sec.config.type==="calc_ref" && <CalcRefSection sec={sec} crossCalcRows={crossCalcRows} />}
        </div>
      ))}
    </div>
  );
}
