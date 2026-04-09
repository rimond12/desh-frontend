import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

// ── small helpers ─────────────────────────────────────────────────────────────

function StatPill({ label, value, color = 'var(--g700)', bg = 'var(--g50)', border = 'var(--g200)' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 18px', borderRadius: 12, background: bg,
      border: `1.5px solid ${border}`, minWidth: 80,
    }}>
      <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 26, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--tx-faint)', marginTop: 4,
        textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Montserrat,sans-serif',
      }}>
        {label}
      </span>
    </div>
  );
}

// Simple CSV line counter & type sniffer (client-side preview only)
function sniffCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return null;

  const counts = { TAB: 0, MODULE: 0, SECTION: 0, INPUT: 0, EVAL: 0, UNKNOWN: 0 };
  lines.slice(1).forEach(line => {
    const first = line.split(',')[0].trim().toUpperCase();
    if (counts[first] !== undefined) counts[first]++;
    else counts.UNKNOWN++;
  });
  return { total: lines.length - 1, counts };
}

// ── Flush collection definitions ──────────────────────────────────────────────

const FLUSH_COLLECTIONS = [
  { key: 'tabs',      label: 'Tabs',          icon: '📁', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE',
    warn: 'Removing tabs will cascade-break all linked modules and inputs.' },
  { key: 'modules',   label: 'Modules',        icon: '📦', color: '#5B21B6', bg: '#EDE9FE', border: '#C4B5FD',
    warn: 'Removing modules will leave inputs without a parent.' },
  { key: 'sections',  label: 'Sections',       icon: '🗂', color: '#92400E', bg: '#FEF9C3', border: '#FDE68A',
    warn: 'Sections are required for inputs — removing them will break input linkage.' },
  { key: 'inputs',    label: 'Input Fields',   icon: '📝', color: '#145C28', bg: '#D6F5E3', border: '#A8EFC0',
    warn: 'All question fields will be removed from every module.' },
  { key: 'evalRules', label: 'Leaf Levels',    icon: '🍃', color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA',
    warn: 'Leaf level evaluation rules will be deleted.' },
];

// ── main component ────────────────────────────────────────────────────────────

export default function ImportExport() {
  const ax = useAxiosSecure();

  // Export
  const [dbStats, setDbStats]     = useState(null);
  const [exporting, setExporting] = useState(false);

  // Import
  const fileRef               = useRef(null);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState(null);

  // Flush
  const [flushSelected, setFlushSelected] = useState({
    tabs: false, modules: false, sections: false, inputs: false, evalRules: false,
  });
  const [flushConfirmText, setFlushConfirmText] = useState('');
  const [flushing, setFlushing]     = useState(false);
  const [flushResult, setFlushResult] = useState(null);
  const [flushExpanded, setFlushExpanded] = useState(false);

  const flushCount = Object.values(flushSelected).filter(Boolean).length;
  const flushReady = flushCount > 0 && flushConfirmText === 'FLUSH';

  // Load current DB counts on mount and after import/flush
  const loadStats = () => {
    Promise.all([
      ax.get('/tabs/all'),
      ax.get('/sections'),
      ax.get('/settings/eval-rules'),
    ]).then(([tabsRes, secRes, rulesRes]) => {
      setDbStats({
        tabs:     (tabsRes.data.tabs || []).length,
        sections: (secRes.data.sections || []).length,
        evals:    (rulesRes.data.rules  || []).length,
      });
    }).catch(() => {});
  };

  useEffect(loadStats, [result, flushResult]);

  // ── Export / Template ─────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await ax.get('/admin/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `desh_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleTemplate = async () => {
    try {
      const res = await ax.get('/admin/template', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = 'desh_import_template.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded!');
    } catch { toast.error('Failed to download template'); }
  };

  // ── File selection ────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) { toast.error('Please select a .csv file'); return; }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = ev => { setPreview(sniffCSV(ev.target.result)); };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { fileRef.current.files = e.dataTransfer.files; handleFileChange({ target: { files: e.dataTransfer.files } }); }
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await ax.post('/admin/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data.stats);
      toast.success('Import complete!');
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally { setImporting(false); }
  };

  // ── Flush ─────────────────────────────────────────────────────────────────

  const toggleAll = () => {
    const allOn = FLUSH_COLLECTIONS.every(c => flushSelected[c.key]);
    const next = {};
    FLUSH_COLLECTIONS.forEach(c => { next[c.key] = !allOn; });
    setFlushSelected(next);
  };

  const handleFlush = async () => {
    const collections = Object.entries(flushSelected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!collections.length) return;
    setFlushing(true);
    setFlushResult(null);
    try {
      const res = await ax.post('/admin/flush', { collections });
      setFlushResult(res.data.deleted);
      setFlushSelected({ tabs: false, modules: false, sections: false, inputs: false, evalRules: false });
      setFlushConfirmText('');
      toast.success(`Flushed ${res.data.total} records`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Flush failed');
    } finally { setFlushing(false); }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Layout isAdmin>
      <div className="fade-in-up">

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 24, color: 'var(--tx)', margin: 0 }}>
            Import / Export
          </h1>
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', margin: '4px 0 0', fontWeight: 500 }}>
            Bulk manage Tabs, Modules, Sections, Inputs and Leaf Levels via CSV
          </p>
        </div>

        {/* ── Format guide ── */}
        <div style={{
          padding: '16px 20px', borderRadius: 14, marginBottom: 28,
          background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
          border: '1.5px solid #BFDBFE',
        }}>
          <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13, color: '#1D4ED8', margin: '0 0 10px' }}>
            📋 CSV Format — one file contains everything
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { type: 'TAB',     desc: 'tab_title, tab_sortOrder, tab_isActive',                                                              color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
              { type: 'MODULE',  desc: 'tab_title (link), module_title, module_readDetails, module_sortOrder',                                color: '#5B21B6', bg: '#EDE9FE', border: '#C4B5FD' },
              { type: 'SECTION', desc: 'section_title, section_sortOrder, section_isActive',                                                  color: '#92400E', bg: '#FEF9C3', border: '#FDE68A' },
              { type: 'INPUT',   desc: 'tab_title, module_title, section_title, input_label, input_type, options (checkbox), line (number)',  color: '#145C28', bg: '#D6F5E3', border: '#A8EFC0' },
              { type: 'EVAL',    desc: 'eval_name, eval_minPercent, eval_maxPercent, eval_color, eval_sortOrder',                              color: '#92400E', bg: '#FEF9C3', border: '#FDE68A' },
            ].map(({ type, desc, color, bg, border }) => (
              <div key={type} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px',
                borderRadius: 10, background: bg, border: `1px solid ${border}`, flex: '1 1 240px',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 5,
                  background: color, color: '#fff', fontFamily: 'Montserrat,sans-serif',
                  whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
                }}>{type}</span>
                <span style={{ fontSize: 11.5, color, fontWeight: 500, lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#3B82F6', margin: '10px 0 0', fontWeight: 500 }}>
            💡 Download the template below for a fully annotated example with instructions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>

          {/* ═══════════════════════════════════════════════════════
              EXPORT CARD
          ═══════════════════════════════════════════════════════ */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: 18, background: '#fff', overflow: 'hidden', boxShadow: 'var(--sh-xs)' }}>
            <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,var(--g700),var(--g500))', borderBottom: '1px solid var(--g600)' }}>
              <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 15, color: '#fff', margin: 0 }}>
                ↓ Export Data
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>
                Download all current data as a CSV file
              </p>
            </div>

            <div style={{ padding: '22px' }}>
              {dbStats && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
                  <StatPill label="Tabs"     value={dbStats.tabs}     />
                  <StatPill label="Sections" value={dbStats.sections} />
                  <StatPill label="Leaf Lvl" value={dbStats.evals}    />
                </div>
              )}

              <p style={{ fontSize: 12.5, color: 'var(--tx-muted)', marginBottom: 18, lineHeight: 1.6 }}>
                Exports all <strong>Tabs</strong>, <strong>Modules</strong>, <strong>Sections</strong>, <strong>Input fields</strong>
                {' '}and <strong>Leaf Level rules</strong> into a single CSV file. You can re-import this file
                after editing — existing rows are updated, new rows are added.
              </p>

              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  width: '100%', padding: '11px', borderRadius: 11, border: 'none',
                  background: exporting ? 'var(--bg-muted)' : 'linear-gradient(135deg,var(--g700),var(--g500))',
                  color: exporting ? 'var(--tx-faint)' : '#fff',
                  fontWeight: 800, fontSize: 13.5, cursor: exporting ? 'default' : 'pointer',
                  fontFamily: 'Montserrat,sans-serif',
                  boxShadow: exporting ? 'none' : '0 3px 14px rgba(34,168,75,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                {exporting ? '⏳ Preparing…' : '⬇ Export All Data (.csv)'}
              </button>

              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

              <p style={{ fontSize: 12, color: 'var(--tx-faint)', marginBottom: 12, fontWeight: 600 }}>
                First time? Download the template:
              </p>
              <button
                onClick={handleTemplate}
                style={{
                  width: '100%', padding: '10px', borderRadius: 11,
                  border: '1.5px solid var(--g300)', background: 'var(--g50)',
                  color: 'var(--g700)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'Montserrat,sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                📄 Download Import Template
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              IMPORT CARD
          ═══════════════════════════════════════════════════════ */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: 18, background: '#fff', overflow: 'hidden', boxShadow: 'var(--sh-xs)' }}>
            <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', borderBottom: '1px solid #2563EB' }}>
              <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 15, color: '#fff', margin: 0 }}>
                ↑ Import Data
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>
                Upload a CSV to create or update records
              </p>
            </div>

            <div style={{ padding: '22px' }}>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${file ? 'var(--g400)' : 'var(--border-md)'}`,
                  borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                  cursor: 'pointer', marginBottom: 16,
                  background: file ? 'var(--g50)' : 'var(--bg-soft)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? '📄' : '📂'}</div>
                {file ? (
                  <>
                    <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--g700)', margin: 0 }}>{file.name}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--tx-faint)', margin: '4px 0 0' }}>
                      {(file.size / 1024).toFixed(1)} KB — click to change
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--tx-muted)', margin: 0 }}>
                      Drop CSV here or click to browse
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--tx-faint)', margin: '4px 0 0' }}>
                      .csv files only · max 5 MB
                    </p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>

              {/* Preview sniff */}
              {preview && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 16,
                  background: '#F0FDF4', border: '1.5px solid var(--g200)',
                }}>
                  <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11, color: 'var(--g700)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Detected rows
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(preview.counts).filter(([, v]) => v > 0).map(([type, count]) => (
                      <span key={type} style={{
                        fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 7,
                        background: { TAB: '#EFF6FF', MODULE: '#EDE9FE', SECTION: '#FEF9C3', INPUT: '#D6F5E3', EVAL: '#FFF7ED', UNKNOWN: '#F3F4F6' }[type] || '#F3F4F6',
                        color: { TAB: '#1D4ED8', MODULE: '#5B21B6', SECTION: '#92400E', INPUT: '#145C28', EVAL: '#C2410C', UNKNOWN: '#6B7280' }[type] || '#6B7280',
                        border: '1px solid currentColor',
                      }}>
                        {count} {type}{count !== 1 ? 's' : ''}
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--tx-faint)', marginLeft: 4, alignSelf: 'center' }}>
                      ({preview.total} total rows)
                    </span>
                  </div>
                  {preview.counts.UNKNOWN > 0 && (
                    <p style={{ fontSize: 11, color: '#DC2626', margin: '8px 0 0' }}>
                      ⚠ {preview.counts.UNKNOWN} row(s) have unrecognised type — they will be skipped
                    </p>
                  )}
                </div>
              )}

              <p style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginBottom: 16, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--tx-muted)' }}>Merge mode:</strong> existing records (matched by name) are
                updated; new ones are created. Nothing is deleted.
              </p>

              <button
                onClick={handleImport}
                disabled={!file || importing}
                style={{
                  width: '100%', padding: '11px', borderRadius: 11, border: 'none',
                  background: (!file || importing) ? 'var(--bg-muted)' : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
                  color: (!file || importing) ? 'var(--tx-faint)' : '#fff',
                  fontWeight: 800, fontSize: 13.5,
                  cursor: (!file || importing) ? 'default' : 'pointer',
                  fontFamily: 'Montserrat,sans-serif',
                  boxShadow: (!file || importing) ? 'none' : '0 3px 14px rgba(29,78,216,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                {importing ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Importing…
                  </span>
                ) : '⬆ Import CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            IMPORT RESULT
        ═══════════════════════════════════════════════════════ */}
        {result && (
          <div className="fade-in-up" style={{ marginTop: 24, border: '1.5px solid var(--g200)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--sh-xs)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--g50)', borderBottom: '1px solid var(--g200)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--g700)', margin: 0 }}>
                Import Complete
              </p>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--tx-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px', fontFamily: 'Montserrat,sans-serif' }}>
                Created
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                <StatPill label="Tabs"      value={result.tabs}      color="#1D4ED8" bg="#EFF6FF" border="#BFDBFE" />
                <StatPill label="Modules"   value={result.modules}   color="#5B21B6" bg="#EDE9FE" border="#C4B5FD" />
                <StatPill label="Sections"  value={result.sections}  color="#92400E" bg="#FEF9C3" border="#FDE68A" />
                <StatPill label="Inputs"    value={result.inputs}    color="#145C28" bg="#D6F5E3" border="#A8EFC0" />
                <StatPill label="Leaf Lvls" value={result.evalRules} color="#C2410C" bg="#FFF7ED" border="#FED7AA" />
                <StatPill label="Updated"   value={result.updated}   color="var(--tx-muted)" bg="var(--bg-soft)" border="var(--border)" />
              </div>
              {result.errors?.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: 'Montserrat,sans-serif' }}>
                    ⚠ Skipped rows ({result.errors.length})
                  </p>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ padding: '6px 10px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#DC2626' }}>
                        {e}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            FLUSH DATABASE CARD
        ═══════════════════════════════════════════════════════ */}
        <div style={{
          marginTop: 28,
          border: '1.5px solid #FECACA',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(239,68,68,0.08)',
          background: '#fff',
        }}>
          {/* Header — collapsible */}
          <button
            onClick={() => setFlushExpanded(p => !p)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px', background: 'linear-gradient(135deg,#7F1D1D,#DC2626)',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div>
              <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 15, color: '#fff', margin: 0 }}>
                🗑 Flush Database
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>
                Permanently clear selected collections before importing fresh data
              </p>
            </div>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginLeft: 16, flexShrink: 0, transition: 'transform 0.2s', transform: flushExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▾
            </span>
          </button>

          {flushExpanded && (
            <div style={{ padding: '24px 24px 28px' }}>

              {/* Warning banner */}
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 22,
                background: '#FEF2F2', border: '1.5px solid #FECACA',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13, color: '#991B1B', margin: '0 0 4px' }}>
                    This action is permanent and cannot be undone.
                  </p>
                  <p style={{ fontSize: 12, color: '#B91C1C', margin: 0, lineHeight: 1.6 }}>
                    Selected collections will be <strong>completely wiped</strong>. Export a backup first.
                    This is intended for replacing the full dataset with a fresh CSV import.
                  </p>
                </div>
              </div>

              {/* Recommended workflow */}
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 22,
                background: '#FFFBEB', border: '1px solid #FDE68A',
              }}>
                <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 11.5, color: '#92400E', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recommended workflow
                </p>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {['Export current data as a backup ↑', 'Select collections to flush below', 'Type FLUSH to confirm', 'Import your new CSV ↑'].map((s, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                      <strong>Step {i + 1}:</strong> {s}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Collection checkboxes */}
              <p style={{
                fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11,
                color: 'var(--tx-faint)', textTransform: 'uppercase', letterSpacing: '0.08em',
                margin: '0 0 12px',
              }}>
                Select collections to clear
              </p>

              {/* Select all toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--tx-muted)', fontWeight: 600 }}>
                  {flushCount} of {FLUSH_COLLECTIONS.length} selected
                </span>
                <button
                  onClick={toggleAll}
                  style={{
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 12px',
                    borderRadius: 7, border: '1px solid #FECACA',
                    background: '#FEF2F2', color: '#DC2626',
                  }}
                >
                  {FLUSH_COLLECTIONS.every(c => flushSelected[c.key]) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {FLUSH_COLLECTIONS.map(col => {
                  const checked = flushSelected[col.key];
                  return (
                    <label
                      key={col.key}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                        padding: '12px 14px', borderRadius: 10,
                        background: checked ? col.bg : 'var(--bg-soft)',
                        border: `1.5px solid ${checked ? col.border : 'var(--border)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setFlushSelected(p => ({ ...p, [col.key]: !p[col.key] }))}
                        style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', accentColor: '#DC2626' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 16 }}>{col.icon}</span>
                          <span style={{
                            fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13,
                            color: checked ? col.color : 'var(--tx)',
                          }}>
                            {col.label}
                          </span>
                        </div>
                        {checked && (
                          <p style={{ fontSize: 11, color: col.color, margin: 0, lineHeight: 1.5, opacity: 0.85 }}>
                            ⚠ {col.warn}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Confirmation input */}
              {flushCount > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 700, margin: '0 0 8px' }}>
                    Type <code style={{ background: '#FEE2E2', padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>FLUSH</code> to confirm:
                  </p>
                  <input
                    type="text"
                    value={flushConfirmText}
                    onChange={e => setFlushConfirmText(e.target.value)}
                    placeholder="Type FLUSH here…"
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
                      border: `1.5px solid ${flushConfirmText === 'FLUSH' ? '#EF4444' : 'var(--border)'}`,
                      fontSize: 14, fontWeight: 700, outline: 'none',
                      background: flushConfirmText === 'FLUSH' ? '#FEF2F2' : '#fff',
                      color: '#DC2626', fontFamily: 'monospace',
                      transition: 'all 0.15s',
                    }}
                  />
                </div>
              )}

              {/* Flush button */}
              <button
                onClick={handleFlush}
                disabled={!flushReady || flushing}
                style={{
                  width: '100%', padding: '12px', borderRadius: 11, border: 'none',
                  background: flushReady && !flushing
                    ? 'linear-gradient(135deg,#991B1B,#DC2626)'
                    : 'var(--bg-muted)',
                  color: flushReady && !flushing ? '#fff' : 'var(--tx-faint)',
                  fontWeight: 900, fontSize: 14,
                  cursor: flushReady && !flushing ? 'pointer' : 'default',
                  fontFamily: 'Montserrat,sans-serif',
                  boxShadow: flushReady && !flushing ? '0 4px 16px rgba(220,38,38,0.35)' : 'none',
                  transition: 'all 0.15s',
                  letterSpacing: '0.02em',
                }}
              >
                {flushing ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Flushing…
                  </span>
                ) : flushCount === 0
                  ? '🗑 Select at least one collection'
                  : flushConfirmText !== 'FLUSH'
                    ? `🔒 Type FLUSH to unlock (${flushCount} selected)`
                    : `🗑 Permanently Delete from ${flushCount} Collection${flushCount > 1 ? 's' : ''}`}
              </button>

              {/* Flush result */}
              {flushResult && (
                <div className="fade-in-up" style={{
                  marginTop: 20, padding: '16px 18px', borderRadius: 12,
                  background: '#FEF2F2', border: '1.5px solid #FECACA',
                }}>
                  <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13, color: '#991B1B', margin: '0 0 12px' }}>
                    🗑 Flush Complete — records deleted:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {FLUSH_COLLECTIONS.map(col => flushResult[col.key] !== undefined && (
                      <div key={col.key} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '10px 16px', borderRadius: 10,
                        background: '#fff', border: '1.5px solid #FECACA', minWidth: 72,
                      }}>
                        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 22, color: '#DC2626', lineHeight: 1 }}>
                          {flushResult[col.key]}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#B91C1C', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#991B1B', margin: '14px 0 0', fontWeight: 600 }}>
                    ✅ You can now import a fresh CSV above.
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Tips ── */}
        <div style={{
          marginTop: 24, padding: '16px 20px', borderRadius: 14,
          background: 'var(--bg-soft)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 12, color: 'var(--tx-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tips
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              'Define TABs before MODULEs, MODULEs before INPUTs — order matters.',
              'For checkbox inputs, use the format: Option A:10|Option B:20|Option C:5',
              'For number inputs, set line_x1/y1/x2/y2 for the straight-line points formula.',
              'Lines starting with # are treated as comments and ignored.',
              'Import is safe — it never deletes existing data (merge mode).',
              'To replace all data cleanly: Export → Flush → Import fresh CSV.',
            ].map((tip, i) => (
              <li key={i} style={{ fontSize: 12.5, color: 'var(--tx-muted)', lineHeight: 1.5 }}>{tip}</li>
            ))}
          </ul>
        </div>

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </Layout>
  );
}
