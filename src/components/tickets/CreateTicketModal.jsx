import React, { useState, useEffect } from 'react';
import {
  X, Send, Paperclip, ChevronRight, ChevronLeft,
  Ticket, FolderOpen, FileText, CheckCircle2,
  Upload, Zap, Target, ArrowRight
} from 'lucide-react';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import DynamicTicketForm from './DynamicTicketForm';
import toast from 'react-hot-toast';

/* ── Priority map ─────────────────────────────────────────────────── */
const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: '#DC2626', bg: 'rgba(220,38,38,0.09)', border: 'rgba(220,38,38,0.22)' },
  { value: 'high',     label: 'High',     color: '#EA580C', bg: 'rgba(234,88,12,0.09)',  border: 'rgba(234,88,12,0.22)'  },
  { value: 'medium',   label: 'Medium',   color: '#CA8A04', bg: 'rgba(202,138,4,0.09)',  border: 'rgba(202,138,4,0.22)'  },
  { value: 'low',      label: 'Low',      color: '#16A34A', bg: 'rgba(22,163,74,0.09)',  border: 'rgba(22,163,74,0.22)'  },
];

const STEPS = [
  { id: 1, label: 'Details'  },
  { id: 2, label: 'Files'    },
  { id: 3, label: 'Review'   },
];

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProject  = null,
  preselectedInput    = null,
  preselectedQuestion = null,
}) {
  const axiosSecure = useAxiosSecure();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);

  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(
    preselectedQuestion?.projectId || preselectedProject || ''
  );
  const [formSchema,      setFormSchema]      = useState(null);
  const [subject,         setSubject]         = useState(
    preselectedQuestion?.questionSnapshot?.label
      ? `Clarification: ${preselectedQuestion.questionSnapshot.label.slice(0, 60)}`
      : ''
  );
  const [description,     setDescription]     = useState('');
  const [category,        setCategory]        = useState('clarification');
  const [type,            setType]            = useState('question');
  const [priority,        setPriority]        = useState('medium');
  const [dynamicFormData, setDynamicFormData] = useState({});
  const [files,           setFiles]           = useState([]);
  const [dragActive,      setDragActive]      = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (preselectedQuestion) {
        setSelectedProject(preselectedQuestion.projectId || '');
        if (preselectedQuestion.questionSnapshot?.label) {
          setSubject(`Clarification: ${preselectedQuestion.questionSnapshot.label.slice(0, 60)}`);
        }
      }
      axiosSecure.get('/projects').then((res) => {
        setProjects(res.data.projects || res.data || []);
      }).catch(() => {});
      axiosSecure.get('/ticket-forms').then((res) => {
        setFormSchema(res.data.schema);
      }).catch(() => {});
    }
  }, [isOpen, preselectedQuestion, axiosSecure]);

  if (!isOpen) return null;

  const addFiles = (f) => setFiles((p) => [...p, ...Array.from(f)]);
  const handleFileChange = (e) => { if (e.target.files) addFiles(e.target.files); };
  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));
  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject)    return toast.error('Please select a project');
    if (!subject.trim())     return toast.error('Please enter a subject');
    if (!description.trim()) return toast.error('Please enter a description');

    setLoading(true);
    try {
      const payload = {
        projectId:        selectedProject,
        tabId:            preselectedQuestion?.tabId     || null,
        moduleId:         preselectedQuestion?.moduleId  || null,
        sectionId:        preselectedQuestion?.sectionId || null,
        inputId:          preselectedQuestion?.inputId   || preselectedInput || null,
        questionSnapshot: preselectedQuestion?.questionSnapshot || null,
        subject, description, category, type, priority,
        formData:         dynamicFormData,
      };
      const res       = await axiosSecure.post('/tickets', payload);
      const newTicket = res.data.ticket;

      if (files.length > 0 && newTicket?._id) {
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f));
        await axiosSecure.post(`/tickets/${newTicket._id}/attachments`, fd);
      }
      toast.success(`Ticket ${newTicket.ticketNumber} created!`);
      if (onSuccess) onSuccess(newTicket);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (step === 1) {
      if (!selectedProject)    { toast.error('Please select a project'); return; }
      if (!subject.trim())     { toast.error('Please enter a subject');  return; }
      if (!description.trim()) { toast.error('Please enter a description'); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const prio              = PRIORITIES.find((p) => p.value === priority) || PRIORITIES[2];
  const selectedProjectObj = projects.find((p) => p._id === selectedProject);

  /* ═══════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════ */
  return (
    <div style={styles.overlay}>
      <div style={styles.shell} className="fade-in-up">

        {/* ── DARK HEADER ─────────────────────────── */}
        <div style={styles.header}>

          {/* Title row */}
          <div style={styles.titleRow}>
            <div style={styles.titleIcon}>
              <Ticket size={16} color="#5DD882" />
            </div>
            <div>
              <h3 style={styles.title}>Create Clarification Ticket</h3>
              <p style={styles.subtitle}>Submit a question or request to the project team</p>
            </div>
            <button style={styles.closeBtn}
              onClick={onClose}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#FCA5A5'; }}
              onMouseOut={(e)  => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Step bar */}
          <div style={styles.stepBar}>
            {STEPS.map((s, i) => {
              const done    = step > s.id;
              const current = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => done && setStep(s.id)}
                    style={{
                      ...styles.stepBtn,
                      cursor: done ? 'pointer' : 'default',
                      opacity: !current && !done ? 0.38 : 1,
                      borderBottom: current
                        ? '2px solid #34C961'
                        : done
                          ? '2px solid rgba(52,201,97,0.3)'
                          : '2px solid transparent',
                    }}
                  >
                    <span style={{
                      ...styles.stepNum,
                      background: done
                        ? 'linear-gradient(135deg,#1A7A35,#34C961)'
                        : current
                          ? 'rgba(52,201,97,0.15)'
                          : 'rgba(255,255,255,0.05)',
                      border: done
                        ? 'none'
                        : current
                          ? '1.5px solid rgba(52,201,97,0.6)'
                          : '1px solid rgba(255,255,255,0.12)',
                    }}>
                      {done
                        ? <CheckCircle2 size={12} color="#fff" />
                        : <span style={{ fontSize: 11, fontWeight: 800, color: current ? '#5DD882' : 'rgba(255,255,255,0.35)', fontFamily: "'Montserrat',sans-serif" }}>{s.id}</span>
                      }
                    </span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: current ? 700 : 500,
                      fontFamily: "'Montserrat',sans-serif",
                      color: current ? '#fff' : done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.01em',
                    }}>
                      {s.label}
                    </span>
                  </button>

                  {i < STEPS.length - 1 && (
                    <div style={styles.stepDivider} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={styles.body}>
          <div style={styles.scrollArea}>

            {/* ═══ STEP 1 ═══ */}
            {step === 1 && (
              <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Linked question banner */}
                {preselectedQuestion?.questionSnapshot && (
                  <div style={styles.linkedBanner}>
                    <div style={styles.linkedBannerHeader}>
                      <span style={styles.linkedDot} />
                      <span style={styles.linkedLabel}>Linked Question Auto-Attached</span>
                    </div>
                    <div style={styles.linkedMeta}>
                      <span><b style={{ color: 'var(--tx-2)' }}>Project:</b> {preselectedQuestion.questionSnapshot.projectTitle || 'Current Project'}</span>
                      <span style={styles.linkedSep} />
                      <span><b style={{ color: 'var(--tx-2)' }}>Location:</b> {preselectedQuestion.questionSnapshot.tabTitle} → {preselectedQuestion.questionSnapshot.moduleTitle}</span>
                    </div>
                    <p style={styles.linkedQuestion}>"{preselectedQuestion.questionSnapshot.label}"</p>
                  </div>
                )}

                {/* Target Project */}
                <Field label="Target Project" required>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="input-field w-full"
                    style={styles.inputSm}
                    required
                  >
                    <option value="">Select a project…</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>{p.title}</option>
                    ))}
                  </select>
                </Field>

                {/* Subject */}
                <Field label="Subject / Topic" required>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Missing HVAC energy efficiency calculation"
                    className="input-field w-full"
                    style={styles.inputSm}
                    required
                  />
                </Field>

                {/* Category / Type / Priority row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field label="Category">
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-full" style={styles.inputSm}>
                      <option value="clarification">Clarification</option>
                      <option value="missing_info">Missing Info</option>
                      <option value="correction">Correction</option>
                      <option value="general">General</option>
                    </select>
                  </Field>

                  <Field label="Type">
                    <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-full" style={styles.inputSm}>
                      <option value="question">Question</option>
                      <option value="request">Request</option>
                      <option value="issue">Issue</option>
                    </select>
                  </Field>

                  <Field label="Priority">
                    <div style={{ position: 'relative' }}>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="input-field w-full"
                        style={{
                          ...styles.inputSm,
                          fontWeight: 700,
                          color: prio.color,
                          background: prio.bg,
                          borderColor: prio.border,
                          paddingLeft: 10,
                        }}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>

                {/* Description */}
                <Field label="Detailed Description" required>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide complete details about what missing information or clarification is needed…"
                    className="input-field w-full"
                    style={{ ...styles.inputSm, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }}
                    required
                  />
                </Field>
              </div>
            )}

            {/* ═══ STEP 2 ═══ */}
            {step === 2 && (
              <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {formSchema && (
                  <div>
                    <SectionLabel>Custom Dynamic Fields</SectionLabel>
                    <DynamicTicketForm schema={formSchema} values={dynamicFormData} onChange={setDynamicFormData} />
                  </div>
                )}

                <div>
                  <SectionLabel>Attachments & Supporting Documents</SectionLabel>
                  <label
                    htmlFor="modal-file-input"
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    style={{
                      ...styles.dropZone,
                      borderColor: dragActive ? '#22A84B' : 'var(--border-md)',
                      background:  dragActive ? 'rgba(34,168,75,0.04)' : 'var(--bg-soft)',
                    }}
                  >
                    <input type="file" multiple onChange={handleFileChange} className="hidden" id="modal-file-input" />
                    <div style={styles.dropIcon}>
                      <Upload size={18} color="var(--g600)" />
                    </div>
                    <p style={styles.dropTitle}>Click to upload or drag & drop</p>
                    <p style={styles.dropSub}>Any file type · Multiple files allowed</p>
                  </label>

                  {files.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                      {files.map((f, i) => (
                        <span key={i} style={styles.fileChip}>
                          <Paperclip size={10} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{f.name}</span>
                          <button type="button" onClick={() => removeFile(i)} style={styles.fileRemove}
                            onMouseOver={(e) => e.currentTarget.style.color = '#DC2626'}
                            onMouseOut={(e)  => e.currentTarget.style.color = 'var(--tx-faint)'}
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ STEP 3 ═══ */}
            {step === 3 && (
              <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SectionLabel>Review Before Submitting</SectionLabel>

                {/* Summary card */}
                <div style={styles.reviewCard}>
                  {/* Card header */}
                  <div style={styles.reviewCardHead}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FolderOpen size={14} color="var(--g700)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)', fontFamily: "'Montserrat',sans-serif" }}>
                        {selectedProjectObj?.title || '—'}
                      </span>
                    </div>
                    <span style={{ display:'inline-flex',alignItems:'center',gap:4, padding:'3px 10px',borderRadius:99, fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif", background:prio.bg, color:prio.color, border:`1px solid ${prio.border}` }}>
                      <Zap size={10}/> {prio.label}
                    </span>
                  </div>

                  {/* Rows */}
                  <div style={styles.reviewBody}>
                    <ReviewRow label="Subject"     value={subject} />
                    <ReviewRow label="Category"    value={`${category} · ${type}`} />
                    <ReviewRow label="Description" value={description} multiline />
                    {files.length > 0 && (
                      <ReviewRow label="Files" value={`${files.length} attachment${files.length > 1 ? 's' : ''}`} />
                    )}
                  </div>
                </div>

                {/* Info note */}
                <div style={styles.reviewNote}>
                  <CheckCircle2 size={14} color="#22A84B" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12.5, color: 'var(--tx-muted)', margin: 0, lineHeight: 1.6, fontFamily: "'Nunito',sans-serif" }}>
                    Once submitted, the ticket will be sent to the project team for review. You can track its progress from the Clarification Tickets page.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ─────────────────────────────── */}
          <div style={styles.footer}>
            {step > 1 ? (
              <button type="button" onClick={goBack} className="btn-secondary" style={{ fontSize: 12.5, padding: '8px 18px' }}>
                <ChevronLeft size={14} /> Back
              </button>
            ) : <div />}

            {/* dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {STEPS.map((s) => (
                <div key={s.id} style={{
                  height: 6, borderRadius: 99,
                  width: s.id === step ? 22 : 6,
                  background: s.id === step
                    ? 'linear-gradient(90deg,var(--g700),var(--g400))'
                    : s.id < step
                      ? 'var(--g300)'
                      : 'var(--bg-muted)',
                  transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
                }} />
              ))}
            </div>

            {step < 3 ? (
              <button type="button" onClick={goNext} className="btn-primary-green" style={{ fontSize: 12.5, padding: '8px 20px' }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary-green" style={{ fontSize: 12.5, padding: '8px 22px', minWidth: 130 }}>
                {loading ? (
                  <><Spinner /> Submitting…</>
                ) : (
                  <><Send size={14} /> Submit Ticket</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{
        display: 'block', marginBottom: 6,
        fontSize: 12, fontWeight: 700,
        fontFamily: "'Montserrat',sans-serif",
        color: 'var(--tx-2)', letterSpacing: '0.01em',
      }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 800,
      fontFamily: "'Montserrat',sans-serif",
      color: 'var(--tx-faint)', textTransform: 'uppercase',
      letterSpacing: '0.1em', marginBottom: 10,
    }}>
      {children}
    </p>
  );
}

function ReviewRow({ label, value, multiline }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: multiline ? 'flex-start' : 'baseline', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", color: 'var(--tx-faint)', minWidth: 84, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--tx)', fontFamily: "'Nunito',sans-serif", fontWeight: 600, flex: 1, lineHeight: 1.6 }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 13, height: 13, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.25)',
      borderTopColor: '#fff',
      display: 'inline-block',
      animation: 'spin 0.65s linear infinite',
    }} />
  );
}

/* ── Style objects ───────────────────────────────────────────────── */
const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
    background: 'rgba(3,14,7,0.75)',
    backdropFilter: 'blur(7px)',
  },
  shell: {
    width: '100%', maxWidth: 640,
    maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    borderRadius: 20,
    background: '#fff',
    boxShadow: '0 32px 96px rgba(5,26,10,0.40), 0 0 0 1px rgba(208,232,216,0.7)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(160deg,#051A0A 0%,#0C3318 55%,#144D24 100%)',
    flexShrink: 0,
    padding: '20px 22px 0',
  },
  titleRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
  },
  titleIcon: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(135deg,rgba(34,168,75,0.28),rgba(52,201,97,0.12))',
    border: '1px solid rgba(52,201,97,0.28)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: '#fff', fontSize: 15.5, margin: 0,
    fontFamily: "'Montserrat',sans-serif",
    fontWeight: 700, letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.38)', fontSize: 11.5, margin: 0,
    fontFamily: "'Nunito',sans-serif",
  },
  closeBtn: {
    marginLeft: 'auto', flexShrink: 0,
    width: 30, height: 30, borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.18s',
  },
  stepBar: {
    display: 'flex', alignItems: 'stretch',
  },
  stepBtn: {
    flex: 1, background: 'none', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '10px 6px 12px', transition: 'all 0.2s',
  },
  stepNum: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.2s',
  },
  stepDivider: {
    width: 1, margin: '14px 0',
    background: 'rgba(255,255,255,0.08)',
  },

  /* Form body */
  body: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  scrollArea: {
    flex: 1, overflowY: 'auto', padding: '22px 24px',
  },
  inputSm: {
    fontSize: 13, padding: '9px 12px',
  },

  /* Linked question */
  linkedBanner: {
    padding: '13px 15px',
    borderRadius: 12,
    background: 'linear-gradient(135deg,rgba(34,168,75,0.05),rgba(16,90,38,0.03))',
    border: '1.5px solid rgba(34,168,75,0.2)',
  },
  linkedBannerHeader: {
    display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7,
  },
  linkedDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'linear-gradient(135deg,#1A7A35,#34C961)',
    display: 'inline-block', flexShrink: 0,
    boxShadow: '0 0 6px rgba(34,168,75,0.5)',
  },
  linkedLabel: {
    fontSize: 10.5, fontWeight: 800,
    fontFamily: "'Montserrat',sans-serif",
    color: '#1A7A35', letterSpacing: '0.07em', textTransform: 'uppercase',
  },
  linkedMeta: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 12px',
    fontSize: 12, color: 'var(--tx-muted)', fontFamily: "'Nunito',sans-serif",
    marginBottom: 8,
  },
  linkedSep: {
    width: 3, height: 3, borderRadius: '50%',
    background: 'var(--border-md)', display: 'inline-block',
  },
  linkedQuestion: {
    fontSize: 12.5, fontWeight: 600, color: 'var(--tx)',
    fontFamily: "'Nunito',sans-serif",
    fontStyle: 'italic', margin: 0,
    padding: '7px 10px',
    background: 'rgba(34,168,75,0.07)',
    borderRadius: 8, lineHeight: 1.55,
    borderLeft: '3px solid rgba(34,168,75,0.4)',
  },

  /* Drop zone */
  dropZone: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, padding: '26px 20px',
    border: '2px dashed', borderRadius: 12,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  dropIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg,rgba(26,122,53,0.1),rgba(52,201,97,0.05))',
    border: '1px solid rgba(34,168,75,0.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  dropTitle: {
    fontSize: 13, fontWeight: 700,
    fontFamily: "'Montserrat',sans-serif",
    color: 'var(--g700)', margin: 0,
  },
  dropSub: {
    fontSize: 11.5, color: 'var(--tx-faint)',
    fontFamily: "'Nunito',sans-serif", margin: 0,
  },
  fileChip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 9px', borderRadius: 7,
    background: 'var(--g50)', border: '1px solid var(--g200)',
    fontSize: 11.5, fontWeight: 600, color: 'var(--g700)',
    fontFamily: "'Nunito',sans-serif",
  },
  fileRemove: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--tx-faint)', padding: 0,
    display: 'flex', alignItems: 'center',
    transition: 'color 0.15s', flexShrink: 0,
  },

  /* Review */
  reviewCard: {
    borderRadius: 14, overflow: 'hidden',
    border: '1.5px solid var(--border)',
    background: '#fff', boxShadow: 'var(--sh-xs)',
  },
  reviewCardHead: {
    padding: '12px 16px',
    background: 'linear-gradient(135deg,#EFF9F4,#DCF2E6)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  reviewBody: {
    padding: '4px 16px 8px',
  },
  reviewNote: {
    display: 'flex', gap: 9, alignItems: 'flex-start',
    padding: '10px 13px', borderRadius: 10,
    background: 'rgba(34,168,75,0.05)',
    border: '1px solid rgba(34,168,75,0.18)',
  },

  /* Footer */
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-soft)', flexShrink: 0,
  },
};
