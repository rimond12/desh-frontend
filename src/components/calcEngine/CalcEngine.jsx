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
  evalSummaryExpr, calcFormulaSection,
} from "./calcEngine.js";
import { createPortal } from "react-dom";
import "./calcEngine.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

// ── Searchable Select Component ───────────────────────────────────────────────
function SearchableSelect({ value, onChange, options, placeholder = "-- Select --", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsRef = useRef(null);

  // Find the selected option's label
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Filter options based on tokenized search query
  const cleanStr = (s) => (s || "").toLowerCase();
  const matchOption = (label, query) => {
    if (!query) return true;
    const target = cleanStr(label);
    const tokens = cleanStr(query).split(/\s+/).filter(Boolean);
    return tokens.every(token => target.includes(token));
  };

  const filteredOptions = options.filter(opt => matchOption(opt.label, searchQuery));

  // Compute fixed-position coordinates from trigger's viewport rect
  // This lets the dropdown escape any parent overflow:hidden container
  const computeDropdownStyle = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownH = 256; // max expected height (search box + list)
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownH && rect.top > dropdownH;

    const style = {
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      minWidth: Math.max(rect.width, 180),
    };
    if (openUp) {
      style.bottom = window.innerHeight - rect.top + 2;
      style.top = "auto";
    } else {
      style.top = rect.bottom + 2;
      style.bottom = "auto";
    }
    setDropdownStyle(style);
  };

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Compute position and focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      computeDropdownStyle();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Recompute on scroll / resize so the dropdown tracks the trigger
  useEffect(() => {
    if (!isOpen) return;
    const recompute = () => computeDropdownStyle();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close dropdown on click outside (both trigger and floating panel)
  useEffect(() => {
    function handleOutsideClick(e) {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && optionsRef.current) {
      const highlightedEl = optionsRef.current.querySelector(".highlighted");
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  // Render the floating dropdown panel via a React portal so it sits above
  // ALL stacking contexts and is never clipped by overflow:hidden parents.
  const dropdownPanel = isOpen ? (
    <div
      ref={dropdownRef}
      className="ce-searchable-select-dropdown"
      style={dropdownStyle}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="ce-searchable-select-search-container">
        <input
          ref={searchInputRef}
          type="text"
          className="ce-searchable-select-search-input"
          placeholder="🔍 Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="ce-searchable-select-options" ref={optionsRef}>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={opt.value}
                className={`ce-searchable-select-option${isSelected ? " selected" : ""}${isHighlighted ? " highlighted" : ""}`}
                onMouseDown={() => handleSelect(opt.value)}
                title={opt.label}
              >
                {opt.label}
              </div>
            );
          })
        ) : (
          <div className="ce-searchable-select-no-results">No options found</div>
        )}
      </div>
    </div>
  ) : null;

  // Use a portal so the panel is mounted at document.body level,
  // escaping any overflow:hidden parent containers.
  return (
    <div className="ce-searchable-select" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={`ce-searchable-select-trigger${disabled ? " disabled" : ""}`}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        disabled={disabled}
      >
        <span className="ce-searchable-select-trigger-text">{displayLabel}</span>
        <span className={`ce-searchable-select-caret${isOpen ? " open" : ""}`}>▼</span>
      </button>

      {createPortal(dropdownPanel, document.body)}
    </div>
  );
}

// ── Cell Components ───────────────────────────────────────────────────────────

function DropdownCell({ col, row, dropdowns, onChange, readOnly }) {
  const items = dropdowns[col.dropdown_master_id] || [];
  const cell = row[col.id];
  const selKey = cell?.key || "";
  const selectedLabel = cell?.label || (selKey === "__other__" ? cell?.otherText : "") || "";

  const options = [
    { value: "", label: "-- Select --" },
    ...items.map(it => ({
      value: it.item_key || it.k,
      label: it.item_label || it.l
    })),
    ...(col.allow_others ? [{ value: "__other__", label: "Others" }] : [])
  ];

  const handleSelect = (key) => {
    if (!key) {
      onChange(col.id, null);
      return;
    }
    if (key === "__other__") {
      onChange(col.id, { key: "__other__", label: "Others", numValue: 0, isOther: true, otherText: "" });
      return;
    }
    const item = items.find(i => (i.item_key || i.k) === key);
    if (item) {
      onChange(col.id, {
        key: item.item_key || item.k,
        label: item.item_label || item.l,
        numValue: item.num_value ?? item.v ?? 0,
        isOther: false,
        ...(item.extra_values || {})
      });
    } else {
      onChange(col.id, null);
    }
  };

  return (
    <>
      <div className="ce-cell-interactive">
        {readOnly ? (
          <span className="ce-locked">{selectedLabel || "-"}</span>
        ) : (
          <>
            <SearchableSelect
              value={selKey}
              onChange={handleSelect}
              options={options}
              placeholder="-- Select --"
            />
            {selKey === "__other__" && (
              <input type="text" className="ce-others-input" placeholder="Enter option..."
                value={cell?.otherText || ""} onChange={e => onChange(col.id, { ...cell, otherText: e.target.value })} />
            )}
          </>
        )}
      </div>
      <span className="ce-cell-print-only">{selectedLabel || "-"}</span>
    </>
  );
}

function NestedDropdownCell({ col, row, dropdowns, sec, onChange, readOnly }) {
  const parentCell = row[col.parent_col];
  const parentColCfg = sec.config.columns?.find(c => c.id === col.parent_col);
  const allItems = dropdowns[parentColCfg?.dropdown_master_id] || [];
  const cell = row[col.id];
  const selectedLabel = cell?.label || (cell?.key === "__other__" ? cell?.otherText : "") || "";
  if (readOnly) {
    return <span className="ce-locked">{selectedLabel || "-"}</span>;
  }
  if (!parentCell?.key) return (
    <>
      <div className="ce-cell-interactive">
        <SearchableSelect
          value=""
          onChange={() => {}}
          options={[{ value: "", label: `-- Select ${parentColCfg?.label || col.parent_col} first --` }]}
          placeholder={`-- Select ${parentColCfg?.label || col.parent_col} first --`}
          disabled={true}
        />
      </div>
      <span className="ce-cell-print-only">-</span>
    </>
  );
  if (parentCell?.isOther && col.others_follows_parent) return (
    <>
      <div className="ce-cell-interactive">
        <span className="ce-locked">Others</span>
      </div>
      <span className="ce-cell-print-only">Others</span>
    </>
  );
  const parentItem = allItems.find(i => (i.item_key || i.k) === parentCell.key);
  const children = parentItem?.children || [];

  const options = [
    { value: "", label: "-- Select --" },
    ...children.map(c => ({
      value: c.item_key || c.k,
      label: c.item_label || c.l
    })),
    ...(col.allow_others ? [{ value: "__other__", label: "Others" }] : [])
  ];

  const handleSelect = (key) => {
    if (!key) { onChange(col.id, null); return; }
    if (key === "__other__") {
      onChange(col.id, { key: "__other__", label: "Others", numValue: 0, isOther: true, otherText: "" });
      return;
    }
    const found = children.find(c => (c.item_key || c.k) === key);
    if (found) {
      onChange(col.id, {
        key: found.item_key || found.k,
        label: found.item_label || found.l,
        numValue: found.num_value ?? found.v ?? 0,
        isOther: false,
        ...(found.extra_values || {})
      });
    } else {
      onChange(col.id, null);
    }
  };

  return (
    <>
      <div className="ce-cell-interactive">
        <SearchableSelect
          value={cell?.key || ""}
          onChange={handleSelect}
          options={options}
          placeholder="-- Select --"
        />
        {cell?.key === "__other__" && (
          <input type="text" className="ce-others-input" placeholder="Enter option..."
            value={cell?.otherText || ""} onChange={e => onChange(col.id, { ...cell, otherText: e.target.value })} />
        )}
      </div>
      <span className="ce-cell-print-only">{selectedLabel || "-"}</span>
    </>
  );
}

function SectionRefCell({ col, row, sections, sectionRows, crossCalcRows, onChange, readOnly }) {
  const sourceRows = getRefSourceRows(col, sections, sectionRows, crossCalcRows);
  const opts = buildRefOptions(sourceRows);
  const cell = row[col.id];
  const selIdx = cell?.rowIndex !== undefined ? cell.rowIndex : -1;
  const selectedLabel = cell?.label || "";
  if (readOnly) {
    return <span className="ce-locked">{selectedLabel || "-"}</span>;
  }

  const options = [
    { value: "", label: "-- Select --" },
    ...opts.map(o => ({
      value: String(o.rowIndex),
      label: o.label
    }))
  ];

  const handleSelect = (val) => {
    if (val === "") { onChange(col.id, null); return; }
    const rowIndex = parseInt(val);
    const srcRow = sourceRows[rowIndex] || {};
    const area = getNum(srcRow["area"]);
    const opt = opts.find(o => o.rowIndex === rowIndex);
    onChange(col.id, { rowIndex, label: opt?.label || "", area, numValue: area, _sourceRow: srcRow });
  };

  return (
    <>
      <div className="ce-cell-interactive">
        <SearchableSelect
          value={selIdx === -1 ? "" : String(selIdx)}
          onChange={handleSelect}
          options={options}
          placeholder="-- Select --"
        />
      </div>
      <span className="ce-cell-print-only">{selectedLabel || "-"}</span>
    </>
  );
}

function LockedCell({ col, row, onUnlockEdit, onToggleLock, readOnly }) {
  const cell = row[col.id];
  const rawVal = cell ? (cell.rawValue ?? cell.text ?? cell.numValue ?? cell.v ?? 0) : 0;
  const numVal = parseFloat(rawVal);
  const display = Number.isFinite(numVal) ? fmtNum(numVal) : String(rawVal ?? "");
  const isUnlocked = cell?.unlocked === true;
  if (col.allow_unlock && isUnlocked && !readOnly) {
    return (
      <>
        <div className="ce-cell-interactive">
          <div className="ce-locked-wrap">
            <input type="number" className="ce-input ce-input-num" value={Number.isFinite(numVal) ? numVal : 0} step="any"
              onChange={e => onUnlockEdit(col.id, parseFloat(e.target.value) || 0)} />
            <button className="ce-lock-btn unlocked" onClick={() => onToggleLock(col.id)} title="Re-lock">🔓</button>
          </div>
        </div>
        <span className="ce-cell-print-only ce-locked">{display}</span>
      </>
    );
  }
  if (col.allow_unlock && !readOnly) {
    return (
      <>
        <div className="ce-cell-interactive">
          <div className="ce-locked-wrap">
            <span className="ce-locked">{display}</span>
            <button className="ce-lock-btn" onClick={() => onToggleLock(col.id)} title="Unlock">🔒</button>
          </div>
        </div>
        <span className="ce-cell-print-only ce-locked">{display}</span>
      </>
    );
  }
  return <span className="ce-locked">{display || "-"}</span>;
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function TableRow({ sec, rowIdx, sections, sectionRows, summaries, crossCalcRows, dropdowns, onCellChange, onRemove, readOnly }) {
  const row = sectionRows[sec.order_num]?.[rowIdx] || {};
  const visibleCols = (sec.config.columns || []).filter(col => !isHidden(col));

  function handleChange(colId, value) { onCellChange(sec.order_num, rowIdx, colId, value, sec); }
  function handleUnlockEdit(colId, val) { onCellChange(sec.order_num, rowIdx, colId, { numValue: val, unlocked: true }, sec); }
  function handleToggleLock(colId) {
    const cell = row[colId] || { numValue: 0 };
    if (cell.unlocked) { const next = { ...cell }; delete next.unlocked; onCellChange(sec.order_num, rowIdx, colId, next, sec, true); }
    else { onCellChange(sec.order_num, rowIdx, colId, { ...cell, unlocked: true }, sec); }
  }

  function renderCell(col) {
    const cell = row[col.id];
    switch (col.type) {
      case "dropdown": return <DropdownCell col={col} row={row} dropdowns={dropdowns} onChange={handleChange} readOnly={readOnly} />;
      case "nested_dropdown": return <NestedDropdownCell col={col} row={row} dropdowns={dropdowns} sec={sec} onChange={handleChange} readOnly={readOnly} />;
      case "section_ref": case "cross_calc_ref":
        return <SectionRefCell col={col} row={row} sections={sections} sectionRows={sectionRows} crossCalcRows={crossCalcRows} onChange={handleChange} readOnly={readOnly} />;
      case "locked": return <LockedCell col={col} row={row} onUnlockEdit={handleUnlockEdit} onToggleLock={handleToggleLock} readOnly={readOnly} />;
      case "formula": { const val = cell?.numValue ?? 0; return <span className="ce-formula">{isNaN(val) ? "-" : fmtNum(val)}</span>; }
      case "number":
        return (
          <>
            {readOnly ? (
              <span className="ce-locked">{cell?.numValue !== undefined ? fmtNum(cell.numValue) : "-"}</span>
            ) : (
              <div className="ce-cell-interactive">
                <input type="number" className="ce-input ce-input-num" value={cell?.numValue ?? ""} step="any" onChange={e => handleChange(col.id, { numValue: parseFloat(e.target.value) || 0 })} />
              </div>
            )}
            <span className="ce-cell-print-only">{cell?.numValue !== undefined ? fmtNum(cell.numValue) : "-"}</span>
          </>
        );
      case "text":
        return (
          <>
            {readOnly ? (
              <span className="ce-locked">{cell?.text || "-"}</span>
            ) : (
              <div className="ce-cell-interactive">
                <input type="text" className="ce-input" value={cell?.text ?? ""} onChange={e => handleChange(col.id, { text: e.target.value, numValue: 0 })} />
              </div>
            )}
            <span className="ce-cell-print-only">{cell?.text || "-"}</span>
          </>
        );
      default: return <span>?</span>;
    }
  }

  return (
    <tr>
      {visibleCols.map((col, ci) => <td key={col.id} className={ci === 0 ? "ce-col-sticky" : ""}>{renderCell(col)}</td>)}
      {!readOnly && <td><button className="ce-remove-btn" onClick={onRemove} title="Remove">✕</button></td>}
    </tr>
  );
}

// ── Section Components ────────────────────────────────────────────────────────

function InputTableSection({ sec, sections, sectionRows, setSectionRows, summaries, crossCalcRows, dropdowns, onRecalc, readOnly }) {
  const rows = sectionRows[sec.order_num] || [];
  const visibleCols = (sec.config.columns || []).filter(c => !isHidden(c));
  const visibleSums = (sec.config.summaries || []).filter(s => !isHidden(s));
  const columnGroups = sec.config.column_groups || [];

  // ── Scroll-shadow tracking ────────────────────────────────────────────────
  const scrollRef = useRef(null);
  const [showRightShadow, setShowRightShadow] = useState(true);

  function handleTableScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // Hide the shadow once we've scrolled all the way to the right (within 2px)
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setShowRightShadow(!atEnd);
  }

  // Also re-check after rows change (new row added = same scroll width?)
  useEffect(() => {
    handleTableScroll();
  });

  // Build merged-header data when groups are defined
  const hasGroupHeaders = columnGroups.length > 0;
  let row1Items = [];
  let row2Cols = [];
  if (hasGroupHeaders) {
    const colToGroup = {};
    columnGroups.forEach(g => g.column_ids.forEach(id => { colToGroup[id] = g; }));
    const seenGroups = new Set();
    visibleCols.forEach(col => {
      const grp = colToGroup[col.id];
      if (grp) {
        if (!seenGroups.has(grp.id)) {
          seenGroups.add(grp.id);
          const colSpan = visibleCols.filter(c => grp.column_ids.includes(c.id)).length;
          row1Items.push({ type: "group", grp, colSpan });
        }
        row2Cols.push(col);
      } else {
        row1Items.push({ type: "col", col });
      }
    });
  }

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
      {/* ── Horizontally scrollable wrapper with right-edge fade shadow ─── */}
      {/* Outer (non-scrolling) wrapper hosts the ::after shadow overlay   */}
      <div className={`ce-table-outer${showRightShadow ? " ce-table-scroll-shadow" : ""}`}>
      {/* Inner scrolling container */}
      <div
        className="ce-table-scroll-wrap"
        ref={scrollRef}
        onScroll={handleTableScroll}
      >
        <table className="ce-table">
          <thead>
            {hasGroupHeaders ? (
              <>
                <tr>
                  {row1Items.map((item, i) => item.type === "group"
                    ? <th key={i} colSpan={item.colSpan} style={{ background: item.grp.bgColor, color: item.grp.textColor, textAlign: "center" }}>{item.grp.label}</th>
                    : <th key={i} rowSpan={2} className={i === 0 ? "ce-col-sticky" : ""}>{item.col.label}</th>
                  )}
                  {!readOnly && <th rowSpan={2} style={{ width: 40 }}></th>}
                </tr>
                <tr>{row2Cols.map((c, ci) => <th key={c.id} className={ci === 0 ? "ce-col-sticky" : ""}>{c.label}</th>)}</tr>
              </>
            ) : (
              <tr>
                {visibleCols.map((c, ci) => <th key={c.id} className={ci === 0 ? "ce-col-sticky" : ""}>{c.label}</th>)}
                {!readOnly && <th style={{ width: 40 }}></th>}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((_, ri) => (
              <TableRow key={ri} sec={sec} rowIdx={ri} sections={sections} sectionRows={sectionRows}
                summaries={summaries} crossCalcRows={crossCalcRows} dropdowns={dropdowns}
                onCellChange={handleCellChange}
                onRemove={() => {
                  setSectionRows(prev => { const n = { ...prev }; n[sec.order_num] = n[sec.order_num].filter((_, i) => i !== ri); return n; });
                  onRecalc();
                }}
                readOnly={readOnly} />
            ))}
          </tbody>
        </table>
      </div>{/* end ce-table-scroll-wrap */}
      </div>{/* end ce-table-outer */}
      {sec.config.can_add_rows !== false && !readOnly && (
        <div className="ce-add-row">
          <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => {
            setSectionRows(prev => { const n = { ...prev }; const row = {}; (sec.config.columns || []).forEach(c => { row[c.id] = null; }); n[sec.order_num] = [...(n[sec.order_num] || []), row]; return n; });
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
                <div className="ce-summary-value">{fmtNum(summaries[sec.order_num]?.[s.id] ?? 0)}</div>
                <CopyBtn getValue={() => fmtNum(summaries[sec.order_num]?.[s.id] ?? 0)} />
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
        {(sec.config.formulas || []).filter(f => !isHidden(f)).map(f => {
          const val = summaries[sec.order_num]?.[f.id] ?? 0;
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

// ── Editable Calculation Reference Section ────────────────────────────────────
// Renders a calc_ref section as a fully interactive input_table, using the
// source section's column/summary config. All edits are written back to the
// source calculation's localStorage so other calculations see the changes.

function EditableCalcRefSection({
  sec, srcSec, allSections, refSectionConfigs,
  sectionRows, setSectionRows, setCrossCalcRows, summaries, crossCalcRows, dropdowns, onRecalc, readOnly, projectId, axios
}) {
  const refCalcId = sec.config.ref_calc_id;
  const refSecOrder = sec.config.ref_section_order;
  const srcType = srcSec.config?.type || "input_table";

  // Virtual section: keeps this section's order_num but uses the source section's config.
  const virtualSec = {
    ...sec,
    config: { ...srcSec.config },
  };

  // Virtual sections array used by SectionRefCell / locked-col resolution so
  // that sibling sections referencing this one resolve data from sectionRows
  // rather than crossCalcRows.
  const virtualSections = allSections.map(s => {
    if (s.order_num === sec.order_num) return virtualSec;
    if (s.config.type === "calc_ref") {
      const key = `${s.config.ref_calc_id}_${s.config.ref_section_order}`;
      const src = refSectionConfigs[key];
      if (src) return { ...s, config: { ...src.config } };
    }
    return s;
  });

  // Wrap setSectionRows: after every state update, persist the updated rows
  // back into the source calculation's localStorage entry so Calc 01 stays
  // in sync when it is next opened.
  function handleSyncedRows(updater) {
    if (readOnly) return;
    setSectionRows(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const refRows = next[sec.order_num] || [];
      const key = `${refCalcId}_${refSecOrder}`;
      if (setCrossCalcRows) {
        setCrossCalcRows(cPrev => ({ ...cPrev, [key]: refRows }));
      }
      if (projectId) {
        axios.get(`/projects/${projectId}/calculations/${refCalcId}`).then(res => {
          const existingRows = res.data.data?.sectionRows || {};
          const mergedRows = { ...existingRows, [refSecOrder]: refRows };
          const existingSums = res.data.data?.summaries || {};
          axios.put(`/projects/${projectId}/calculations/${refCalcId}`, {
            sectionRows: mergedRows,
            summaries: existingSums
          });
        }).catch(err => console.error(err));
      } else {
        const srcStored = loadFromStorage(refCalcId) || { rows: {}, sums: {} };
        srcStored.rows = { ...(srcStored.rows || {}), [refSecOrder]: refRows };
        saveToStorage(refCalcId, srcStored.rows, srcStored.sums || {});
      }
      return next;
    });
  }

  return (
    <div className="ce-ref-editable-wrapper">
      <div className="ce-ref-source-badge">
        <span className="ce-ref-link-icon">🔗</span>
        <span>
          Linked from <strong>{srcSec.name || `Section ${refSecOrder}`}</strong>
        </span>
        {srcType === "input_table" && (
          <span className="ce-ref-sync-label">· Edits sync to source calculation</span>
        )}
      </div>
      {srcType === "formula_display" && (
        <FormulaDisplaySection sec={virtualSec} summaries={summaries} />
      )}
      {srcType === "instruction_table" && (
        <InstructionTableSection sec={virtualSec} />
      )}
      {srcType === "input_table" && (
        <InputTableSection
          sec={virtualSec}
          sections={virtualSections}
          sectionRows={sectionRows}
          setSectionRows={handleSyncedRows}
          summaries={summaries}
          crossCalcRows={crossCalcRows}
          dropdowns={dropdowns}
          onRecalc={onRecalc}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

// Fallback read-only view when source section config hasn't loaded yet
function CalcRefSectionReadOnly({ sec, crossCalcRows }) {
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
          <tbody>{srcRows.map((row, i) => {
            const fa = row["fa"]; const faLabel = fa ? (fa.isOther ? fa.otherText || "Others" : fa.label) : "-";
            return <tr key={i}><td>{faLabel}</td><td className="ce-locked">{getNum(row["area"])}</td></tr>;
          })}</tbody>
        </table>
      )}
    </div>
  );
}

// ── Instruction Table Section ─────────────────────────────────────────────────

function getLeafCols(columns) {
  const leaves = [];
  (columns || []).forEach(col => {
    if (col.isGroup && col.children?.length) leaves.push(...getLeafCols(col.children));
    else leaves.push(col);
  });
  return leaves;
}

function renderInstrCell(cell) {
  if (!cell) return null;
  if (cell.type === "url") {
    return <a href={cell.url} target="_blank" rel="noopener noreferrer" className="ce-instr-link">{cell.label || cell.url}</a>;
  }
  if (cell.type === "image") {
    const align = cell.imgAlign || "left";
    const width = cell.imgWidth || "100%";
    const style = {
      width, maxWidth: "100%", display: "block",
      ...(align === "center" ? { margin: "0 auto" } : align === "right" ? { marginLeft: "auto" } : {})
    };
    return <img src={cell.src} alt={cell.alt || ""} style={style} />;
  }
  const text = String(cell.value || "");
  return text.includes("\n") ? <span style={{ whiteSpace: "pre-wrap" }}>{text}</span> : <span>{text}</span>;
}

function InstrTableBlock({ block }) {
  const columns = block.columns || [];
  const rows = block.rows || [];
  const leafCols = getLeafCols(columns);
  const hasGroups = columns.some(c => c.isGroup);
  if (leafCols.length === 0) return null;

  // Pre-compute cells occupied by rowspan from above rows
  const occupied = {};
  rows.forEach((row, ri) => {
    leafCols.forEach(col => {
      if (occupied[`${ri}_${col.id}`]) return;
      const rs = row.cells?.[col.id]?.rowspan || 1;
      if (rs > 1) {
        for (let r = ri + 1; r < ri + rs && r < rows.length; r++) {
          occupied[`${r}_${col.id}`] = true;
        }
      }
    });
  });

  return (
    <div className="ce-instr-table-wrap">
      <table className="ce-instr-table">
        <thead>
          {hasGroups ? (
            <>
              <tr>
                {columns.map(col => col.isGroup
                  ? <th key={col.id} colSpan={getLeafCols([col]).length} className="ce-instr-col-th" style={{ background: col.bgColor || "#f8fafc", color: col.textColor || "#0f172a" }}>{col.label}</th>
                  : <th key={col.id} rowSpan={2} className="ce-instr-col-th" style={{ background: col.bgColor || "#F5E200", color: col.textColor || "#000", ...(col.width ? { width: col.width } : {}) }}>{col.label}</th>
                )}
              </tr>
              <tr>
                {columns.flatMap(col => col.isGroup ? getLeafCols([col]) : []).map(col => (
                  <th key={col.id} className="ce-instr-col-th" style={{ background: col.bgColor || "#F5E200", color: col.textColor || "#000", ...(col.width ? { width: col.width } : {}) }}>{col.label}</th>
                ))}
              </tr>
            </>
          ) : (
            <tr>
              {leafCols.map(col => (
                <th key={col.id} className="ce-instr-col-th" style={{ background: col.bgColor || "#F5E200", color: col.textColor || "#000", ...(col.width ? { width: col.width } : {}) }}>{col.label}</th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="ce-instr-row">
              {leafCols.map(col => {
                if (occupied[`${ri}_${col.id}`]) return null;
                const cell = row.cells?.[col.id];
                const rs = cell?.rowspan || 1;
                return (
                  <td key={col.id} className="ce-instr-td" rowSpan={rs > 1 ? rs : undefined}>
                    {renderInstrCell(cell)}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={leafCols.length} style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem", fontSize: ".83rem" }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InstructionTableSection({ sec }) {
  const cfg = sec.config;

  // Normalise to blocks format (migrate old configs automatically)
  let blocks = cfg.blocks;
  if (!blocks) {
    blocks = [];
    if (cfg.columns?.length || cfg.rows?.length) {
      blocks = [{ blockType: "table", columns: cfg.columns || [], rows: cfg.rows || [], group_header: cfg.group_header }];
    }
  }
  if (!blocks.length) return null;

  return (
    <div className="ce-section-body">
      {blocks.map((block, bi) => {
        if (block.blockType === "paragraph") {
          return <p key={bi} className="ce-instr-para">{block.content}</p>;
        }
        if (block.blockType === "table") {
          return <InstrTableBlock key={bi} block={block} />;
        }
        return null;
      })}
    </div>
  );
}

// ── Virtual sections helper ───────────────────────────────────────────────────
// Replaces calc_ref sections with virtual input_table sections (same order_num,
// source section's column/summary config) so resolveLockedCols and
// resolveFormulaColumns work transparently across referenced sections.

function buildVirtualSections(sections, refConfigs) {
  return (sections || []).map(sec => {
    if (sec.config.type !== "calc_ref") return sec;
    const key = `${sec.config.ref_calc_id}_${sec.config.ref_section_order}`;
    const srcSec = refConfigs?.[key];
    if (srcSec) {
      return { ...sec, config: { ...srcSec.config } };
    }
    return sec;
  });
}

// ── Main CalcEngine ───────────────────────────────────────────────────────────

export default function CalcEngine({ calcId, projectId = null, inputId = null, readOnly = false }) {
  const axios = useAxiosSecure();
  const [calcConfig, setCalcConfig] = useState(null);
  const [sectionRows, setSectionRows] = useState({});
  const [summaries, setSummaries] = useState({});
  const [dropdowns, setDropdowns] = useState({});
  const [crossCalcRows, setCrossCalcRows] = useState({});
  const [refSectionConfigs, setRefSectionConfigs] = useState({});
  const [error, setError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef(null);
  const calcOrderMapRef = useRef({});
  const crossCalcCacheRef = useRef({});

  // doRecalc accepts an optional refConfigs override so init() can pass the
  // freshly-fetched configs before the state setter has flushed.
  function doRecalc(rows, sums, sections, refConfigs) {
    if (!sections) return { rows, sums };
    const configs = refConfigs !== undefined ? refConfigs : refSectionConfigs;
    const virtSections = buildVirtualSections(sections, configs);
    const newRows = JSON.parse(JSON.stringify(rows));
    const newSums = JSON.parse(JSON.stringify(sums));
    crossCalcCacheRef.current = {};
    virtSections.forEach(sec => {
      const cfg = sec.config;
      if (cfg.type === "input_table") {
        const srs = newRows[sec.order_num] || [];
        srs.forEach((_, ri) => {
          resolveLockedCols(sec.order_num, ri, newRows, virtSections);
          resolveFormulaColumns(sec.order_num, ri, newRows, virtSections, newSums, calcOrderMapRef.current, crossCalcCacheRef.current);
        });
        if (!newSums[sec.order_num]) newSums[sec.order_num] = {};
        (cfg.summaries || []).forEach(s => {
          newSums[sec.order_num][s.id] = evalSummaryExpr(
            s.formula, sec.order_num, newRows, newSums,
            calcOrderMapRef.current, crossCalcCacheRef.current
          );
        });
      } else if (cfg.type === "formula_display") {
        if (!newSums[sec.order_num]) newSums[sec.order_num] = {};
        (cfg.formulas || []).forEach(f => {
          newSums[sec.order_num][f.id] = evalExpr(
            f.expr, sec.order_num, undefined, newRows, newSums,
            calcOrderMapRef.current, crossCalcCacheRef.current
          );
        });
      }
    });
    return { rows: newRows, sums: newSums };
  }

    async function saveData(rows, sums) {
    if (projectId) {
      try {
        await axios.put(`/projects/${projectId}/calculations/${calcId}`, {
          sectionRows: rows,
          summaries: sums,
          inputId: inputId || null
        });
      } catch (err) {
        console.error("Failed to save calculation inputs to DB", err);
      }
    } else {
      saveToStorage(calcId, rows, sums);
    }
  }

  function handleRecalc() {
    if (!calcConfig) return;
    if (readOnly) return;
    setSectionRows(prev => {
      const { rows: newRows, sums: newSums } = doRecalc(prev, {}, calcConfig.sections);
      setSummaries(newSums);
      saveData(newRows, newSums);
      return newRows;
    });
  }

  // Handle clicking outside the export dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const allCalcs = await publicGet("/calculations");
        allCalcs.forEach(c => { calcOrderMapRef.current[c.order_num] = c._id || c.id; });
        const cfg = await publicGet(`/calculations/${calcId}`);
        cfg.sections.sort((a, b) => a.order_num - b.order_num);

        let allProjectCalcs = {};
        if (projectId) {
          try {
            const dbRes = await axios.get(`/projects/${projectId}/calculations`);
            if (dbRes.data.success && dbRes.data.data) {
              dbRes.data.data.forEach(item => {
                allProjectCalcs[item.calcId] = {
                  rows: item.sectionRows,
                  sums: item.summaries
                };
              });
            }
          } catch (e) {
            console.error("Failed to load project calculations map", e);
          }
        }

        Object.entries(allProjectCalcs).forEach(([cId, data]) => {
          crossCalcCacheRef.current[cId] = {
            rows: data.rows || {},
            sums: data.sums || {}
          };
        });

        // ── 1. Load source section configs for every calc_ref section ─────────
        const refSecConfigs = {};
        const refCalcFetches = {};
        cfg.sections.forEach(sec => {
          if (sec.config.type === "calc_ref" && sec.config.ref_calc_id) {
            if (!refCalcFetches[sec.config.ref_calc_id]) {
              refCalcFetches[sec.config.ref_calc_id] = publicGet(`/calculations/${sec.config.ref_calc_id}`);
            }
          }
        });
        const fetchedRefCalcs = {};
        await Promise.all(
          Object.entries(refCalcFetches).map(async ([refId, p]) => {
            fetchedRefCalcs[refId] = await p;
          })
        );
        cfg.sections.forEach(sec => {
          if (sec.config.type === "calc_ref") {
            const { ref_calc_id: refId, ref_section_order: refOrd } = sec.config;
            if (refId && refOrd && fetchedRefCalcs[refId]) {
              const srcSec = fetchedRefCalcs[refId].sections?.find(s => s.order_num === refOrd);
              if (srcSec) refSecConfigs[`${refId}_${refOrd}`] = srcSec;
            }
          }
        });
        setRefSectionConfigs(refSecConfigs);
        setCalcConfig(cfg);

        // ── 2. Collect dropdown master IDs (own sections + source sections) ───
        const masterIds = new Set();
        cfg.sections.forEach(sec => {
          (sec.config.columns || []).forEach(col => {
            if (col.dropdown_master_id) masterIds.add(col.dropdown_master_id);
          });
          if (sec.config.type === "calc_ref") {
            const key = `${sec.config.ref_calc_id}_${sec.config.ref_section_order}`;
            const srcSec = refSecConfigs[key];
            (srcSec?.config?.columns || []).forEach(col => {
              if (col.dropdown_master_id) masterIds.add(col.dropdown_master_id);
            });
          }
        });
        const ddMap = {};
        await Promise.all([...masterIds].map(async mid => { ddMap[mid] = await publicGet(`/dropdowns/${mid}`); }));
        setDropdowns(ddMap);

        // ── 3. Load cross-calc rows from localStorage/DB ─────────────────────────
        const ccRows = {};
        for (const sec of cfg.sections) {
          if (sec.config.type === "calc_ref" || sec.config.cross_calc_fa) {
            const refId = sec.config.ref_calc_id || sec.config.cross_calc_fa?.calc_id;
            const refOrd = sec.config.ref_section_order || sec.config.cross_calc_fa?.section_order;
            if (refId && refOrd) { 
              const key = `${refId}_${refOrd}`; 
              const srcStored = allProjectCalcs[refId] || loadFromStorage(refId); 
              ccRows[key] = srcStored?.rows?.[refOrd] || []; 
            }
          }
          (sec.config.columns || []).forEach(col => { 
            if (col.type === "cross_calc_ref") { 
              const key = `${col.ref_calc_id}_${col.ref_section_order}`; 
              if (!ccRows[key]) { 
                const srcStored = allProjectCalcs[col.ref_calc_id] || loadFromStorage(col.ref_calc_id); 
                ccRows[key] = srcStored?.rows?.[col.ref_section_order] || []; 
              } 
            } 
          });
        }
        setCrossCalcRows(ccRows);

        // ── 4. Initialise section rows ────────────────────────────────────────
        const stored = allProjectCalcs[calcId] || loadFromStorage(calcId);
        const initRows = {}, initSums = {};
        cfg.sections.forEach(sec => {
          initSums[sec.order_num] = {};

          if (sec.config.type === "calc_ref") {
            // Always initialize from source calc's live rows so edits in source calc sync automatically
            const key = `${sec.config.ref_calc_id}_${sec.config.ref_section_order}`;
            const srcRows = ccRows[key] || [];
            const srcSecCfg = refSecConfigs[key]?.config;
            if (srcRows.length > 0) {
              initRows[sec.order_num] = JSON.parse(JSON.stringify(srcRows));
            } else {
              const row = {};
              (srcSecCfg?.columns || []).forEach(c => { row[c.id] = null; });
              initRows[sec.order_num] =
                srcSecCfg?.can_add_rows !== false && (srcSecCfg?.columns?.length ?? 0) > 0
                  ? [row]
                  : [];
            }
          } else {
            initRows[sec.order_num] = [];
            if (stored?.rows?.[sec.order_num]) initRows[sec.order_num] = stored.rows[sec.order_num];
            else if (sec.config.can_add_rows) { const row = {}; (sec.config.columns || []).forEach(c => { row[c.id] = null; }); initRows[sec.order_num] = [row]; }
          }
        });
        const { rows: newRows, sums: newSums } = doRecalc(initRows, initSums, cfg.sections, refSecConfigs);
        setSectionRows(newRows); setSummaries(newSums);
      } catch (e) { setError(e.message); }
    }
    init();
  }, [calcId, projectId, axios]);

  function handleReset() {
    if (readOnly) return;
    if (!window.confirm("Reset all data?")) return;
    if (!calcConfig) return;
    const initRows = {};
    calcConfig.sections.forEach(sec => {
      if (sec.config.type === "calc_ref") {
        // Reset to source calc's current data
        const key = `${sec.config.ref_calc_id}_${sec.config.ref_section_order}`;
        const srcRows = crossCalcRows[key] || [];
        const srcSecCfg = refSectionConfigs[key]?.config;
        if (srcRows.length > 0) {
          initRows[sec.order_num] = JSON.parse(JSON.stringify(srcRows));
        } else {
          const row = {};
          (srcSecCfg?.columns || []).forEach(c => { row[c.id] = null; });
          initRows[sec.order_num] =
            srcSecCfg?.can_add_rows !== false && (srcSecCfg?.columns?.length ?? 0) > 0
              ? [row]
              : [];
        }
      } else {
        initRows[sec.order_num] = [];
        if (sec.config.can_add_rows) { const row = {}; (sec.config.columns || []).forEach(c => { row[c.id] = null; }); initRows[sec.order_num] = [row]; }
      }
    });
    const { rows: newRows, sums: newSums } = doRecalc(initRows, {}, calcConfig.sections);
    if (readOnly) return; setSectionRows(newRows); setSummaries(newSums); saveData(newRows, newSums);
  }

  function handleExport() {
    const payload = { schema: "calc-engine-export", version: 1, calc_id: calcId, calc_name: calcConfig?.name || "", exported_at: new Date().toISOString(), data: { rows: sectionRows, summaries } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    const safe = (calcConfig?.name || `calc-${calcId}`).replace(/[^\w-]+/g, "_");
    a.href = url; a.download = `${safe}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function handleExportCSV() {
    if (!calcConfig) return;

    let csvContent = "";

    // 1. Report Header
    csvContent += `DESH CALCULATION REPORT\n`;
    csvContent += `Calculation Name,"${calcConfig.name?.replace(/"/g, '""') || ""}"\n`;
    if (calcConfig.description) {
      csvContent += `Description,"${calcConfig.description?.replace(/"/g, '""')}"\n`;
    }
    csvContent += `Calculation ID,${calcId}\n`;
    csvContent += `Exported At,${new Date().toLocaleString()}\n\n`;

    const visibleSecs = calcConfig.sections.filter(sec => !isHidden(sec.config || {}));

    visibleSecs.forEach(sec => {
      csvContent += `================================================================================\n`;
      csvContent += `SECTION ${sec.order_num}: ${sec.name || ""}\n`;
      csvContent += `================================================================================\n\n`;

      const isCalcRef = sec.config.type === "calc_ref";
      const refKey = isCalcRef ? `${sec.config.ref_calc_id}_${sec.config.ref_section_order}` : null;
      const srcSec = refKey ? refSectionConfigs[refKey] : null;
      const effectiveType = isCalcRef ? (srcSec?.config?.type || "input_table") : sec.config.type;

      if (effectiveType === "input_table") {
        // Resolve target config columns (virtual if calc_ref)
        let cols = sec.config.columns || [];
        if (isCalcRef && srcSec?.config?.columns) {
          cols = srcSec.config.columns;
        }

        const visibleCols = cols.filter(c => !isHidden(c));
        const rows = sectionRows[sec.order_num] || [];

        // Headers
        if (visibleCols.length > 0) {
          csvContent += visibleCols.map(c => `"${c.label?.replace(/"/g, '""')}"`).join(",") + "\n";

          // Row data
          rows.forEach(row => {
            const rowCells = visibleCols.map(col => {
              const cell = row[col.id];
              let valStr = "";

              if (col.type === "dropdown" || col.type === "nested_dropdown" || col.type === "section_ref") {
                valStr = cell?.label || (cell?.key === "__other__" ? cell?.otherText : "") || "";
              } else if (col.type === "locked") {
                const rawVal = cell ? (cell.rawValue ?? cell.text ?? cell.numValue ?? cell.v ?? 0) : 0;
                const numVal = parseFloat(rawVal);
                valStr = Number.isFinite(numVal) ? fmtNum(numVal) : String(rawVal ?? "");
              } else if (col.type === "formula") {
                const val = cell?.numValue ?? 0;
                valStr = isNaN(val) ? "-" : fmtNum(val);
              } else if (col.type === "number") {
                valStr = cell?.numValue !== undefined ? fmtNum(cell.numValue) : "";
              } else if (col.type === "text") {
                valStr = cell?.text || "";
              }

              return `"${valStr.replace(/"/g, '""')}"`;
            });
            csvContent += rowCells.join(",") + "\n";
          });
        } else {
          csvContent += "No columns configured\n";
        }

        csvContent += "\n";

        // Summaries
        let sums = sec.config.summaries || [];
        if (isCalcRef && srcSec?.config?.summaries) {
          sums = srcSec.config.summaries;
        }
        const visibleSums = sums.filter(s => !isHidden(s));

        if (visibleSums.length > 0) {
          csvContent += `--- SECTION SUMMARIES ---\n`;
          visibleSums.forEach(s => {
            const val = summaries[sec.order_num]?.[s.id] ?? 0;
            csvContent += `"${s.label?.replace(/"/g, '""')}",${fmtNum(val)}\n`;
          });
        }

      } else if (effectiveType === "formula_display") {
        let formulas = sec.config.formulas || [];
        if (isCalcRef && srcSec?.config?.formulas) {
          formulas = srcSec.config.formulas;
        }
        const visibleFormulas = formulas.filter(f => !isHidden(f));

        if (visibleFormulas.length > 0) {
          csvContent += `Formula,Value,Description\n`;
          visibleFormulas.forEach(f => {
            const val = summaries[sec.order_num]?.[f.id] ?? 0;
            const display = !isFinite(val) ? "N/A" : fmtNum(val);
            csvContent += `"${f.label?.replace(/"/g, '""')}",${display},"${(f.description || "").replace(/"/g, '""')}"\n`;
          });
        }
      } else if (effectiveType === "instruction_table") {
        csvContent += `[Instruction Table - Visual component only]\n`;
      }

      csvContent += "\n\n";
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (calcConfig?.name || `calc-${calcId}`).replace(/[^\w-]+/g, "_");
    a.href = url;
    a.download = `${safe}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportPDF() {
    if (!calcConfig) return;

    // Load the logo image first
    let logoImg = null;
    try {
      logoImg = await new Promise((resolve) => {
        const img = new Image();
        img.src = "/images/logo (1).png";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    } catch (err) {
      console.error("Failed to load PDF logo:", err);
    }

    // Create custom A4 PDF report in portrait mode (210mm x 297mm)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // ── 1. Document Branding Header (Page 1) ──────────────────────────────────
    // Forest Green top stripe (brand colors)
    doc.setFillColor(13, 59, 26);
    doc.rect(0, 0, 210, 8, "F");

    let textX = 14;
    if (logoImg) {
      try {
        const imgHeight = 12;
        const aspect = logoImg.naturalWidth && logoImg.naturalHeight 
          ? logoImg.naturalWidth / logoImg.naturalHeight 
          : 1.535;
        const imgWidth = imgHeight * aspect;
        doc.addImage(logoImg, "PNG", 14, 12, imgWidth, imgHeight);
        textX = 14 + imgWidth + 4;
      } catch (err) {
        console.error("Failed to add image to jsPDF:", err);
        textX = 14;
      }
    }

    // Brand Name & Subtitle
    doc.setTextColor(13, 59, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DESH", textX, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Sustainable Design Assessment System", textX, 23.5);

    // Document Title
    doc.setTextColor(13, 59, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CALCULATION REPORT", 14, 38);

    // ── 2. Metadata Information Block ──────────────────────────────────────────
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 44, 182, 24, "FD");

    // Column 1
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Calculation Name:", 18, 50);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(calcConfig.name || "N/A", 48, 50);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Calculation ID:", 18, 56);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(String(calcId || "N/A"), 48, 56);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Description:", 18, 62);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    const descText = calcConfig.description || "No description provided.";
    const splitDesc = doc.splitTextToSize(descText, 140);
    doc.text(splitDesc, 48, 62);

    // Column 2
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Exported On:", 130, 50);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(new Date().toLocaleDateString(), 155, 50);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Exported At:", 130, 56);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 155, 56);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Status:", 130, 62);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text("Verified", 155, 62);

    let y = 76; // Start coordinates for first section
    const visibleSecs = calcConfig.sections.filter(sec => !isHidden(sec.config || {}));

    // ── 3. Render Calculation Sections ────────────────────────────────────────
    visibleSecs.forEach(sec => {
      // Check space before adding section (trigger page break if near bottom)
      if (y > 235) {
        doc.addPage();
        y = 25;
      }

      // Draw Section Order Circular Badge
      doc.setFillColor(34, 197, 94);
      doc.circle(18, y - 2, 3.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(sec.order_num), 18, y - 0.7, { align: "center" });

      // Draw Section Title Text
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 59, 26);
      doc.text(sec.name || "", 25, y - 0.7);

      // Section underline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, y + 2.5, 196, y + 2.5);

      y += 7; // Advance cursor past section header

      const isCalcRef = sec.config.type === "calc_ref";
      const pdfRefKey = isCalcRef ? `${sec.config.ref_calc_id}_${sec.config.ref_section_order}` : null;
      const pdfSrcSec = pdfRefKey ? refSectionConfigs[pdfRefKey] : null;
      const pdfEffectiveType = isCalcRef ? (pdfSrcSec?.config?.type || "input_table") : sec.config.type;

      if (pdfEffectiveType === "input_table") {
        // Resolve target config columns (virtual if calc_ref)
        let cols = sec.config.columns || [];
        if (isCalcRef && pdfSrcSec?.config?.columns) {
          cols = pdfSrcSec.config.columns;
        }

        const visibleCols = cols.filter(c => !isHidden(c));
        const rows = sectionRows[sec.order_num] || [];

        if (visibleCols.length > 0) {
          // Resolve Column Groups (if present)
          let columnGroups = sec.config.column_groups || [];
          if (isCalcRef && pdfSrcSec?.config?.column_groups) {
            columnGroups = pdfSrcSec.config.column_groups;
          }

          const colToGroup = {};
          columnGroups.forEach(g => g.column_ids.forEach(id => { colToGroup[id] = g; }));

          // Compile Headers (Virtual Group name prepended via newline)
          const headers = visibleCols.map(col => {
            const grp = colToGroup[col.id];
            return grp ? `${grp.label}\n${col.label}` : col.label;
          });

          // Compile Table Rows
          const body = rows.map(row => {
            return visibleCols.map(col => {
              const cell = row[col.id];
              let valStr = "";

              if (col.type === "dropdown" || col.type === "nested_dropdown" || col.type === "section_ref" || col.type === "cross_calc_ref") {
                valStr = cell?.label || (cell?.key === "__other__" ? cell?.otherText : "") || "";
              } else if (col.type === "locked") {
                const rawVal = cell ? (cell.rawValue ?? cell.text ?? cell.numValue ?? cell.v ?? 0) : 0;
                const numVal = parseFloat(rawVal);
                valStr = Number.isFinite(numVal) ? fmtNum(numVal) : String(rawVal ?? "");
              } else if (col.type === "formula") {
                const val = cell?.numValue ?? 0;
                valStr = isNaN(val) ? "-" : fmtNum(val);
              } else if (col.type === "number") {
                valStr = cell?.numValue !== undefined ? fmtNum(cell.numValue) : "";
              } else if (col.type === "text") {
                valStr = cell?.text || "";
              }
              return valStr;
            });
          });

          // Draw AutoTable
          autoTable(doc, {
            startY: y,
            margin: { left: 14, right: 14 },
            theme: "grid",
            head: [headers],
            body: body,
            styles: { fontSize: 7.5, cellPadding: 2, font: "helvetica", textColor: [15, 23, 42] },
            headStyles: { fillColor: [13, 59, 26], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, halign: "left", cellPadding: 2.5 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: function (data) {
              if (data.section === "body") {
                const colCfg = visibleCols[data.column.index];
                if (colCfg?.type === "formula") {
                  data.cell.styles.fontStyle = "bold";
                  data.cell.styles.textColor = [29, 78, 216]; // Blue for formulas
                }
              }
            }
          });

          y = doc.lastAutoTable.finalY + 4;
        } else {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text("No columns configured for this section.", 14, y);
          y += 5;
        }

        // Render Section Summaries Card (if visible summaries exist)
        let sums = sec.config.summaries || [];
        if (isCalcRef && pdfSrcSec?.config?.summaries) {
          sums = pdfSrcSec.config.summaries;
        }
        const visibleSums = sums.filter(s => !isHidden(s));

        if (visibleSums.length > 0) {
          const blockHeight = 6 + (visibleSums.length * 4.5) + 3;
          if (y + blockHeight > 275) {
            doc.addPage();
            y = 25;
          }

          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.rect(14, y, 182, blockHeight, "FD");

          let sumY = y + 5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(13, 59, 26);
          doc.text("Section Summaries:", 18, sumY);
          sumY += 4.5;

          visibleSums.forEach(s => {
            const val = summaries[sec.order_num]?.[s.id] ?? 0;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`${s.label}:`, 20, sumY);

            const labelWidth = doc.getTextWidth(`${s.label}:`);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(22, 163, 74);
            doc.text(`  ${fmtNum(val)}`, 20 + labelWidth, sumY);

            sumY += 4.5;
          });

          y += blockHeight + 6;
        } else {
          y += 4;
        }

      } else if (pdfEffectiveType === "formula_display") {
        let formulas = sec.config.formulas || [];
        if (isCalcRef && pdfSrcSec?.config?.formulas) {
          formulas = pdfSrcSec.config.formulas;
        }
        const visibleFormulas = formulas.filter(f => !isHidden(f));

        if (visibleFormulas.length > 0) {
          const body = visibleFormulas.map(f => {
            const val = summaries[sec.order_num]?.[f.id] ?? 0;
            const display = !isFinite(val) ? "N/A" : fmtNum(val);
            return [
              f.label || "",
              display,
              f.description || ""
            ];
          });

          autoTable(doc, {
            startY: y,
            margin: { left: 14, right: 14 },
            theme: "striped",
            head: [["Formula Parameter", "Result Value", "Description"]],
            body: body,
            styles: { fontSize: 7.5, cellPadding: 2.5, font: "helvetica", textColor: [15, 23, 42] },
            headStyles: { fillColor: [13, 59, 26], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
            columnStyles: {
              1: { fontStyle: "bold", textColor: [22, 163, 74], fontSize: 8.5 } // Emerald bold green
            }
          });

          y = doc.lastAutoTable.finalY + 6;
        } else {
          y += 2;
        }

      } else if (pdfEffectiveType === "instruction_table") {
        let blocks = isCalcRef ? pdfSrcSec?.config?.blocks : sec.config.blocks;
        const targetCfg = isCalcRef && pdfSrcSec ? pdfSrcSec.config : sec.config;
        if (!blocks) {
          blocks = [];
          if (targetCfg?.columns?.length || targetCfg?.rows?.length) {
            blocks = [{ blockType: "table", columns: targetCfg.columns || [], rows: targetCfg.rows || [], group_header: targetCfg.group_header }];
          }
        }

        if (blocks && blocks.length > 0) {
          const getLeafCols = (columnsList) => {
            const leaves = [];
            (columnsList || []).forEach(col => {
              if (col.isGroup && col.children?.length) leaves.push(...getLeafCols(col.children));
              else leaves.push(col);
            });
            return leaves;
          };

          for (const block of blocks) {
            if (block.blockType === "paragraph") {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.setTextColor(51, 65, 85);
              const splitText = doc.splitTextToSize(block.content, 182);

              if (y + splitText.length * 4 > 270) {
                doc.addPage();
                y = 25;
              }

              doc.text(splitText, 14, y);
              y += splitText.length * 4 + 4;
            } else if (block.blockType === "table") {
              const leafCols = getLeafCols(block.columns);
              if (leafCols.length > 0) {
                const headers = leafCols.map(col => col.label || "");
                const tableRows = (block.rows || []).map(row => {
                  return leafCols.map(col => {
                    const cell = row.cells?.[col.id];
                    if (!cell) return "";
                    if (cell.type === "url") return cell.label || cell.url || "";
                    if (cell.type === "image") return "[Image]";
                    return String(cell.value || "");
                  });
                });

                autoTable(doc, {
                  startY: y,
                  margin: { left: 14, right: 14 },
                  theme: "grid",
                  head: [headers],
                  body: tableRows,
                  styles: { fontSize: 7, cellPadding: 2, font: "helvetica", textColor: [71, 85, 105] },
                  headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
                  alternateRowStyles: { fillColor: [250, 250, 250] },
                });

                y = doc.lastAutoTable.finalY + 6;
              }
            }
          }
        }
      }
      y += 4; // Buffer space between sections
    });

    // ── 4. Footers and Dynamic Page Numbering ────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Clean top header bar (pages 2+)
      if (i > 1) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 14, 196, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`DESH Green Assessment System  ·  ${calcConfig.name || ""}`, 14, 11);
      }

      // Thin bottom divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 282, 196, 282);

      // Bottom footer text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("DESH Green Building System  |  Calculation Engine Report", 14, 287);

      // Page numbering right-aligned
      doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: "right" });
    }

    // Trigger vector PDF download
    const safeName = (calcConfig?.name || `calc-${calcId}`).replace(/[^\w-]+/g, "_");
    doc.save(`${safeName}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function handleImport(e) {
    if (readOnly) return;
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const payload = JSON.parse(ev.target.result);
        if (payload.schema !== "calc-engine-export") throw new Error("Not a calc-engine export file");
        if (!payload.data?.rows) throw new Error("Missing data");
        if (!window.confirm("Import will replace your current inputs. Continue?")) return;
        const { rows: newRows, sums: newSums } = doRecalc(payload.data.rows, payload.data.summaries || {}, calcConfig.sections);
        setSectionRows(newRows); setSummaries(newSums); saveData(newRows, newSums);
      } catch (err) { alert("Import failed: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  if (error) return <div className="ce-alert-error">Failed to load: {error}</div>;
  if (!calcConfig) return <div className="ce-loading">Loading calculation…</div>;

  const visibleSections = calcConfig.sections.filter(sec => !isHidden(sec.config || {}));

  return (
    <div className="ce-root">
      {/* Printable Report Header Block */}
      <div className="ce-print-header">
        <div className="ce-print-header-top">
          <img src="/images/logo (1).png" alt="DESH Logo" className="ce-print-logo" />
          <div className="ce-print-header-text">
            <h1 className="ce-print-main-title">DESH CALCULATION REPORT</h1>
            <div className="ce-print-meta-row">
              <span><strong>Date:</strong> {new Date().toLocaleDateString()}</span>
              <span><strong>Calculation:</strong> {calcConfig.name}</span>
              <span><strong>ID:</strong> {calcId}</span>
            </div>
          </div>
        </div>
        <hr className="ce-print-divider" />
      </div>

      <div className="ce-calc-hero">
        <div>
          <h2 className="ce-calc-title">{calcConfig.name}</h2>
          {calcConfig.description && <p className="ce-calc-desc">{calcConfig.description}</p>}
        </div>
        <div className="ce-actions">
          <div className="ce-export-dropdown-container" ref={dropdownRef}>
            <button className="ce-btn ce-btn-outline ce-export-trigger" onClick={() => setExportOpen(!exportOpen)}>
              📥 Download<span className={`ce-chevron ${exportOpen ? 'open' : ''}`}>▼</span>
            </button>
            {exportOpen && (
              <div className="ce-export-dropdown-menu">
                <button className="ce-dropdown-item" onClick={() => { handleExportPDF(); setExportOpen(false); }}>
                  <span className="ce-item-icon">📄</span>
                  <div className="ce-item-text">
                    <div className="ce-item-title">PDF Report</div>
                    <div className="ce-item-desc">Print or save a beautiful vector PDF document</div>
                  </div>
                </button>
                <button className="ce-dropdown-item" onClick={() => { handleExportCSV(); setExportOpen(false); }}>
                  <span className="ce-item-icon">📊</span>
                  <div className="ce-item-text">
                    <div className="ce-item-title">CSV Spreadsheet</div>
                    <div className="ce-item-desc">Extract tabular data into an Excel-friendly file</div>
                  </div>
                </button>
                <button className="ce-dropdown-item" onClick={() => { handleExport(); setExportOpen(false); }}>
                  <span className="ce-item-icon">⚙️</span>
                  <div className="ce-item-text">
                    <div className="ce-item-title">JSON Data</div>
                    <div className="ce-item-desc">Download calculation backup for re-importing</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          {!readOnly && (
            <>
              <label className="ce-btn ce-btn-outline" style={{ cursor: "pointer" }}>
                📤 Import <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
              </label>
              <button className="ce-btn ce-btn-secondary" onClick={handleReset}>↺ Reset</button>
            </>
          )}
        </div>
      </div>

      {visibleSections.map(sec => {
        const isCalcRef = sec.config.type === "calc_ref";
        const refKey = isCalcRef
          ? `${sec.config.ref_calc_id}_${sec.config.ref_section_order}`
          : null;
        const srcSec = refKey ? refSectionConfigs[refKey] : null;

        return (
          <div key={sec._id || sec.order_num} className="ce-section">
            <div className="ce-section-header">
              <div className="ce-section-order">§{sec.order_num}</div>
              <h3 className="ce-section-title">{sec.name}</h3>
            </div>

            {sec.config.type === "input_table" && (
              <InputTableSection sec={sec} sections={calcConfig.sections} sectionRows={sectionRows}
                setSectionRows={setSectionRows} summaries={summaries} crossCalcRows={crossCalcRows}
                dropdowns={dropdowns} onRecalc={handleRecalc} readOnly={readOnly} />
            )}
            {sec.config.type === "formula_display" && (
              <FormulaDisplaySection sec={sec} summaries={summaries} />
            )}
            {isCalcRef && srcSec && (
              <EditableCalcRefSection
                sec={sec}
                srcSec={srcSec}
                allSections={calcConfig.sections}
                refSectionConfigs={refSectionConfigs}
                sectionRows={sectionRows}
                setSectionRows={setSectionRows}
                setCrossCalcRows={setCrossCalcRows}
                summaries={summaries}
                crossCalcRows={crossCalcRows}
                dropdowns={dropdowns}
                onRecalc={handleRecalc}
                readOnly={readOnly}
                projectId={projectId}
                axios={axios}
              />
            )}
            {isCalcRef && !srcSec && (
              <CalcRefSectionReadOnly sec={sec} crossCalcRows={crossCalcRows} />
            )}
            {sec.config.type === "instruction_table" && (
              <InstructionTableSection sec={sec} />
            )}
          </div>
        );
      })}
    </div>
  );
}
