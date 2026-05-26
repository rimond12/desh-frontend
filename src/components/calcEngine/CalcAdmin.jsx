/**
 * CalcAdmin.jsx — DESH-integrated Calculation Admin
 * All admin API calls use axiosSecure (Bearer token auth).
 * Public reads use plain fetch.
 */
import { useState, useEffect, useRef } from "react";
import useAxiosSecure from "../../hooks/useAxiosSecure.jsx";
import CalcEngine from "./CalcEngine.jsx";
import "./calcEngine.css";
import "./calcAdmin.css";

const API_BASE = "/calc"; // relative to axiosSecure baseURL

// ── Helpers ───────────────────────────────────────────────────────────────────
function isHidden(item) { return item?.hidden === true || item?.visible === false; }
function VisibilityBadge({ item }) {
  return isHidden(item)
    ? <span className="ce-badge ce-badge-hidden">Hidden</span>
    : <span className="ce-badge ce-badge-visible">Visible</span>;
}

function extraValuesToText(vals) {
  if (!vals || typeof vals !== "object") return "";
  return Object.entries(vals).map(([k, v]) => `${k}=${v ?? ""}`).join("\n");
}
function parseExtraValues(text) {
  const out = {};
  String(text || "").split(/\r?\n/).forEach(line => {
    const t = line.trim(); if (!t) return;
    const idx = t.indexOf("="); if (idx < 1) return;
    const key = t.slice(0, idx).trim().replace(/\s+/g, "_"); const raw = t.slice(idx + 1).trim();
    if (!key) return;
    const asNum = Number(raw);
    out[key] = raw !== "" && Number.isFinite(asNum) ? asNum : raw;
  });
  return out;
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer, large = false }) {
  return (
    <div className="ce-modal-overlay" onClick={e => { e.stopPropagation(); if (e.target.classList.contains("ce-modal-overlay")) onClose(); }}>
      <div className={`ce-modal${large ? " ce-modal-lg" : ""}`}>
        <div className="ce-modal-header"><h3>{title}</h3><button className="ce-modal-close" onClick={onClose}>×</button></div>
        <div className="ce-modal-body">{children}</div>
        <div className="ce-modal-footer">{footer}</div>
      </div>
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ masterId, parentId, editItem, onClose, onSaved, axios }) {
  const [key, setKey] = useState(editItem?.item_key || "");
  const [label, setLabel] = useState(editItem?.item_label || "");
  const [numVal, setNumVal] = useState(editItem?.num_value ?? 0);
  const [extras, setExtras] = useState(extraValuesToText(editItem?.extra_values));
  const [order, setOrder] = useState(editItem?.order_num ?? 0);
  async function handleSave() {
    if (!key || !label) { alert("Key and Label required"); return; }
    try {
      await axios.post(`${API_BASE}/admin/dropdown-items`, { id: editItem?._id || editItem?.id || undefined, master_id: masterId, parent_id: parentId || null, item_key: key, item_label: label, num_value: parseFloat(numVal) || 0, extra_values: parseExtraValues(extras), order_num: parseInt(order) || 0 });
      onSaved(); onClose();
    } catch (e) { alert("Save failed: " + e.message); }
  }
  return (
    <Modal title={editItem ? "Edit Item" : (parentId ? "Add Child Item" : "Add Item")} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleSave}>Save</button></>}>
      <label className="ce-label">Key *</label>
      <input type="text" className="ce-input ce-form-input" value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. F4" />
      <label className="ce-label">Label *</label>
      <input type="text" className="ce-input ce-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. F4" />
      <label className="ce-label">Numeric Value</label>
      <input type="number" className="ce-input ce-form-input" value={numVal} step="any" onChange={e => setNumVal(e.target.value)} />
      <label className="ce-label">Extra Values <span className="ce-hint">(one per line: field=value)</span></label>
      <textarea className="ce-input ce-form-input" rows={3} value={extras} onChange={e => setExtras(e.target.value)} placeholder={"value1=12.5\nnote=text"} />
      <label className="ce-label">Order</label>
      <input type="number" className="ce-input ce-form-input" value={order} onChange={e => setOrder(e.target.value)} />
    </Modal>
  );
}

// ── Master Card ───────────────────────────────────────────────────────────────
function MasterCard({ master, onRefresh, axios }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(master.name);
  const [desc, setDesc] = useState(master.description || "");
  const [itemModal, setItemModal] = useState(null);

  async function loadItems() {
    try { const r = await axios.get(`${API_BASE}/dropdown-masters/${master._id || master.id}`); setItems(r.data.data.items || []); }
    catch (e) { alert("Load failed: " + e.message); }
  }
  function toggle() { const n = !open; setOpen(n); if (n && items === null) loadItems(); }
  async function handleSave() {
    try { await axios.post(`${API_BASE}/admin/dropdown-masters`, { id: master._id || master.id, name, description: desc }); setEditing(false); onRefresh(); }
    catch (e) { alert("Save failed: " + e.message); }
  }
  async function handleDelete() {
    if (!window.confirm("Delete this list and all items?")) return;
    try { await axios.delete(`${API_BASE}/admin/dropdown-masters/${master._id || master.id}`); onRefresh(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }
  async function handleDeleteItem(id) {
    if (!window.confirm("Delete this item?")) return;
    try { await axios.delete(`${API_BASE}/admin/dropdown-items/${id}`); loadItems(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  function renderItems(list, depth = 0) {
    return list.map(item => (
      <div key={item._id || item.id}>
        <div className="ce-item-row" style={{ marginLeft: depth * 20 }}>
          <span className="ce-item-key">{item.item_key}</span>
          <span className="ce-item-label">{item.item_label}</span>
          <span className="ce-item-value">{item.num_value}</span>
          <button className="ce-icon-btn" onClick={() => setItemModal({ editItem: item, parentId: item.parent_id })}>✏</button>
          <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => handleDeleteItem(item._id || item.id)}>✕</button>
          <button className="ce-icon-btn" onClick={() => setItemModal({ editItem: null, parentId: item._id || item.id })}>+</button>
        </div>
        {item.children?.length > 0 && renderItems(item.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="ce-master-card">
      <div className="ce-master-header" onClick={toggle}>
        <span className="ce-master-title">{master.name}</span>
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: ".35rem" }}>
          <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setEditing(true)}>✏ Edit</button>
          <button className="ce-btn ce-btn-danger ce-btn-sm" onClick={handleDelete}>✕</button>
        </div>
      </div>
      {editing && (
        <Modal title={`Edit: ${master.name}`} onClose={() => setEditing(false)}
          footer={<><button className="ce-btn ce-btn-secondary" onClick={() => setEditing(false)}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleSave}>Save</button></>}>
          <label className="ce-label">List Name *</label>
          <input type="text" className="ce-input ce-form-input" value={name} onChange={e => setName(e.target.value)} />
          <label className="ce-label">Description</label>
          <input type="text" className="ce-input ce-form-input" value={desc} onChange={e => setDesc(e.target.value)} />
        </Modal>
      )}
      {open && (
        <div className="ce-master-body">
          {items === null ? <p style={{ color: "#94a3b8" }}>Loading…</p> : (
            <>
              <div className="ce-item-list">{items.length === 0 && <p style={{ color: "#94a3b8", fontSize: ".83rem" }}>No items</p>}{renderItems(items)}</div>
              <button className="ce-btn ce-btn-outline ce-btn-sm" style={{ marginTop: ".5rem" }} onClick={() => setItemModal({ editItem: null, parentId: null })}>+ Add Top-Level Item</button>
            </>
          )}
        </div>
      )}
      {itemModal && <ItemModal masterId={master._id || master.id} parentId={itemModal.parentId} editItem={itemModal.editItem}
        onClose={() => setItemModal(null)} onSaved={loadItems} axios={axios} />}
    </div>
  );
}

// ── Column Type Fields ────────────────────────────────────────────────────────
function ColTypeFields({ type, col, allMasters, allCalcs, editorColumns, editingIdx, onChange, currentCalcId, currentCalcOrder }) {
  const set = (key, val) => onChange({ ...col, [key]: val });
  if (type === "dropdown") return (
    <div>
      <label className="ce-label">Dropdown Master List *</label>
      <select className="ce-select ce-form-input" value={col.dropdown_master_id || ""} onChange={e => set("dropdown_master_id", e.target.value)}>
        <option value="">-- Select --</option>
        {allMasters.map(m => <option key={m._id || m.id} value={m._id || m.id}>{m.name}</option>)}
      </select>
      <label className="ce-label"><input type="checkbox" checked={!!col.allow_others} onChange={e => set("allow_others", e.target.checked)} /> Allow "Others" option</label>
    </div>
  );
  if (type === "nested_dropdown") {
    const ddCols = editorColumns.filter(c => c.type === "dropdown");
    return (<div>
      <label className="ce-label">Parent Column *</label>
      <select className="ce-select ce-form-input" value={col.parent_col || ""} onChange={e => set("parent_col", e.target.value)}>
        <option value="">-- Select --</option>
        {ddCols.map(c => <option key={c.id} value={c.id}>{c.label} [{c.id}]</option>)}
      </select>
      <label className="ce-label"><input type="checkbox" checked={!!col.others_follows_parent} onChange={e => set("others_follows_parent", e.target.checked)} /> When parent is "Others", this is also "Others"</label>
    </div>);
  }
  if (type === "section_ref") return (<div>
    <label className="ce-label">Source Section (order number) *</label>
    <input type="number" className="ce-input ce-form-input" style={{ maxWidth: 100 }} value={col.ref_section_order || 1} min={1} onChange={e => set("ref_section_order", parseInt(e.target.value) || 1)} />
    <label className="ce-label"><input type="checkbox" checked={!!col.allow_duplicates} onChange={e => set("allow_duplicates", e.target.checked)} /> Allow same row multiple times</label>
  </div>);
  if (type === "cross_calc_ref") return (<div>
    <label className="ce-label">Reference Calculation</label>
    <select className="ce-select ce-form-input" value={col.ref_calc_id || ""} onChange={e => set("ref_calc_id", e.target.value)}>
      <option value="">-- Select --</option>
      {allCalcs.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
    </select>
    <label className="ce-label">Reference Section Order</label>
    <input type="number" className="ce-input ce-form-input" style={{ maxWidth: 100 }} value={col.ref_section_order || 1} min={1} onChange={e => set("ref_section_order", parseInt(e.target.value) || 1)} />
    <label className="ce-label"><input type="checkbox" checked={!!col.allow_duplicates} onChange={e => set("allow_duplicates", e.target.checked)} /> Allow duplicates</label>
  </div>);
  if (type === "locked") {
    const others = editorColumns.filter((_, i) => i !== editingIdx);
    return (<div>
      <label className="ce-label">Source Column *</label>
      <select className="ce-select ce-form-input" value={col.source_col || ""} onChange={e => set("source_col", e.target.value)}>
        <option value="">-- Select --</option>
        {others.map(c => <option key={c.id} value={c.id}>{c.label} [{c.id}]</option>)}
      </select>
      <label className="ce-label">Source Field</label>
      <input type="text" className="ce-input ce-form-input" value={col.source_field || "numValue"} onChange={e => set("source_field", e.target.value)} list="ce_sf" />
      <datalist id="ce_sf">{["numValue", "area", "key", "label", "text"].map(f => <option key={f} value={f} />)}</datalist>
      <label className="ce-label"><input type="checkbox" checked={!!col.allow_unlock} onChange={e => set("allow_unlock", e.target.checked)} /> Allow user to unlock &amp; override (🔒/🔓)</label>
    </div>);
  }
  if (type === "formula") return (
    <div>
      <label className="ce-label">Formula Expression *</label>
      <FormulaInput
        value={col.expr || ""}
        onChange={v => set("expr", v)}
        placeholder="e.g. ROW.total_area * ROW.coeff"
        currentCalcId={currentCalcId}
        currentCalcOrder={currentCalcOrder}
        allCalcs={allCalcs}
      />
      <p className="ce-hint">
        <code>ROW.colId</code> · <code>SEC(n).id</code> · <code>CAL(c).SEC(n).id</code>
      </p>
    </div>
  );
  if (type === "number") {
    const ddCols = editorColumns.filter(c => c.type === "dropdown");
    return (<div>
      <label className="ce-label"><input type="checkbox" checked={!!col.linked_to_dropdown} onChange={e => set("linked_to_dropdown", e.target.checked ? (ddCols[0]?.id || "") : undefined)} /> Pre-fill from dropdown (user can edit)</label>
      {col.linked_to_dropdown && <select className="ce-select ce-form-input" value={col.linked_to_dropdown || ""} onChange={e => set("linked_to_dropdown", e.target.value)}>{ddCols.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>}
    </div>);
  }
  return null;
}

// ── Column Modal ──────────────────────────────────────────────────────────────
function ColumnModal({ editCol, editIdx, allMasters, allCalcs, editorColumns, onClose, onConfirm, currentCalcId, currentCalcOrder }) {
  const [col, setCol] = useState(editCol ? JSON.parse(JSON.stringify(editCol)) : { id: "", label: "", type: "number" });
  const TYPES = [["number", "Number"], ["text", "Text"], ["dropdown", "Dropdown"], ["section_ref", "Section Reference"], ["cross_calc_ref", "Cross-Calc Reference"], ["nested_dropdown", "Nested Dropdown"], ["locked", "Locked (auto-fill)"], ["formula", "Formula"]];
  return (
    <Modal title={editCol ? "Edit Column" : "Add Column"} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={() => { const id = col.id.trim().replace(/\s+/g, "_"); if (!id || !col.label) { alert("ID and Label required"); return; } onConfirm({ ...col, id }, editIdx); }}>
        {editCol ? "Save Column" : "Add Column"}</button></>}>
      <div className="ce-form-grid">
        <div><label className="ce-label">Column ID * <span className="ce-hint">(no spaces)</span></label><input type="text" className="ce-input ce-form-input" value={col.id} onChange={e => setCol({ ...col, id: e.target.value })} placeholder="e.g. area" /></div>
        <div><label className="ce-label">Label *</label><input type="text" className="ce-input ce-form-input" value={col.label} onChange={e => setCol({ ...col, label: e.target.value })} placeholder="e.g. Area (m²)" /></div>
      </div>
      <label className="ce-label">Column Type *</label>
      <select className="ce-select ce-form-input" value={col.type} onChange={e => setCol({ ...col, type: e.target.value })}>
        {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ColTypeFields type={col.type} col={col} allMasters={allMasters} allCalcs={allCalcs} editorColumns={editorColumns} editingIdx={editIdx} onChange={setCol} currentCalcId={currentCalcId} currentCalcOrder={currentCalcOrder} />
    </Modal>
  );
}

// ── Column Group Modal (input table merged headers) ───────────────────────────
function GroupModal({ editGroup, editIdx, columns, onClose, onConfirm }) {
  const [grp, setGrp] = useState(editGroup
    ? JSON.parse(JSON.stringify(editGroup))
    : { id: `grp_${Date.now()}`, label: "", bgColor: "#dbeafe", textColor: "#1e40af", column_ids: [] }
  );
  function toggleCol(colId) {
    setGrp(g => ({ ...g, column_ids: g.column_ids.includes(colId) ? g.column_ids.filter(id => id !== colId) : [...g.column_ids, colId] }));
  }
  function handleSave() {
    if (!grp.label.trim()) { alert("Group label required"); return; }
    if (!grp.column_ids.length) { alert("Select at least one column for this group"); return; }
    onConfirm({ ...grp, label: grp.label.trim() }, editIdx);
  }
  return (
    <Modal title={editGroup ? "Edit Column Group" : "Add Column Group"} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleSave}>Save Group</button></>}>
      <label className="ce-label">Group Label *</label>
      <input type="text" className="ce-input ce-form-input" value={grp.label} onChange={e => setGrp(g => ({ ...g, label: e.target.value }))} placeholder="e.g. Building Details" />
      <div className="ce-form-grid">
        <div><label className="ce-label">Background Color</label><input type="color" className="ce-input ce-form-input" style={{ height: 38, padding: 2, cursor: "pointer" }} value={grp.bgColor || "#dbeafe"} onChange={e => setGrp(g => ({ ...g, bgColor: e.target.value }))} /></div>
        <div><label className="ce-label">Text Color</label><input type="color" className="ce-input ce-form-input" style={{ height: 38, padding: 2, cursor: "pointer" }} value={grp.textColor || "#1e40af"} onChange={e => setGrp(g => ({ ...g, textColor: e.target.value }))} /></div>
      </div>
      <label className="ce-label">Columns in this group *</label>
      <p className="ce-hint">Tick the columns that should appear under this merged header.</p>
      {columns.length === 0 && <p className="ce-hint" style={{ color: "#dc2626" }}>No columns defined yet — add columns first.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", marginTop: ".4rem" }}>
        {columns.map(col => (
          <label key={col.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".83rem", cursor: "pointer" }}>
            <input type="checkbox" checked={grp.column_ids.includes(col.id)} onChange={() => toggleCol(col.id)} />
            <span style={{ fontWeight: 600 }}>{col.label}</span>
            <span className="ce-col-id">[{col.id}]</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}

// ── Cross-Section Reference Picker ────────────────────────────────────────────
/**
 * CrossRefPicker — lets the user browse calcs/sections/summaries and
 * click to insert a reference token  (SEC(n).id  or  CAL(c).SEC(n).id)
 * into a formula field.
 *
 * Props:
 *   currentCalcId  – the _id of the calculation being edited (may be null when
 *                    editing a new, unsaved calc)
 *   currentCalcOrder – order_num of the current calc
 *   allCalcs       – array of all calc objects { _id, id, name, order_num }
 *   onInsert(token) – called with the generated token string
 */
function CrossRefPicker({ currentCalcId, currentCalcOrder, allCalcs, onInsert }) {
  const [selCalcId, setSelCalcId] = useState(currentCalcId || "");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selSecOrder, setSelSecOrder] = useState("");
  const [selId, setSelId] = useState("");

  // Derive order_num for selected calc
  const selCalc = allCalcs.find(c => (c._id || c.id) === selCalcId);
  const selCalcOrder = selCalc?.order_num ?? currentCalcOrder;
  const isSameCalc = selCalcId === currentCalcId;

  // Load sections when selected calc changes
  useEffect(() => {
    if (!selCalcId) { setSections([]); return; }
    setLoading(true);
    fetch((process.env.REACT_APP_API_URL || "http://localhost:5000/api") + `/calc/calculations/${selCalcId}`)
      .then(r => r.json())
      .then(j => {
        const secs = (j.data?.sections || []).sort((a, b) => a.order_num - b.order_num);
        setSections(secs);
        setSelSecOrder("");
        setSelId("");
      })
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [selCalcId]);

  // Items available in the selected section (summary IDs or formula IDs)
  const selSec = sections.find(s => String(s.order_num) === String(selSecOrder));
  const availableIds = selSec
    ? (selSec.config?.summaries || selSec.config?.formulas || []).map(x => ({ id: x.id, label: x.label }))
    : [];

  function buildToken() {
    if (!selSecOrder || !selId) return null;
    if (isSameCalc) return `SEC(${selSecOrder}).${selId}`;
    return `CAL(${selCalcOrder}).SEC(${selSecOrder}).${selId}`;
  }

  function handleInsert() {
    const t = buildToken();
    if (!t) { alert("Please select a section and a value ID."); return; }
    onInsert(t);
  }

  const token = buildToken();

  return (
    <div className="ce-xref-picker">
      <div className="ce-xref-picker-title">
        <span className="ce-xref-icon">🔗</span>
        Cross-Section Reference Builder
      </div>

      {/* Step 1 – Calculation */}
      <div className="ce-xref-step">
        <div className="ce-xref-step-num">1</div>
        <div className="ce-xref-step-body">
          <label className="ce-label" style={{ marginTop: 0 }}>Calculation</label>
          <select className="ce-select" value={selCalcId} onChange={e => setSelCalcId(e.target.value)}>
            <option value="">-- Select calculation --</option>
            {allCalcs.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>
                CAL({c.order_num}) · {c.name}{(c._id || c.id) === currentCalcId ? " ★ (this calc)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 2 – Section */}
      <div className="ce-xref-step">
        <div className="ce-xref-step-num">2</div>
        <div className="ce-xref-step-body">
          <label className="ce-label" style={{ marginTop: 0 }}>Section</label>
          {loading ? (
            <p className="ce-hint" style={{ margin: 0 }}>Loading sections…</p>
          ) : (
            <select className="ce-select" value={selSecOrder} onChange={e => { setSelSecOrder(e.target.value); setSelId(""); }} disabled={!selCalcId}>
              <option value="">-- Select section --</option>
              {sections
                .filter(s => ["input_table", "formula_display"].includes(s.config?.type))
                .map(s => (
                  <option key={s.order_num} value={s.order_num}>
                    SEC({s.order_num}) · {s.name} [{s.config?.type}]
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>

      {/* Step 3 – Value ID */}
      <div className="ce-xref-step">
        <div className="ce-xref-step-num">3</div>
        <div className="ce-xref-step-body">
          <label className="ce-label" style={{ marginTop: 0 }}>Value ID</label>
          {selSecOrder && availableIds.length === 0 ? (
            <p className="ce-hint" style={{ margin: 0, color: "#dc2626" }}>No summaries/formulas in this section. Add them first.</p>
          ) : (
            <div className="ce-xref-id-grid">
              {availableIds.map(item => (
                <button key={item.id}
                  className={`ce-xref-id-chip${selId === item.id ? " selected" : ""}`}
                  onClick={() => setSelId(item.id)}
                  title={item.label}
                >
                  <span className="ce-xref-chip-id">{item.id}</span>
                  <span className="ce-xref-chip-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Token preview + Insert */}
      {token && (
        <div className="ce-xref-token-row">
          <code className="ce-xref-token">{token}</code>
          <button className="ce-btn ce-btn-primary ce-btn-sm" onClick={handleInsert}>
            ↩ Insert
          </button>
        </div>
      )}
    </div>
  );
}

// ── Formula Field with Ref Picker ──────────────────────────────────────────────
/**
 * FormulaInput – textarea/input wrapper that adds a toggle button for the
 * CrossRefPicker inline panel. Handles insertion at cursor position.
 */
function FormulaInput({ value, onChange, multiline = false, placeholder, currentCalcId, currentCalcOrder, allCalcs }) {
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef(null);

  function handleInsert(token) {
    const el = inputRef.current;
    if (!el) { onChange(value + token); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // Restore cursor after insertion
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const commonProps = {
    ref: inputRef,
    className: "ce-input ce-form-input",
    value,
    onChange: e => onChange(e.target.value),
    placeholder,
    style: { fontFamily: "monospace" },
  };

  return (
    <div className="ce-formula-field-wrap">
      <div className="ce-formula-field-row">
        {multiline
          ? <textarea {...commonProps} rows={2} style={{ ...commonProps.style, resize: "vertical" }} />
          : <input type="text" {...commonProps} />
        }
        <button
          type="button"
          className={`ce-xref-toggle-btn${showPicker ? " active" : ""}`}
          onClick={() => setShowPicker(p => !p)}
          title="Insert cross-section reference"
        >
          🔗
        </button>
      </div>
      {showPicker && (
        <CrossRefPicker
          currentCalcId={currentCalcId}
          currentCalcOrder={currentCalcOrder}
          allCalcs={allCalcs}
          onInsert={t => { handleInsert(t); setShowPicker(false); }}
        />
      )}
    </div>
  );
}

// ── Summary Modal ─────────────────────────────────────────────────────────────
function SummaryModal({ editSummary, editIdx, onClose, onConfirm, currentCalcId, currentCalcOrder, allCalcs }) {
  const [s, setS] = useState(editSummary ? JSON.parse(JSON.stringify(editSummary)) : { id: "", label: "", formula: "" });
  return (
    <Modal title={editSummary ? "Edit Summary" : "Add Summary"} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={() => { if (!s.id || !s.label || !s.formula) { alert("All fields required"); return; } onConfirm(s, editIdx); }}>Save</button></>}>
      <div className="ce-form-grid">
        <div><label className="ce-label">ID *</label><input type="text" className="ce-input ce-form-input" value={s.id} onChange={e => setS({ ...s, id: e.target.value })} /></div>
        <div><label className="ce-label">Label *</label><input type="text" className="ce-input ce-form-input" value={s.label} onChange={e => setS({ ...s, label: e.target.value })} /></div>
      </div>
      <label className="ce-label">Formula *</label>
      <FormulaInput
        multiline
        value={s.formula}
        onChange={v => setS({ ...s, formula: v })}
        placeholder="e.g. SUM(area)"
        currentCalcId={currentCalcId}
        currentCalcOrder={currentCalcOrder}
        allCalcs={allCalcs}
      />
      <p className="ce-hint">
        <code>SUM(colId)</code> · <code>AVG(colId)</code> · <code>COUNT()</code><br />
        <code>SEC(n).id</code> – same-calc section · <code>CAL(c).SEC(n).id</code> – cross-calc section
      </p>
    </Modal>
  );
}


// ── Formula Modal ─────────────────────────────────────────────────────────────
function FormulaModal({ editFormula, editIdx, onClose, onConfirm, currentCalcId, currentCalcOrder, allCalcs }) {
  const [f, setF] = useState(editFormula ? JSON.parse(JSON.stringify(editFormula)) : { id: "", label: "", expr: "", description: "" });
  return (
    <Modal title={editFormula ? "Edit Formula" : "Add Formula"} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={() => { if (!f.id || !f.label || !f.expr) { alert("All fields required"); return; } onConfirm(f, editIdx); }}>Save</button></>}>
      <div className="ce-form-grid">
        <div><label className="ce-label">ID *</label><input type="text" className="ce-input ce-form-input" value={f.id} onChange={e => setF({ ...f, id: e.target.value })} /></div>
        <div><label className="ce-label">Label *</label><input type="text" className="ce-input ce-form-input" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} /></div>
      </div>
      <label className="ce-label">Expression *</label>
      <FormulaInput
        value={f.expr}
        onChange={v => setF({ ...f, expr: v })}
        placeholder="e.g. SEC(2).total_area * 0.5"
        currentCalcId={currentCalcId}
        currentCalcOrder={currentCalcOrder}
        allCalcs={allCalcs}
      />
      <p className="ce-hint">
        <code>SEC(n).id</code> – same-calc summary · <code>CAL(c).SEC(n).id</code> – cross-calc summary<br />
        <code>CAL(c).SEC(n).SUM(colId)</code> – aggregate from another calc
      </p>
      <label className="ce-label">Description <span className="ce-hint">(optional)</span></label>
      <input type="text" className="ce-input ce-form-input" value={f.description || ""} onChange={e => setF({ ...f, description: e.target.value })} />
    </Modal>
  );
}


// ── Instruction Table Helpers ─────────────────────────────────────────────────
function getLeafColumns(columns) {
  const leaves = [];
  (columns || []).forEach(col => {
    if (col.isGroup && col.children?.length) leaves.push(...getLeafColumns(col.children));
    else leaves.push(col);
  });
  return leaves;
}

// ── Instruction Table: Column Modal ───────────────────────────────────────────
function InstrColModal({ editCol, editIdx, onClose, onConfirm }) {
  const [col, setCol] = useState(() => editCol
    ? JSON.parse(JSON.stringify(editCol))
    : { id: "", label: "", bgColor: "#ffffff", textColor: "#000000", width: "", isGroup: false, children: [] }
  );
  function addChild() { setCol(c => ({ ...c, children: [...(c.children || []), { id: "", label: "", bgColor: "#F5E200", textColor: "#000000", width: "" }] })); }
  function removeChild(i) { setCol(c => ({ ...c, children: c.children.filter((_, ci) => ci !== i) })); }
  function updateChild(i, key, val) { setCol(c => { const ch = [...(c.children || [])]; ch[i] = { ...ch[i], [key]: val }; return { ...c, children: ch }; }); }
  function handleSave() {
    const id = col.id.trim().replace(/\s+/g, "_");
    if (!id || !col.label.trim()) { alert("ID and Label required"); return; }
    if (col.isGroup) {
      if (!col.children?.length) { alert("Group column needs at least one sub-column"); return; }
      for (const ch of col.children) { if (!ch.id.trim() || !ch.label.trim()) { alert("All sub-column IDs and Labels are required"); return; } }
    }
    const saved = { ...col, id, label: col.label.trim() };
    if (saved.isGroup) saved.children = saved.children.map(c => ({ ...c, id: c.id.trim().replace(/\s+/g, "_") }));
    onConfirm(saved, editIdx);
  }
  return (
    <Modal title={editCol ? "Edit Column" : "Add Column"} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleSave}>Save Column</button></>}>
      <div className="ce-form-grid">
        <div><label className="ce-label">Column ID * <span className="ce-hint">(no spaces)</span></label><input type="text" className="ce-input ce-form-input" value={col.id} onChange={e => setCol(c => ({ ...c, id: e.target.value }))} placeholder="e.g. sub_cat" /></div>
        <div><label className="ce-label">Header Label *</label><input type="text" className="ce-input ce-form-input" value={col.label} onChange={e => setCol(c => ({ ...c, label: e.target.value }))} placeholder="e.g. Sub-categories" /></div>
      </div>
      <div className="ce-form-grid">
        <div><label className="ce-label">Background Color</label><input type="color" className="ce-input ce-form-input" style={{ height: 38, padding: 2, cursor: "pointer" }} value={col.bgColor || "#ffffff"} onChange={e => setCol(c => ({ ...c, bgColor: e.target.value }))} /></div>
        <div><label className="ce-label">Text Color</label><input type="color" className="ce-input ce-form-input" style={{ height: 38, padding: 2, cursor: "pointer" }} value={col.textColor || "#000000"} onChange={e => setCol(c => ({ ...c, textColor: e.target.value }))} /></div>
      </div>
      <label className="ce-label">Width <span className="ce-hint">(optional, e.g. "150px" or "25%")</span></label>
      <input type="text" className="ce-input ce-form-input" value={col.width || ""} onChange={e => setCol(c => ({ ...c, width: e.target.value }))} placeholder="e.g. 200px" />
      <label className="ce-label ce-check-label" style={{ marginTop: ".9rem" }}>
        <input type="checkbox" checked={!!col.isGroup} onChange={e => setCol(c => ({ ...c, isGroup: e.target.checked, children: c.children?.length ? c.children : [] }))} />
        Group Column <span className="ce-hint">(contains nested sub-columns)</span>
      </label>
      {col.isGroup && (
        <div className="ce-instr-child-col-editor">
          <div className="ce-section-editor-header" style={{ marginTop: ".75rem" }}>
            <strong>Sub-columns</strong>
            <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={addChild}>+ Add Sub-column</button>
          </div>
          {!(col.children?.length) && <p className="ce-hint">No sub-columns yet.</p>}
          {(col.children || []).map((child, i) => (
            <div key={i} className="ce-instr-child-col-row">
              <input className="ce-input" value={child.id} onChange={e => updateChild(i, "id", e.target.value)} placeholder="ID" style={{ width: 72 }} />
              <input className="ce-input" value={child.label} onChange={e => updateChild(i, "label", e.target.value)} placeholder="Label" style={{ flex: 1 }} />
              <input className="ce-input" value={child.width || ""} onChange={e => updateChild(i, "width", e.target.value)} placeholder="width" style={{ width: 64 }} />
              <input type="color" title="Background" style={{ width: 32, height: 30, padding: 2, cursor: "pointer", border: "1px solid #e2e8f0", borderRadius: 4 }} value={child.bgColor || "#F5E200"} onChange={e => updateChild(i, "bgColor", e.target.value)} />
              <input type="color" title="Text color" style={{ width: 32, height: 30, padding: 2, cursor: "pointer", border: "1px solid #e2e8f0", borderRadius: 4 }} value={child.textColor || "#000000"} onChange={e => updateChild(i, "textColor", e.target.value)} />
              <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => removeChild(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Instruction Table: Cell Modal ─────────────────────────────────────────────
function InstrCellModal({ cell, colLabel, onClose, onConfirm }) {
  const [type, setType] = useState(cell?.type || "text");
  const [value, setValue] = useState(cell?.value || "");
  const [url, setUrl] = useState(cell?.url || "");
  const [label, setLabel] = useState(cell?.label || "");
  const [src, setSrc] = useState(cell?.src || "");
  const [alt, setAlt] = useState(cell?.alt || "");
  const [imgMode, setImgMode] = useState(cell?.src?.startsWith("data:") ? "upload" : "url");
  const [rowspan, setRowspan] = useState(cell?.rowspan || 1);
  const [imgAlign, setImgAlign] = useState(cell?.imgAlign || "left");
  const [imgWidth, setImgWidth] = useState(cell?.imgWidth || "100%");

  function handleImageUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSrc(ev.target.result);
    reader.readAsDataURL(file);
  }
  function handleConfirm() {
    let result = {};
    if (type === "text") result = { type: "text", value };
    else if (type === "url") { if (!url.trim()) { alert("URL required"); return; } result = { type: "url", url: url.trim(), label: label.trim() }; }
    else if (type === "image") { if (!src) { alert("Image required"); return; } result = { type: "image", src, alt: alt.trim(), imgAlign, imgWidth }; }
    if (parseInt(rowspan) > 1) result.rowspan = parseInt(rowspan);
    onConfirm(result);
  }
  return (
    <Modal title={`Edit Cell — ${colLabel}`} onClose={onClose}
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleConfirm}>Save Cell</button></>}>
      <label className="ce-label">Cell Type</label>
      <select className="ce-select ce-form-input" value={type} onChange={e => setType(e.target.value)}>
        <option value="text">Text</option>
        <option value="url">URL / Link</option>
        <option value="image">Image</option>
      </select>
      {type === "text" && (<><label className="ce-label">Content</label><textarea className="ce-input ce-form-input" rows={3} value={value} onChange={e => setValue(e.target.value)} style={{ resize: "vertical" }} /></>)}
      {type === "url" && (<>
        <label className="ce-label">URL *</label>
        <input type="url" className="ce-input ce-form-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        <label className="ce-label">Display Label <span className="ce-hint">(leave blank to show the URL)</span></label>
        <input type="text" className="ce-input ce-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Visit website" />
      </>)}
      {type === "image" && (<>
        <div style={{ display: "flex", gap: ".4rem", marginBottom: ".5rem" }}>
          <button className={`ce-btn ce-btn-sm ${imgMode === "upload" ? "ce-btn-primary" : "ce-btn-outline"}`} onClick={() => setImgMode("upload")}>Upload File</button>
          <button className={`ce-btn ce-btn-sm ${imgMode === "url" ? "ce-btn-primary" : "ce-btn-outline"}`} onClick={() => setImgMode("url")}>Image URL</button>
        </div>
        {imgMode === "upload" && <><label className="ce-label">Upload Image</label><input type="file" accept="image/*" style={{ fontSize: ".82rem" }} onChange={handleImageUpload} /></>}
        {imgMode === "url" && <><label className="ce-label">Image URL</label><input type="url" className="ce-input ce-form-input" value={src.startsWith("data:") ? "" : src} onChange={e => setSrc(e.target.value)} placeholder="https://example.com/image.png" /></>}
        {src && <img src={src} alt={alt || ""} style={{ maxWidth: "100%", maxHeight: 120, marginTop: ".5rem", borderRadius: 6, border: "1px solid #e2e8f0", display: "block" }} />}
        <label className="ce-label">Alt Text</label>
        <input type="text" className="ce-input ce-form-input" value={alt} onChange={e => setAlt(e.target.value)} placeholder="Image description" />
        <div className="ce-form-grid" style={{ marginTop: ".5rem" }}>
          <div>
            <label className="ce-label">Alignment</label>
            <select className="ce-select ce-form-input" value={imgAlign} onChange={e => setImgAlign(e.target.value)}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className="ce-label">Width <span className="ce-hint">(e.g. 120px, 60%)</span></label>
            <input type="text" className="ce-input ce-form-input" value={imgWidth} onChange={e => setImgWidth(e.target.value)} placeholder="100%" />
          </div>
        </div>
      </>)}
      <div style={{ marginTop: ".85rem" }}>
        <label className="ce-label">Row Span <span className="ce-hint">(1 = normal · 2+ = merge rows below)</span></label>
        <input type="number" className="ce-input ce-form-input" min={1} max={50} value={rowspan} onChange={e => setRowspan(parseInt(e.target.value) || 1)} style={{ maxWidth: 90 }} />
      </div>
    </Modal>
  );
}

// ── Instruction Table: Cell Preview ──────────────────────────────────────────
function CellPreview({ cell }) {
  if (!cell || (cell.type === "text" && !cell.value)) return <span className="ce-instr-cell-empty">—</span>;
  if (cell.type === "image") return <span className="ce-instr-cell-img-badge">🖼 {cell.imgAlign || "left"} · {cell.imgWidth || "auto"}</span>;
  if (cell.type === "url") return <span className="ce-instr-cell-url-badge">{cell.label || cell.url || "URL"}</span>;
  const rs = (cell.rowspan || 1) > 1 ? ` ↕${cell.rowspan}` : "";
  return <span className="ce-instr-cell-text-preview">{cell.value}{rs}</span>;
}

// ── Instruction Table: Table Block Editor ─────────────────────────────────────
function TableBlockEditor({ block, onUpdate }) {
  const columns = block.columns || [];
  const rows = block.rows || [];
  const [colModal, setColModal] = useState(null);
  const [cellModal, setCellModal] = useState(null);
  const leafCols = getLeafColumns(columns);
  const hasGroups = columns.some(c => c.isGroup);

  function addRow() {
    const nr = { cells: {} }; leafCols.forEach(c => { nr.cells[c.id] = { type: "text", value: "" }; });
    onUpdate({ ...block, rows: [...rows, nr] });
  }
  function removeRow(ri) { onUpdate({ ...block, rows: rows.filter((_, i) => i !== ri) }); }

  function handleColConfirm(col, idx) {
    const oldLeafIds = (idx !== null && idx !== undefined) ? getLeafColumns([columns[idx]]).map(c => c.id) : [];
    const newLeafIds = getLeafColumns([col]).map(c => c.id);
    let newCols = [...columns];
    if (idx !== null && idx !== undefined) newCols[idx] = col;
    else newCols = [...columns, col];
    const added = newLeafIds.filter(id => !oldLeafIds.includes(id));
    const removed = oldLeafIds.filter(id => !newLeafIds.includes(id));
    let newRows = rows;
    if (added.length || removed.length) {
      newRows = rows.map(row => {
        const cells = { ...row.cells };
        added.forEach(id => { if (!cells[id]) cells[id] = { type: "text", value: "" }; });
        removed.forEach(id => delete cells[id]);
        return { ...row, cells };
      });
    }
    // Single onUpdate call — avoids stale-closure overwrite bug
    onUpdate({ ...block, columns: newCols, rows: newRows });
    setColModal(null);
  }

  function removeColumn(idx) {
    const leafIds = getLeafColumns([columns[idx]]).map(c => c.id);
    const newCols = columns.filter((_, i) => i !== idx);
    const newRows = rows.map(row => { const cells = { ...row.cells }; leafIds.forEach(id => delete cells[id]); return { ...row, cells }; });
    onUpdate({ ...block, columns: newCols, rows: newRows });
  }

  function handleCellConfirm(cell) {
    const { rowIdx, colId } = cellModal;
    const newRows = JSON.parse(JSON.stringify(rows));
    if (!newRows[rowIdx].cells) newRows[rowIdx].cells = {};
    newRows[rowIdx].cells[colId] = cell;
    onUpdate({ ...block, rows: newRows }); setCellModal(null);
  }

  return (
    <div>
      <div className="ce-section-editor-header">
        <strong>Columns</strong>
        <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setColModal({ editCol: null, editIdx: null })}>+ Add Column</button>
      </div>
      {columns.length === 0 && <p className="ce-hint" style={{ marginTop: ".4rem" }}>No columns — add at least one.</p>}
      {columns.map((col, i) => (
        <div key={i} className="ce-col-row">
          <span style={{ background: col.bgColor || "#fff", color: col.textColor || "#000", padding: "2px 10px", borderRadius: 4, fontSize: ".78rem", fontWeight: 600, border: "1px solid rgba(0,0,0,.15)" }}>
            {col.label}{col.isGroup ? <em style={{ fontSize: ".7rem", opacity: .65 }}> ({col.children?.length || 0} sub-cols)</em> : ""}
          </span>
          <div className="ce-col-info"><span className="ce-col-id">[{col.id}]</span>{col.width && <span className="ce-hint">w:{col.width}</span>}</div>
          <button className="ce-icon-btn" onClick={() => setColModal({ editCol: col, editIdx: i })}>✏</button>
          <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => removeColumn(i)}>✕</button>
        </div>
      ))}

      {leafCols.length > 0 && (<>
        <div className="ce-section-editor-header" style={{ marginTop: "1rem" }}>
          <strong>Rows ({rows.length})</strong>
          <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={addRow}>+ Add Row</button>
        </div>
        {rows.length === 0 && <p className="ce-hint">No rows yet.</p>}
        {rows.length > 0 && (
          <div className="ce-instr-editor-wrap">
            <table className="ce-instr-editor-table">
              <thead>
                {hasGroups && (
                  <tr>
                    <th className="ce-instr-editor-rownum-th" rowSpan={2}>#</th>
                    {columns.map(col => col.isGroup
                      ? <th key={col.id} colSpan={getLeafColumns([col]).length} style={{ background: col.bgColor || "#fff", color: col.textColor || "#000" }}>{col.label}</th>
                      : <th key={col.id} rowSpan={2} style={{ background: col.bgColor || "#fff", color: col.textColor || "#000", ...(col.width ? { width: col.width } : {}) }}>{col.label}</th>
                    )}
                    <th rowSpan={2} style={{ width: 36 }}></th>
                  </tr>
                )}
                <tr>
                  {!hasGroups && <th className="ce-instr-editor-rownum-th">#</th>}
                  {(hasGroups
                    ? columns.flatMap(col => col.isGroup ? getLeafColumns([col]) : [])
                    : leafCols
                  ).map(col => (
                    <th key={col.id} style={{ background: col.bgColor || "#F5E200", color: col.textColor || "#000", ...(col.width ? { width: col.width } : {}) }}>{col.label}</th>
                  ))}
                  {!hasGroups && <th style={{ width: 36 }}></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="ce-instr-editor-rownum">{ri + 1}</td>
                    {leafCols.map(col => {
                      const cell = row.cells?.[col.id];
                      return (
                        <td key={col.id} className="ce-instr-editor-cell" onClick={() => setCellModal({ rowIdx: ri, colId: col.id, colLabel: col.label, cell })}>
                          <CellPreview cell={cell} /><span className="ce-instr-edit-hint">click to edit</span>
                        </td>
                      );
                    })}
                    <td><button className="ce-icon-btn ce-icon-btn-danger" onClick={() => removeRow(ri)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>)}
      {colModal && <InstrColModal editCol={colModal.editCol} editIdx={colModal.editIdx} onClose={() => setColModal(null)} onConfirm={handleColConfirm} />}
      {cellModal && <InstrCellModal cell={cellModal.cell} colLabel={cellModal.colLabel} onClose={() => setCellModal(null)} onConfirm={handleCellConfirm} />}
    </div>
  );
}

// ── Instruction Table: Blocks Editor ─────────────────────────────────────────
function InstructionBlocksEditor({ blocks, onBlocksChange }) {
  function addParagraph() { onBlocksChange([...blocks, { blockType: "paragraph", id: `p_${Date.now()}`, content: "" }]); }
  function addTable() { onBlocksChange([...blocks, { blockType: "table", id: `t_${Date.now()}`, columns: [], rows: [] }]); }
  function removeBlock(id) { onBlocksChange(blocks.filter(b => b.id !== id)); }
  function updateBlock(id, updated) { onBlocksChange(blocks.map(b => b.id === id ? updated : b)); }
  function moveBlock(id, dir) {
    const idx = blocks.findIndex(b => b.id === id);
    if ((dir < 0 && idx === 0) || (dir > 0 && idx === blocks.length - 1)) return;
    const next = [...blocks];[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]; onBlocksChange(next);
  }
  return (
    <div>
      {blocks.length === 0 && <p className="ce-hint" style={{ marginTop: ".5rem" }}>No blocks yet — add a paragraph or table below.</p>}
      {blocks.map((block, i) => (
        <div key={block.id} className="ce-instr-block-wrap">
          <div className="ce-instr-block-bar">
            <span className="ce-type-badge">{block.blockType === "paragraph" ? "¶ Paragraph" : "⊞ Table"}</span>
            <div className="ce-instr-block-actions">
              <button className="ce-icon-btn" onClick={() => moveBlock(block.id, -1)} disabled={i === 0} title="Move up">↑</button>
              <button className="ce-icon-btn" onClick={() => moveBlock(block.id, 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
              <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => removeBlock(block.id)} title="Delete">✕</button>
            </div>
          </div>
          {block.blockType === "paragraph" && (
            <div style={{ padding: ".35rem 0 .5rem" }}>
              <textarea className="ce-input ce-form-input" rows={3} style={{ resize: "vertical" }}
                value={block.content || ""}
                onChange={e => updateBlock(block.id, { ...block, content: e.target.value })}
                placeholder="Enter paragraph text…" />
            </div>
          )}
          {block.blockType === "table" && (
            <div style={{ paddingTop: ".5rem" }}>
              <TableBlockEditor block={block} onUpdate={updated => updateBlock(block.id, updated)} />
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
        <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={addParagraph}>+ Add Paragraph</button>
        <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={addTable}>+ Add Table</button>
      </div>
    </div>
  );
}

// ── Section Modal ─────────────────────────────────────────────────────────────
function SectionModal({ calcId, calcOrder, editSec, allCalcs, allMasters, currentSections, onClose, onSaved, axios }) {
  const [name, setName] = useState(editSec?.name || "");
  const [order, setOrder] = useState(editSec?.order_num ?? currentSections.length + 1);
  const [hidden, setHidden] = useState(editSec?.config?.hidden || false);
  const [type, setType] = useState(editSec?.config?.type || "input_table");
  const [canAddRows, setCanAddRows] = useState(editSec?.config?.can_add_rows !== false);
  const [columns, setColumns] = useState(JSON.parse(JSON.stringify(editSec?.config?.columns || [])));
  const [summaries, setSummaries] = useState(JSON.parse(JSON.stringify(editSec?.config?.summaries || [])));
  const [formulas, setFormulas] = useState(JSON.parse(JSON.stringify(editSec?.config?.formulas || [])));
  const [refCalcId, setRefCalcId] = useState(editSec?.config?.ref_calc_id || "");
  const [refSecOrder, setRefSecOrder] = useState(editSec?.config?.ref_section_order || 1);
  const [refDesc, setRefDesc] = useState(editSec?.config?.description || "");
  const [columnGroups, setColumnGroups] = useState(JSON.parse(JSON.stringify(editSec?.config?.column_groups || [])));
  const [colModal, setColModal] = useState(null);
  const [sumModal, setSumModal] = useState(null);
  const [fmlModal, setFmlModal] = useState(null);
  const [grpModal, setGrpModal] = useState(null);
  const [instrBlocks, setInstrBlocks] = useState(() => {
    const cfg = editSec?.config;
    if (!cfg || cfg.type !== "instruction_table") return [];
    if (cfg.blocks) return JSON.parse(JSON.stringify(cfg.blocks));
    // migrate old format (columns/rows) → single table block
    if (cfg.columns?.length || cfg.rows?.length) {
      const tbl = { blockType: "table", id: `t_${Date.now()}`, columns: cfg.columns || [], rows: cfg.rows || [] };
      if (cfg.group_header) tbl.group_header = cfg.group_header;
      return [tbl];
    }
    return [];
  });

  async function handleSave() {
    if (!name.trim()) { alert("Name required"); return; }
    let config = { type };
    if (hidden) config.hidden = true;
    if (type === "input_table") { config.can_add_rows = canAddRows; config.columns = columns; config.summaries = summaries; if (columnGroups.length) config.column_groups = columnGroups; }
    else if (type === "formula_display") { config.formulas = formulas; }
    else if (type === "calc_ref") { config.ref_calc_id = refCalcId; config.ref_section_order = parseInt(refSecOrder) || 1; config.description = refDesc; }
    else if (type === "instruction_table") { config.blocks = instrBlocks; }
    try { await axios.post(`${API_BASE}/admin/sections`, { id: editSec?._id || editSec?.id || undefined, calc_id: calcId, name: name.trim(), order_num: parseInt(order) || 0, config }); onSaved(); onClose(); }
    catch (e) { alert("Save failed: " + e.message); }
  }

  return (
    <Modal title={editSec ? "Edit Section" : "Add Section"} onClose={onClose} large
      footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleSave}>Save Section</button></>}>
      <div className="ce-form-grid">
        <div><label className="ce-label">Section Name *</label><input type="text" className="ce-input ce-form-input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="ce-label">Order</label><input type="number" className="ce-input ce-form-input" style={{ maxWidth: 100 }} value={order} onChange={e => setOrder(e.target.value)} /></div>
      </div>
      <label className="ce-label ce-check-label"><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> Hide this section</label>
      <label className="ce-label">Section Type *</label>
      <select className="ce-select ce-form-input" value={type} onChange={e => setType(e.target.value)}>
        <option value="input_table">Input Table</option>
        <option value="formula_display">Formula Display</option>
        <option value="calc_ref">Calculation Reference</option>
        <option value="instruction_table">Instruction Table</option>
      </select>

      {type === "input_table" && (
        <div>
          <div className="ce-section-editor-header">
            <strong>Columns</strong>
            <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setColModal({ editCol: null, editIdx: null })}>+ Add Column</button>
            <label className="ce-label ce-check-label" style={{ margin: 0 }}><input type="checkbox" checked={canAddRows} onChange={e => setCanAddRows(e.target.checked)} /> Users can add rows</label>
          </div>
          {columns.map((col, i) => (
            <div key={i} className="ce-col-row">
              <span className="ce-type-badge">{col.type}</span>
              <div className="ce-col-info"><strong>{col.label}</strong> <span className="ce-col-id">[{col.id}]</span><VisibilityBadge item={col} /></div>
              <button className="ce-icon-btn" onClick={() => { const c = { ...col }; c.hidden = !c.hidden; setColumns(cs => { const n = [...cs]; n[i] = c; return n; }) }}>{isHidden(col) ? "👁" : "🙈"}</button>
              <button className="ce-icon-btn" onClick={() => setColModal({ editCol: col, editIdx: i })}>✏</button>
              <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => setColumns(cs => cs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div className="ce-section-editor-header" style={{ marginTop: "1rem" }}>
            <strong>Summaries</strong>
            <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setSumModal({ editSummary: null, editIdx: null })}>+ Add Summary</button>
          </div>
          {summaries.map((s, i) => (
            <div key={i} className="ce-col-row">
              <span className="ce-type-badge">SUM</span>
              <div className="ce-col-info"><strong>{s.label}</strong> <span className="ce-col-id">[{s.id}]</span> <span>{s.formula}</span></div>
              <button className="ce-icon-btn" onClick={() => setSumModal({ editSummary: s, editIdx: i })}>✏</button>
              <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => setSummaries(a => a.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div className="ce-section-editor-header" style={{ marginTop: "1rem" }}>
            <strong>Merged Header Groups</strong>
            <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setGrpModal({ editGroup: null, editIdx: null })}>+ Add Group</button>
          </div>
          <p className="ce-hint" style={{ marginBottom: ".4rem" }}>Group columns under a single merged header cell (colspan). Leave empty for no merged headers.</p>
          {columnGroups.length === 0 && <p className="ce-hint">No groups — table will show a single header row.</p>}
          {columnGroups.map((g, i) => (
            <div key={i} className="ce-col-row">
              <span style={{ background: g.bgColor || "#dbeafe", color: g.textColor || "#1e40af", padding: "2px 10px", borderRadius: 4, fontSize: ".78rem", fontWeight: 600, border: "1px solid rgba(0,0,0,.12)" }}>{g.label}</span>
              <div className="ce-col-info"><span className="ce-hint">Spans: {g.column_ids.join(", ")}</span></div>
              <button className="ce-icon-btn" onClick={() => setGrpModal({ editGroup: g, editIdx: i })}>✏</button>
              <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => setColumnGroups(gs => gs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
      )}

      {type === "formula_display" && (
        <div>
          <div className="ce-section-editor-header" style={{ marginTop: "1rem" }}>
            <strong>Formulas</strong>
            <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setFmlModal({ editFormula: null, editIdx: null })}>+ Add Formula</button>
          </div>
          {formulas.map((f, i) => (
            <div key={i} className="ce-col-row">
              <span className="ce-type-badge">expr</span>
              <div className="ce-col-info"><strong>{f.label}</strong> <span className="ce-col-id">[{f.id}]</span> <span>{f.expr}</span></div>
              <button className="ce-icon-btn" onClick={() => setFmlModal({ editFormula: f, editIdx: i })}>✏</button>
              <button className="ce-icon-btn ce-icon-btn-danger" onClick={() => setFormulas(a => a.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <p className="ce-hint">
            <code>SEC(n).id</code> – same-calc section · <code>CAL(c).SEC(n).id</code> – cross-calc · <code>CAL(c).SEC(n).SUM(col)</code> – aggregate
          </p>
        </div>
      )}

      {type === "calc_ref" && (
        <div>
          <label className="ce-label">Reference Calculation</label>
          <select className="ce-select ce-form-input" value={refCalcId} onChange={e => setRefCalcId(e.target.value)}>
            <option value="">-- Select --</option>
            {allCalcs.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
          </select>
          <label className="ce-label">Reference Section Order</label>
          <input type="number" className="ce-input ce-form-input" style={{ maxWidth: 100 }} value={refSecOrder} min={1} onChange={e => setRefSecOrder(e.target.value)} />
          <label className="ce-label">Description</label>
          <input type="text" className="ce-input ce-form-input" value={refDesc} onChange={e => setRefDesc(e.target.value)} />
        </div>
      )}

      {type === "instruction_table" && (
        <InstructionBlocksEditor blocks={instrBlocks} onBlocksChange={setInstrBlocks} />
      )}

      {colModal && <ColumnModal editCol={colModal.editCol} editIdx={colModal.editIdx} allMasters={allMasters} allCalcs={allCalcs} editorColumns={columns} currentCalcId={calcId} currentCalcOrder={calcOrder} onClose={() => setColModal(null)} onConfirm={(col, idx) => { if (idx !== null && idx !== undefined) setColumns(cs => { const n = [...cs]; n[idx] = col; return n; }); else setColumns(cs => [...cs, col]); setColModal(null); }} />}
      {sumModal && <SummaryModal editSummary={sumModal.editSummary} editIdx={sumModal.editIdx} currentCalcId={calcId} currentCalcOrder={calcOrder} allCalcs={allCalcs} onClose={() => setSumModal(null)} onConfirm={(s, idx) => { if (idx !== null && idx !== undefined) setSummaries(a => { const n = [...a]; n[idx] = s; return n; }); else setSummaries(a => [...a, s]); setSumModal(null); }} />}
      {fmlModal && <FormulaModal editFormula={fmlModal.editFormula} editIdx={fmlModal.editIdx} currentCalcId={calcId} currentCalcOrder={calcOrder} allCalcs={allCalcs} onClose={() => setFmlModal(null)} onConfirm={(f, idx) => { if (idx !== null && idx !== undefined) setFormulas(a => { const n = [...a]; n[idx] = f; return n; }); else setFormulas(a => [...a, f]); setFmlModal(null); }} />}
      {grpModal && <GroupModal editGroup={grpModal.editGroup} editIdx={grpModal.editIdx} columns={columns} onClose={() => setGrpModal(null)} onConfirm={(g, idx) => { if (idx !== null && idx !== undefined) setColumnGroups(gs => { const n = [...gs]; n[idx] = g; return n; }); else setColumnGroups(gs => [...gs, g]); setGrpModal(null); }} />}
    </Modal>
  );
}

// ── Builder Panel ─────────────────────────────────────────────────────────────
function BuilderPanel({ calcId, calcName, allCalcs, allMasters, onBack, axios }) {
  const [sections, setSections] = useState([]);
  const [secModal, setSecModal] = useState(null);
  const [dragSrcId, setDragSrcId] = useState(null);
  // Derive the order_num of the current calc for use in the CrossRefPicker
  const currentCalcOrder = allCalcs.find(c => (c._id || c.id) === calcId)?.order_num ?? 1;

  async function loadSections() {
    try { const r = await axios.get(`${API_BASE}/calculations/${calcId}`); setSections((r.data.data.sections || []).sort((a, b) => a.order_num - b.order_num)); }
    catch (e) { alert("Failed: " + e.message); }
  }
  useEffect(() => { loadSections(); }, [calcId]);

  async function toggleVis(sec) {
    const config = { ...(sec.config || {}), hidden: !isHidden(sec.config || {}) };
    try { await axios.post(`${API_BASE}/admin/sections`, { id: sec._id || sec.id, calc_id: calcId, name: sec.name, order_num: sec.order_num, config }); loadSections(); }
    catch (e) { alert("Failed: " + e.message); }
  }
  async function delSec(id) {
    if (!window.confirm("Delete this section?")) return;
    try { await axios.delete(`${API_BASE}/admin/sections/${id}`); loadSections(); }
    catch (e) { alert("Failed: " + e.message); }
  }
  function handleDrop(targetId) {
    if (!dragSrcId || dragSrcId === targetId) return;
    const srcI = sections.findIndex(s => (s._id || s.id) === dragSrcId);
    const tgtI = sections.findIndex(s => (s._id || s.id) === targetId);
    if (srcI < 0 || tgtI < 0) return;
    const next = [...sections]; const [moved] = next.splice(srcI, 1); next.splice(tgtI, 0, moved);
    next.forEach((s, i) => s.order_num = i + 1); setSections(next);
    axios.put(`${API_BASE}/admin/sections/reorder`, { orders: next.map(s => ({ id: s._id || s.id, order_num: s.order_num })) }).catch(console.error);
  }

  return (
    <div>
      <div className="ce-builder-header">
        <div>
          <button className="ce-btn ce-btn-text" onClick={onBack}>← Back</button>
          <h2 className="ce-builder-title">{calcName}</h2>
        </div>
        <button className="ce-btn ce-btn-primary" onClick={() => setSecModal({ editSec: null })}>+ Add Section</button>
      </div>
      <div className="ce-section-list">
        {sections.length === 0 && <div className="ce-empty">No sections yet.</div>}
        {sections.map(sec => {
          const sid = sec._id || sec.id;
          return (
            <div key={sid} className="ce-sec-card" draggable onDragStart={() => setDragSrcId(sid)} onDragEnd={() => setDragSrcId(null)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(sid)}>
              <div className="ce-sec-header" onClick={e => { if (e.target.closest(".ce-sec-actions")) return; document.getElementById("sb_" + sid)?.classList.toggle("open"); }}>
                <span className="ce-drag-handle">⠿</span>
                <span className="ce-order-badge">§{sec.order_num}</span>
                <span className="ce-sec-title">{sec.name}</span>
                <span className="ce-type-badge">{sec.config?.type || "?"}</span>
                <VisibilityBadge item={sec.config || {}} />
                <div className="ce-sec-actions">
                  <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => toggleVis(sec)}>{isHidden(sec.config) ? "Unhide" : "Hide"}</button>
                  <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setSecModal({ editSec: sec })}>✏ Edit</button>
                  <button className="ce-btn ce-btn-danger ce-btn-sm" onClick={() => delSec(sid)}>✕</button>
                </div>
              </div>
              <div className="ce-sec-body" id={"sb_" + sid}>
                {sec.config?.type === "input_table" && (sec.config.columns || []).map((c, i) => <div key={i} className="ce-col-row"><span className="ce-type-badge">{c.type}</span><strong>{c.label}</strong><span className="ce-col-id">[{c.id}]</span></div>)}
                {sec.config?.type === "formula_display" && (sec.config.formulas || []).map((f, i) => <div key={i} className="ce-col-row"><span className="ce-type-badge">expr</span><strong>{f.label}</strong><span className="ce-col-id">{f.expr}</span></div>)}
                {sec.config?.type === "calc_ref" && <div className="ce-alert-info">References Calc {sec.config.ref_calc_id}, Section {sec.config.ref_section_order}</div>}
                {sec.config?.type === "instruction_table" && <div className="ce-alert-info">Instruction Table — {(sec.config.blocks || []).length} block(s) · {(sec.config.blocks || []).filter(b => b.blockType === "paragraph").length} paragraph(s) · {(sec.config.blocks || []).filter(b => b.blockType === "table").length} table(s)</div>}
              </div>
            </div>
          );
        })}
      </div>
      {secModal && <SectionModal calcId={calcId} calcOrder={currentCalcOrder} editSec={secModal.editSec} allCalcs={allCalcs} allMasters={allMasters} currentSections={sections} onClose={() => setSecModal(null)} onSaved={loadSections} axios={axios} />}
    </div>
  );
}

// ── Main CalcAdmin ────────────────────────────────────────────────────────────
export default function CalcAdmin() {
  const axios = useAxiosSecure();
  const [tab, setTab] = useState("calculations");
  const [calcs, setCalcs] = useState([]);
  const [masters, setMasters] = useState([]);
  const [builder, setBuilder] = useState(null);
  const [calcModal, setCalcModal] = useState(null);
  const [masterModal, setMasterModal] = useState(null);
  const [selectedCalc, setSelectedCalc] = useState(null); // calc to view in engine

  async function loadCalcs() { try { const r = await axios.get(`${API_BASE}/calculations`); setCalcs(r.data.data || []); } catch (e) { console.error(e); } }
  async function loadMasters() { try { const r = await axios.get(`${API_BASE}/dropdown-masters`); setMasters(r.data.data || []); } catch (e) { console.error(e); } }
  useEffect(() => { loadCalcs(); loadMasters(); }, []);

  async function handleSaveCalc(vals) {
    try { await axios.post(`${API_BASE}/admin/calculations`, vals); setCalcModal(null); loadCalcs(); }
    catch (e) { alert("Save failed: " + e.message); }
  }
  async function handleDeleteCalc(id) {
    if (!window.confirm("Delete?")) return;
    await axios.delete(`${API_BASE}/admin/calculations/${id}`);
    if (builder?.id === id) setBuilder(null);
    if (selectedCalc === id) setSelectedCalc(null);
    loadCalcs();
  }
  async function handleExport(id) {
    try { const r = await axios.get(`${API_BASE}/admin/export-module/${id}`); const m = r.data.data; const blob = new Blob([JSON.stringify(m, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `module_${(m.calculation?.name || id).replace(/[^\w-]+/g, "_")}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    catch (e) { alert("Export failed: " + e.message); }
  }
  async function handleExportAll() {
    try { const r = await axios.get(`${API_BASE}/admin/export-all`); const d = r.data.data; const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "all-modules.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    catch (e) { alert("Export failed: " + e.message); }
  }
  async function handleSeed() {
    if (!window.confirm("Seed sample data?")) return;
    try { const r = await axios.post(`${API_BASE}/admin/seed`, {}); alert(r.data.data.message || "Done"); loadCalcs(); loadMasters(); }
    catch (e) { alert("Seed failed: " + e.message); }
  }

  function handleImport(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try { const p = JSON.parse(ev.target.result); if (p.schema !== "calc-engine-module") throw new Error("Not a module file"); if (!window.confirm(`Import "${p.calculation?.name || "?"}"?`)) return; const r = await axios.post(`${API_BASE}/admin/import-module`, p); alert(`Imported as "${r.data.data.name}"`); loadCalcs(); }
      catch (err) { alert("Import failed: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  }
  function handleImportAll(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try { const p = JSON.parse(ev.target.result); if (p.schema !== "calc-engine-multi-module") throw new Error("Not a multi-module file"); if (!window.confirm(`Import ${p.modules?.length || 0} module(s)?`)) return; const r = await axios.post(`${API_BASE}/admin/import-all`, p); alert(`Imported ${r.data.data.imported?.length || 0} calculation(s)`); loadCalcs(); }
      catch (err) { alert("Import failed: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  }
  async function handleExportDropdowns() {
    try { const r = await axios.get(`${API_BASE}/admin/export-dropdowns`); const d = r.data.data; const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-"); const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `all-dropdowns_${ts}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
    catch (e) { alert("Download failed: " + e.message); }
  }
  function handleImportDropdowns(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const p = JSON.parse(ev.target.result);
        if (p.schema !== "calc-engine-dropdowns") throw new Error("Not a dropdowns export file");
        if (!window.confirm(`Import ${p.dropdowns?.length || 0} dropdown list(s)?\n\nExisting lists with matching names will be overwritten.`)) return;
        const r = await axios.post(`${API_BASE}/admin/import-dropdowns`, p);
        const { created = [], updated = [] } = r.data.data;
        alert(`Done.\nCreated: ${created.length} list(s)\nUpdated: ${updated.length} list(s)`);
        loadMasters();
      } catch (err) { alert("Import failed: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  // ── View calc engine mode ──
  if (selectedCalc) {
    return (
      <div>
        <button className="ce-btn ce-btn-text" style={{ marginBottom: "1rem" }} onClick={() => setSelectedCalc(null)}>← Back to Admin</button>
        <CalcEngine calcId={selectedCalc} />
      </div>
    );
  }

  if (builder) {
    return <BuilderPanel calcId={builder.id} calcName={builder.name} allCalcs={calcs} allMasters={masters} onBack={() => setBuilder(null)} axios={axios} />;
  }

  return (
    <div className="ce-admin-root">
      {/* Tab nav */}
      <div className="ce-tab-nav">
        {[["calculations", "📊 Calculations"], ["dropdowns", "📋 Dropdowns"], ["settings", "⚙ Settings"]].map(([t, l]) => (
          <button key={t} className={`ce-tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── Calculations Tab ── */}
      {tab === "calculations" && (
        <div>
          <div className="ce-tab-header">
            <h2 className="ce-tab-title">Calculations</h2>
            <div className="ce-header-actions">
              <button className="ce-btn ce-btn-outline" onClick={handleExportAll}>📦 Download All</button>
              <label className="ce-btn ce-btn-outline" style={{ cursor: "pointer" }}>📥 Import All<input type="file" accept=".json" style={{ display: "none" }} onChange={handleImportAll} /></label>
              <label className="ce-btn ce-btn-outline" style={{ cursor: "pointer" }}>📥 Import Module<input type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} /></label>
              <button className="ce-btn ce-btn-primary" onClick={() => setCalcModal({ edit: null })}>+ New Calculation</button>
            </div>
          </div>
          {calcs.length === 0 ? (
            <div className="ce-empty">No calculations yet. <button className="ce-btn ce-btn-outline ce-btn-sm" style={{ marginLeft: ".5rem" }} onClick={handleSeed}>Seed Sample Data</button></div>
          ) : (
            <div className="ce-calc-list">
              {calcs.map(c => (
                <div key={c._id || c.id} className="ce-calc-card">
                  <div><h3 className="ce-calc-card-title">{c.name}</h3>{c.description && <p className="ce-calc-card-desc">{c.description}</p>}</div>
                  <div className="ce-calc-actions">
                    <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setSelectedCalc(c._id || c.id)}>👁 View</button>
                    <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => setCalcModal({ edit: c })}>✏ Edit</button>
                    <button className="ce-btn ce-btn-outline ce-btn-sm" onClick={() => handleExport(c._id || c.id)}>📦 Export</button>
                    <button className="ce-btn ce-btn-primary ce-btn-sm" onClick={() => setBuilder({ id: c._id || c.id, name: c.name })}>🔧 Build</button>
                    <button className="ce-btn ce-btn-danger ce-btn-sm" onClick={() => handleDeleteCalc(c._id || c.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dropdowns Tab ── */}
      {tab === "dropdowns" && (
        <div>
          <div className="ce-tab-header">
            <h2 className="ce-tab-title">Dropdown Lists</h2>
            <div className="ce-header-actions">
              <button className="ce-btn ce-btn-outline" onClick={handleExportDropdowns}>📦 Download All</button>
              <label className="ce-btn ce-btn-outline" style={{ cursor: "pointer" }}>📥 Import All<input type="file" accept=".json" style={{ display: "none" }} onChange={handleImportDropdowns} /></label>
              <button className="ce-btn ce-btn-primary" onClick={() => setMasterModal({ edit: null })}>+ New List</button>
            </div>
          </div>
          <div className="ce-master-list">
            {masters.length === 0 && <div className="ce-empty">No dropdown lists yet.</div>}
            {masters.map(m => <MasterCard key={m._id || m.id} master={m} onRefresh={loadMasters} axios={axios} />)}
          </div>
        </div>
      )}

      {/* ── Settings Tab ── */}
      {tab === "settings" && (
        <div>
          <div className="ce-tab-header"><h2 className="ce-tab-title">Settings</h2></div>
          <div className="ce-settings-card">
            <h3>Data Management</h3>
            <p style={{ color: "#64748b", marginBottom: "1rem", fontSize: ".85rem" }}>Seed the database with sample calculations (Calculation A & B).</p>
            <button className="ce-btn ce-btn-outline" onClick={handleSeed}>Seed Sample Data</button>
          </div>
        </div>
      )}

      {/* ── New/Edit Calc Modal ── */}
      {calcModal && <CalcEditModal edit={calcModal.edit} count={calcs.length} onClose={() => setCalcModal(null)} onSave={handleSaveCalc} />}

      {/* ── New Master Modal ── */}
      {masterModal !== null && (
        <NewMasterModal onClose={() => setMasterModal(null)} onSaved={loadMasters} axios={axios} />
      )}
    </div>
  );
}

function CalcEditModal({ edit, count, onClose, onSave }) {
  const [name, setName] = useState(edit?.name || "");
  const [desc, setDesc] = useState(edit?.description || "");
  const [order, setOrder] = useState(edit?.order_num ?? count + 1);
  return (<Modal title={edit ? "Edit Calculation" : "New Calculation"} onClose={onClose}
    footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={() => { if (!name.trim()) { alert("Name required"); return; } onSave({ id: edit?._id || edit?.id || undefined, name: name.trim(), description: desc, order_num: parseInt(order) || 0 }); }}>Save</button></>}>
    <label className="ce-label">Name *</label>
    <input type="text" className="ce-input ce-form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Calculation C" />
    <label className="ce-label">Description</label>
    <textarea className="ce-input ce-form-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
    <label className="ce-label">Order</label>
    <input type="number" className="ce-input ce-form-input" style={{ maxWidth: 100 }} value={order} onChange={e => setOrder(e.target.value)} />
  </Modal>);
}

function NewMasterModal({ onClose, onSaved, axios }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  async function handleSave() {
    if (!name.trim()) { alert("Name required"); return; }
    try { await axios.post(`${API_BASE}/admin/dropdown-masters`, { name: name.trim(), description: desc }); onSaved(); onClose(); }
    catch (e) { alert("Save failed: " + e.message); }
  }
  return (<Modal title="New Dropdown List" onClose={onClose}
    footer={<><button className="ce-btn ce-btn-secondary" onClick={onClose}>Cancel</button><button className="ce-btn ce-btn-primary" onClick={handleSave}>Save</button></>}>
    <label className="ce-label">List Name *</label>
    <input type="text" className="ce-input ce-form-input" value={name} onChange={e => setName(e.target.value)} />
    <label className="ce-label">Description</label>
    <input type="text" className="ce-input ce-form-input" value={desc} onChange={e => setDesc(e.target.value)} />
  </Modal>);
}
