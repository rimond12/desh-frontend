import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────
const INPUT_TYPES = [
  { value: 'text',     label: '📝 Text' },
  { value: 'number',   label: '🔢 Number' },
  { value: 'date',     label: '📅 Date' },
  { value: 'dropdown', label: '📋 Dropdown' },
  { value: 'textarea', label: '📄 Textarea' },
];

const COLSPAN_OPTIONS = [
  { value: 1, label: 'Half Width (1/2)' },
  { value: 2, label: 'Full Width (2/2)' },
];

// ─── Utility ─────────────────────────────────────────────────────────────────
function uid() { return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ─── Sub-components ──────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: 'rgba(93,216,130,0.7)',
      fontFamily: 'Montserrat,sans-serif', marginBottom: 10,
    }}>{children}</div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1.5px solid rgba(255,255,255,0.1)',
          background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
          color: disabled ? '#64748b' : '#e2e8f0', fontSize: 13,
          fontFamily: 'Nunito,sans-serif', fontWeight: 600,
          outline: 'none', boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{
          width: 38, height: 20, borderRadius: 10, border: 'none',
          background: checked ? '#22A84B' : 'rgba(255,255,255,0.12)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{
          position: 'absolute', width: 14, height: 14, borderRadius: '50%',
          background: '#fff', top: 3, left: checked ? 21 : 3,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>{label}</span>
    </div>
  );
}

// ─── Field Card (in the editor panel) ────────────────────────────────────────
function FieldCard({ field, groupIdx, fieldIdx, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const [newSubFieldLabel, setNewSubFieldLabel] = useState('');
  const [optionInput, setOptionInput] = useState('');

  const update = (key, val) => onUpdate(groupIdx, fieldIdx, key, val);

  const addOption = () => {
    const opt = optionInput.trim();
    if (!opt) return;
    update('options', [...(field.options || []), opt]);
    setOptionInput('');
  };

  const removeOption = (i) => {
    const opts = [...(field.options || [])];
    opts.splice(i, 1);
    update('options', opts);
  };

  const addSubField = () => {
    const lbl = newSubFieldLabel.trim();
    if (!lbl) return;
    const sf = {
      fieldKey: uid(),
      label: lbl,
      placeholder: '',
      inputType: 'text',
      required: false,
      options: [],
      order: (field.subFields || []).length,
    };
    update('subFields', [...(field.subFields || []), sf]);
    setNewSubFieldLabel('');
  };

  const removeSubField = (si) => {
    const sfs = [...(field.subFields || [])];
    sfs.splice(si, 1);
    update('subFields', sfs);
  };

  const updateSubField = (si, key, val) => {
    const sfs = [...(field.subFields || [])];
    sfs[si] = { ...sfs[si], [key]: val };
    update('subFields', sfs);
  };

  const typeLabel = INPUT_TYPES.find(t => t.value === field.inputType)?.label || field.inputType;

  return (
    <div style={{
      border: '1.5px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(52,201,97,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', cursor: 'pointer',
        borderBottom: expanded ? '1px solid rgba(255,255,255,0.08)' : 'none',
      }} onClick={() => setExpanded(v => !v)}>

        {/* Drag handles (up/down) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}
            style={{
              width: 18, height: 16, border: 'none', borderRadius: 3, cursor: isFirst ? 'not-allowed' : 'pointer',
              background: isFirst ? 'rgba(255,255,255,0.04)' : 'rgba(52,201,97,0.15)',
              color: isFirst ? '#475569' : '#5DD882', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>▲</button>
          <button type="button" onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}
            style={{
              width: 18, height: 16, border: 'none', borderRadius: 3, cursor: isLast ? 'not-allowed' : 'pointer',
              background: isLast ? 'rgba(255,255,255,0.04)' : 'rgba(52,201,97,0.15)',
              color: isLast ? '#475569' : '#5DD882', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>▼</button>
        </div>

        {/* Type badge */}
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
          padding: '2px 8px', borderRadius: 99, flexShrink: 0,
          background: field.isCore ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
          color: field.isCore ? '#93c5fd' : '#c4b5fd',
          border: `1px solid ${field.isCore ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.3)'}`,
          fontFamily: 'Montserrat,sans-serif',
        }}>
          {field.isCore ? 'CORE' : 'CUSTOM'}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: 'Nunito,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {field.label || field.fieldKey}
          </div>
          <div style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'Montserrat,sans-serif', fontWeight: 600 }}>
            {typeLabel} · {field.colSpan === 2 ? 'Full width' : 'Half width'} · {field.required ? '✱ Required' : 'Optional'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={e => {
            e.stopPropagation();
            if (field.isCore && !window.confirm("WARNING: This is a system core field. Deleting it may prevent it from rendering in user forms and calculations. Are you sure you want to delete it?")) {
              return;
            }
            onDelete(groupIdx, fieldIdx);
          }}
            title="Delete field"
            style={{
              width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🗑</button>
          <span style={{ color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormInput label="Label" value={field.label} onChange={v => update('label', v)} placeholder="Field label" />
            <FormInput label="Placeholder" value={field.placeholder} onChange={v => update('placeholder', v)} placeholder="Input placeholder" />
            <FormInput
              label={field.isCore ? "Field Key (System Locked)" : "Field Key"}
              value={field.fieldKey}
              onChange={v => update('fieldKey', v)}
              disabled={field.isCore}
              placeholder="database_field_key"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: 12 }}>
            {/* Input type */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>
                Input Type
              </label>
              <select
                value={field.inputType}
                onChange={e => update('inputType', e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.07)',
                  color: '#e2e8f0', fontSize: 13,
                  fontFamily: 'Nunito,sans-serif', fontWeight: 600, cursor: 'pointer',
                }}>
                {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                {(field.inputType === 'gps') && <option value="gps">📍 GPS</option>}
              </select>
            </div>

            {/* ColSpan */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>Width</label>
              <select
                value={field.colSpan}
                onChange={e => update('colSpan', Number(e.target.value))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 13,
                  fontFamily: 'Nunito,sans-serif', fontWeight: 600, cursor: 'pointer',
                }}>
                {COLSPAN_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Required */}
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <Toggle label="Required" checked={field.required} onChange={v => update('required', v)} />
            </div>

            {/* Repeatable */}
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <Toggle label="Repeatable" checked={field.isRepeatable} onChange={v => update('isRepeatable', v)} />
            </div>
          </div>

          {/* Dropdown options */}
          {field.inputType === 'dropdown' && (
            <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <SectionLabel>Dropdown Options</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {(field.options || []).map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ flex: 1, fontSize: 12, color: '#cbd5e1', fontFamily: 'Nunito,sans-serif', background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 6 }}>
                      {opt}
                    </span>
                    <button type="button" onClick={() => removeOption(oi)} style={{ border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Add option…"
                  style={{
                    flex: 1, padding: '7px 10px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 12,
                    fontFamily: 'Nunito,sans-serif', outline: 'none',
                  }}
                />
                <button type="button" onClick={addOption} style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none',
                  background: 'rgba(52,201,97,0.2)', color: '#5DD882', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>+ Add</button>
              </div>
            </div>
          )}

          {/* Sub-fields */}
          <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <SectionLabel>Sub-fields / Extra Attributes</SectionLabel>
            {(field.subFields || []).map((sf, si) => (
              <div key={si} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <FormInput label="" value={sf.label} onChange={v => updateSubField(si, 'label', v)} placeholder="Sub-field label" />
                <FormInput label="" value={sf.placeholder} onChange={v => updateSubField(si, 'placeholder', v)} placeholder="Placeholder" />
                <button type="button" onClick={() => removeSubField(si)} style={{ border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 6, padding: '8px', cursor: 'pointer', marginTop: 0 }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                value={newSubFieldLabel}
                onChange={e => setNewSubFieldLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubField())}
                placeholder="Sub-field label…"
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 12,
                  fontFamily: 'Nunito,sans-serif', outline: 'none',
                }}
              />
              <button type="button" onClick={addSubField} style={{
                padding: '7px 14px', borderRadius: 7, border: 'none',
                background: 'rgba(52,201,97,0.2)', color: '#5DD882', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>+ Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Field Modal ──────────────────────────────────────────────────────────
function AddFieldModal({ onAdd, onClose, stepCount }) {
  const [label, setLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [inputType, setInputType] = useState('text');
  const [required, setRequired] = useState(false);
  const [colSpan, setColSpan] = useState(1);
  const [targetStep, setTargetStep] = useState(1);
  const [targetGroup, setTargetGroup] = useState(0);
  const [options, setOptions] = useState([]);
  const [optionInput, setOptionInput] = useState('');
  const [isRepeatable, setIsRepeatable] = useState(false);

  const addOption = () => {
    const opt = optionInput.trim();
    if (opt) { setOptions(prev => [...prev, opt]); setOptionInput(''); }
  };

  const handleAdd = () => {
    if (!label.trim()) { toast.error('Field label is required'); return; }
    onAdd({
      fieldKey: uid(),
      label: label.trim(),
      placeholder: placeholder.trim(),
      inputType,
      required,
      colSpan,
      isCore: false,
      isMapField: false,
      isAddressField: false,
      isRepeatable,
      order: 999,
      options: inputType === 'dropdown' ? options : [],
      subFields: [],
    }, targetStep, targetGroup);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #0A1F0F, #0E2818)',
        border: '1.5px solid rgba(52,201,97,0.25)', borderRadius: 18,
        width: 520, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        padding: 28,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg,#22A84B,#145C28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 4px 16px rgba(34,168,75,0.4)',
          }}>✚</div>
          <div>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 16, color: '#fff' }}>Add Custom Field</div>
            <div style={{ fontSize: 11, color: 'rgba(93,216,130,0.6)', fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>This field will appear in the user registration form</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormInput label="Field Label *" value={label} onChange={setLabel} placeholder="e.g. Plot Number" />
            <FormInput label="Placeholder" value={placeholder} onChange={setPlaceholder} placeholder="e.g. Enter plot number" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>Input Type</label>
              <select value={inputType} onChange={e => setInputType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 13, fontFamily: 'Nunito,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>Width</label>
              <select value={colSpan} onChange={e => setColSpan(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 13, fontFamily: 'Nunito,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                {COLSPAN_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <Toggle label="Required" checked={required} onChange={setRequired} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <Toggle label="Repeatable" checked={isRepeatable} onChange={setIsRepeatable} />
            </div>
          </div>

          {/* Step + group placement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>Add to Step</label>
              <select value={targetStep} onChange={e => setTargetStep(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 13, fontFamily: 'Nunito,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                {Array.from({ length: stepCount }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Step {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em' }}>Add to Group</label>
              <select value={targetGroup} onChange={e => setTargetGroup(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 13, fontFamily: 'Nunito,sans-serif', fontWeight: 600, cursor: 'pointer' }}>
                <option value={0}>Group 1 (Default)</option>
                <option value={1}>Group 2</option>
                <option value={2}>Group 3</option>
              </select>
            </div>
          </div>

          {/* Dropdown options */}
          {inputType === 'dropdown' && (
            <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <SectionLabel>Dropdown Options</SectionLabel>
              {options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, color: '#cbd5e1', fontFamily: 'Nunito,sans-serif', background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: 6 }}>{opt}</span>
                  <button type="button" onClick={() => setOptions(prev => prev.filter((_, i) => i !== oi))} style={{ border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={optionInput} onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Add option…"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 12, fontFamily: 'Nunito,sans-serif', outline: 'none' }}
                />
                <button type="button" onClick={addOption} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: 'rgba(52,201,97,0.2)', color: '#5DD882', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif' }}>
              Cancel
            </button>
            <button type="button" onClick={handleAdd} style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#22A84B,#145C28)',
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Montserrat,sans-serif',
              boxShadow: '0 4px 14px rgba(34,168,75,0.35)',
            }}>
              ✚ Add Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin FormBuilder Page ─────────────────────────────────────────────
export default function FormBuilder() {
  const axiosSecure = useAxiosSecure();
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    axiosSecure.get('/form-schema')
      .then(res => { setSchema(res.data.schema); setLoading(false); })
      .catch(() => { toast.error('Failed to load form schema'); setLoading(false); });
  }, [axiosSecure]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const addStep = useCallback((label, sub, icon) => {
    setSchema(prev => {
      const next = deepClone(prev);
      const nextStepNum = next.steps.length + 1;
      next.steps.push({
        stepNum: nextStepNum,
        label,
        icon,
        sub,
        groups: [
          { dividerLabel: null, order: 0, fields: [] }
        ]
      });
      setTimeout(() => {
        setActiveStep(next.steps.length - 1);
      }, 0);
      return next;
    });
    markChanged();
    toast.success('Step added successfully!');
  }, [markChanged]);

  const deleteStep = useCallback((stepIdx) => {
    setSchema(prev => {
      const next = deepClone(prev);
      if (next.steps.length <= 1) {
        toast.error('Cannot delete the last remaining step.');
        return prev;
      }
      const stepToDelete = next.steps[stepIdx];
      const hasCore = stepToDelete.groups.some(g => g.fields.some(f => f.isCore));
      if (hasCore) {
        toast.error('Cannot delete a step containing core fields.');
        return prev;
      }
      if (!window.confirm(`Are you sure you want to delete "${stepToDelete.label}"?`)) {
        return prev;
      }
      next.steps.splice(stepIdx, 1);
      next.steps.forEach((s, i) => {
        s.stepNum = i + 1;
      });
      setActiveStep(Math.max(0, stepIdx - 1));
      return next;
    });
    markChanged();
  }, [markChanged]);

  const moveStep = useCallback((stepIdx, dir) => {
    setSchema(prev => {
      const next = deepClone(prev);
      const targetIdx = stepIdx + dir;
      if (targetIdx < 0 || targetIdx >= next.steps.length) return prev;
      const temp = next.steps[stepIdx];
      next.steps[stepIdx] = next.steps[targetIdx];
      next.steps[targetIdx] = temp;
      next.steps.forEach((s, i) => {
        s.stepNum = i + 1;
      });
      setActiveStep(targetIdx);
      return next;
    });
    markChanged();
  }, [markChanged]);

  // ── Schema mutation helpers ──────────────────────────────────────────────
  const updateField = useCallback((stepIdx, groupIdx, fieldIdx, key, value) => {
    setSchema(prev => {
      const next = deepClone(prev);
      next.steps[stepIdx].groups[groupIdx].fields[fieldIdx][key] = value;
      return next;
    });
    markChanged();
  }, [markChanged]);

  const deleteField = useCallback((stepIdx, groupIdx, fieldIdx) => {
    setSchema(prev => {
      const next = deepClone(prev);
      next.steps[stepIdx].groups[groupIdx].fields.splice(fieldIdx, 1);
      return next;
    });
    markChanged();
  }, [markChanged]);

  const moveField = useCallback((stepIdx, groupIdx, fieldIdx, dir) => {
    setSchema(prev => {
      const next = deepClone(prev);
      const fields = next.steps[stepIdx].groups[groupIdx].fields;
      const target = fieldIdx + dir;
      if (target < 0 || target >= fields.length) return next;
      [fields[fieldIdx], fields[target]] = [fields[target], fields[fieldIdx]];
      return next;
    });
    markChanged();
  }, [markChanged]);

  const updateDivider = useCallback((stepIdx, groupIdx, value) => {
    setSchema(prev => {
      const next = deepClone(prev);
      next.steps[stepIdx].groups[groupIdx].dividerLabel = value || null;
      return next;
    });
    markChanged();
  }, [markChanged]);

  const updateStepMeta = useCallback((stepIdx, key, value) => {
    setSchema(prev => {
      const next = deepClone(prev);
      next.steps[stepIdx][key] = value;
      return next;
    });
    markChanged();
  }, [markChanged]);

  const addCustomField = useCallback((newField, stepNum, groupIdx) => {
    setSchema(prev => {
      const next = deepClone(prev);
      const stepIdx = next.steps.findIndex(s => s.stepNum === stepNum);
      if (stepIdx === -1) return next;
      // Ensure group exists
      while (next.steps[stepIdx].groups.length <= groupIdx) {
        next.steps[stepIdx].groups.push({ dividerLabel: null, order: next.steps[stepIdx].groups.length, fields: [] });
      }
      newField.order = next.steps[stepIdx].groups[groupIdx].fields.length;
      next.steps[stepIdx].groups[groupIdx].fields.push(newField);
      return next;
    });
    markChanged();
    toast.success('Custom field added!');
  }, [markChanged]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveSchema = async () => {
    setSaving(true);
    try {
      await axiosSecure.put('/form-schema', { steps: schema.steps });
      toast.success('Form schema saved successfully!');
      setHasChanges(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schema');
    } finally { setSaving(false); }
  };

  const resetSchema = async () => {
    setSaving(true);
    try {
      const res = await axiosSecure.post('/form-schema/reset');
      setSchema(res.data.schema);
      setHasChanges(false);
      setResetConfirm(false);
      toast.success('Schema reset to defaults!');
    } catch (err) {
      toast.error('Failed to reset schema');
    } finally { setSaving(false); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout isAdmin>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3.5px solid rgba(52,201,97,0.25)', borderTopColor: '#22A84B', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#64748b', fontWeight: 600, fontSize: 13, fontFamily: 'Nunito,sans-serif' }}>Loading form schema…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Layout>
    );
  }

  if (!schema) return <Layout isAdmin><div style={{ padding: 40, color: '#f87171', textAlign: 'center', fontFamily: 'Nunito,sans-serif' }}>Failed to load schema.</div></Layout>;

  const currentStep = schema.steps[activeStep];

  return (
    <Layout isAdmin>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fb-field-card { animation: fadeIn 0.25s ease; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: rgba(52,201,97,0.3); border-radius: 99px; }
        select option {
          background-color: #0f172a !important;
          color: #f1f5f9 !important;
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 40px' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #051A0A, #0A2D14)',
          borderBottom: '1px solid rgba(52,201,97,0.2)',
          padding: '20px 28px',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg,#22A84B,#145C28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: '0 4px 20px rgba(34,168,75,0.4)', flexShrink: 0,
          }}>📋</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 20, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              Form Builder
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(93,216,130,0.7)', margin: '2px 0 0', fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>
              Manage the Project Setup &amp; Registration form layout
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hasChanges && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.3)',
                fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.06em',
              }}>● Unsaved changes</span>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(52,201,97,0.15)', border: '1.5px solid rgba(52,201,97,0.35)',
                color: '#5DD882', fontWeight: 700, fontSize: 13,
                fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,201,97,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,201,97,0.15)'}
            >
              ✚ Add Field
            </button>
            <button
              onClick={() => setResetConfirm(true)}
              style={{
                padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontWeight: 700, fontSize: 13,
                fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >
              ↺ Reset
            </button>
            <button
              onClick={saveSchema}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 22px', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#22A84B,#145C28)',
                border: 'none', color: saving ? '#64748b' : '#fff',
                fontWeight: 800, fontSize: 13, fontFamily: 'Montserrat,sans-serif',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(34,168,75,0.35)',
                transition: 'all 0.18s', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '⏳ Saving…' : '💾 Save Schema'}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '28px auto', padding: '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

            {/* ── Left: Step sidebar ── */}
            <div style={{
              background: 'linear-gradient(135deg, #0A1F0F, #0E2818)',
              border: '1.5px solid rgba(52,201,97,0.15)',
              borderRadius: 16,
              padding: '16px 12px',
              height: 'fit-content',
              position: 'sticky', top: 20,
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(93,216,130,0.5)', fontFamily: 'Montserrat,sans-serif', marginBottom: 10, paddingLeft: 4 }}>
                Steps
              </div>
              {schema.steps.map((s, si) => {
                const isCoreStep = s.groups.some(g => g.fields.some(f => f.isCore));
                return (
                  <div
                    key={si}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                      borderRadius: 10, overflow: 'hidden',
                      background: activeStep === si ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveStep(si)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        border: activeStep === si ? '1.5px solid rgba(52,201,97,0.4)' : '1.5px solid rgba(255,255,255,0.04)',
                        background: activeStep === si
                          ? 'linear-gradient(135deg,rgba(34,168,75,0.2),rgba(20,92,40,0.15))'
                          : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.18s',
                        minWidth: 0,
                      }}
                      onMouseEnter={e => { if (activeStep !== si) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                      onMouseLeave={e => { if (activeStep !== si) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: activeStep === si ? '#5DD882' : '#94a3b8', fontFamily: 'Nunito,sans-serif', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: 9.5, color: '#475569', fontFamily: 'Nunito,sans-serif', fontWeight: 600 }}>
                          {s.groups.reduce((acc, g) => acc + g.fields.length, 0)} fields
                        </div>
                      </div>
                    </button>

                    {/* Step Controls (Reorder & Delete) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          type="button"
                          onClick={() => moveStep(si, -1)}
                          disabled={si === 0}
                          title="Move step up"
                          style={{
                            width: 18, height: 18, border: 'none', borderRadius: 4,
                            background: si === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(52,201,97,0.12)',
                            color: si === 0 ? '#475569' : '#5DD882',
                            cursor: si === 0 ? 'not-allowed' : 'pointer',
                            fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveStep(si, 1)}
                          disabled={si === schema.steps.length - 1}
                          title="Move step down"
                          style={{
                            width: 18, height: 18, border: 'none', borderRadius: 4,
                            background: si === schema.steps.length - 1 ? 'rgba(255,255,255,0.02)' : 'rgba(52,201,97,0.12)',
                            color: si === schema.steps.length - 1 ? '#475569' : '#5DD882',
                            cursor: si === schema.steps.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >▼</button>
                      </div>
                      {!isCoreStep && (
                        <button
                          type="button"
                          onClick={() => deleteStep(si)}
                          title="Delete step"
                          style={{
                            width: 38, height: 18, border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4,
                            background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                            cursor: 'pointer', fontSize: 9, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Montserrat,sans-serif',
                          }}
                        >✕ DEL</button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAddStepModal(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10, marginTop: 12,
                  border: '1.5px dashed rgba(52,201,97,0.3)',
                  background: 'rgba(52,201,97,0.06)',
                  color: '#5DD882', fontWeight: 700, fontSize: 12,
                  fontFamily: 'Montserrat,sans-serif', cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,201,97,0.12)'; e.currentTarget.style.borderColor = 'rgba(52,201,97,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,201,97,0.06)'; e.currentTarget.style.borderColor = 'rgba(52,201,97,0.3)'; }}
              >
                ✚ Add Step
              </button>

              {/* Info box */}
              <div style={{ marginTop: 16, padding: '12px', borderRadius: 10, background: 'rgba(52,201,97,0.06)', border: '1px solid rgba(52,201,97,0.15)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(93,216,130,0.7)', fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.06em', marginBottom: 6 }}>ℹ LEGEND</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Nunito,sans-serif', lineHeight: 1.7 }}>
                  <span style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>CORE</span> — system field<br />
                  <span style={{ background: 'rgba(168,85,247,0.15)', color: '#c4b5fd', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>CUSTOM</span> — admin-added
                </div>
              </div>
            </div>

            {/* ── Right: Editor panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Step metadata editor */}
              <div style={{
                background: 'linear-gradient(135deg, #0A1F0F, #0E2818)',
                border: '1.5px solid rgba(52,201,97,0.15)',
                borderRadius: 16, padding: '20px',
              }}>
                <SectionLabel>Step {activeStep + 1} Settings</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px', gap: 12 }}>
                  <FormInput label="Step Label" value={currentStep.label} onChange={v => updateStepMeta(activeStep, 'label', v)} placeholder="e.g. General Info" />
                  <FormInput label="Sub-title" value={currentStep.sub} onChange={v => updateStepMeta(activeStep, 'sub', v)} placeholder="e.g. Site & project details" />
                  <FormInput label="Icon" value={currentStep.icon} onChange={v => updateStepMeta(activeStep, 'icon', v)} placeholder="🏗️" />
                </div>
              </div>

              {/* Groups + fields */}
              {currentStep.groups.map((group, gi) => {
                const fields = [...group.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                return (
                  <div key={gi} style={{
                    background: 'linear-gradient(135deg, #0A1F0F, #0E2818)',
                    border: '1.5px solid rgba(52,201,97,0.15)',
                    borderRadius: 16, padding: '20px',
                  }}>
                    {/* Group header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(34,168,75,0.2)', border: '1px solid rgba(93,216,130,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                      }}>▦</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94a3b8', fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.04em' }}>
                          Group {gi + 1} — {fields.length} field{fields.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {/* Divider label editor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'Montserrat,sans-serif', fontWeight: 600 }}>Divider:</span>
                        <input
                          value={group.dividerLabel || ''}
                          onChange={e => updateDivider(activeStep, gi, e.target.value)}
                          placeholder="e.g. Area & Timeline (blank = none)"
                          style={{
                            padding: '6px 10px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', fontSize: 12,
                            fontFamily: 'Nunito,sans-serif', width: 220, outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fields */}
                    {fields.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '20px', borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.07)' }}>
                        No fields in this group. Add a custom field using the "+ Add Field" button.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {fields.map((field, fi) => (
                          <div key={field.fieldKey} className="fb-field-card">
                            <FieldCard
                              field={field}
                              groupIdx={gi}
                              fieldIdx={fi}
                              onUpdate={(gIdx, fIdx, key, val) => updateField(activeStep, gIdx, fIdx, key, val)}
                              onDelete={(gIdx, fIdx) => deleteField(activeStep, gIdx, fIdx)}
                              onMoveUp={() => moveField(activeStep, gi, fi, -1)}
                              onMoveDown={() => moveField(activeStep, gi, fi, 1)}
                              isFirst={fi === 0}
                              isLast={fi === fields.length - 1}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Field Modal ── */}
      {showAddModal && (
        <AddFieldModal
          onAdd={addCustomField}
          onClose={() => setShowAddModal(false)}
          stepCount={schema.steps.length}
        />
      )}

      {/* ── Add Step Modal ── */}
      {showAddStepModal && (
        <AddStepModal
          onAdd={addStep}
          onClose={() => setShowAddStepModal(false)}
        />
      )}

      {/* ── Reset Confirm Modal ── */}
      {resetConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setResetConfirm(false)}>
          <div style={{ background: 'linear-gradient(135deg, #1a0a0a, #2d1414)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 28, maxWidth: 420, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 17, color: '#fff', margin: '0 0 8px' }}>Reset to Defaults?</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Nunito,sans-serif', margin: '0 0 20px', lineHeight: 1.6 }}>
              This will remove all custom fields and restore the original form layout. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setResetConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif' }}>Cancel</button>
              <button onClick={resetSchema} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Resetting…' : '↺ Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Add Step Modal ──────────────────────────────────────────────────────────
function AddStepModal({ onAdd, onClose }) {
  const [label, setLabel] = useState('');
  const [sub, setSub] = useState('');
  const [icon, setIcon] = useState('📋');

  const handleAdd = () => {
    if (!label.trim()) { toast.error('Step label is required'); return; }
    onAdd(label.trim(), sub.trim(), icon.trim());
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #0A1F0F, #0E2818)',
        border: '1.5px solid rgba(52,201,97,0.25)', borderRadius: 18,
        width: 460, padding: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg,#22A84B,#145C28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 4px 16px rgba(34,168,75,0.4)',
          }}>✚</div>
          <div>
            <div style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 16, color: '#fff' }}>Add Form Step / Section</div>
            <div style={{ fontSize: 11, color: 'rgba(93,216,130,0.6)', fontWeight: 600, fontFamily: 'Nunito,sans-serif' }}>Create a new step for the user registration form</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'rgba(255,255,255,0.07)', color: '#94a3b8', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 12 }}>
            <FormInput label="Step Label *" value={label} onChange={setLabel} placeholder="e.g. Environmental Impact" />
            <FormInput label="Icon" value={icon} onChange={setIcon} placeholder="📋" />
          </div>
          <FormInput label="Sub-title / Description" value={sub} onChange={setSub} placeholder="e.g. Additional sustainability questions" />

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 16px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif' }}>Cancel</button>
            <button onClick={handleAdd} style={{ flex: 1, padding: '10px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#22A84B,#145C28)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', boxShadow: '0 4px 12px rgba(34,168,75,0.3)' }}>✚ Add Step</button>
          </div>
        </div>
      </div>
    </div>
  );
}
