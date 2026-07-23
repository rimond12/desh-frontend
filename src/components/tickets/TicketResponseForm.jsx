import React, { useState } from 'react';
import { Send, Paperclip, X, MessageSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketResponseForm({ onSubmit, loading = false }) {
  const [text,  setText]  = useState('');
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
  };
  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return toast.error('Response cannot be empty');
    setIsSubmitting(true);
    try {
      await onSubmit({ text, files });
      setText('');
      setFiles([]);
    } catch {
      // error handled by parent onSubmit
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || loading;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: 'var(--sh-xs)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(109,40,217,0.03))',
        borderBottom: '1px solid rgba(139,92,246,0.15)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(139,92,246,0.12)',
          border: '1px solid rgba(139,92,246,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageSquare size={14} color="#7C3AED" />
        </div>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: '#7C3AED', margin: 0, fontFamily: "'Montserrat',sans-serif" }}>
            Submit Official Response
          </p>
          <p style={{ fontSize: 11, color: 'var(--tx-faint)', margin: 0, fontFamily: "'Nunito',sans-serif" }}>
            Provide technical clarification or evidence
          </p>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          rows={4}
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your detailed response, findings, or clarification here…"
          style={{
            width: '100%', resize: 'vertical', minHeight: 100,
            padding: '10px 12px',
            border: '1.5px solid var(--border-md)',
            borderRadius: 10, fontSize: 13,
            fontFamily: "'Nunito',sans-serif", fontWeight: 500,
            color: 'var(--tx)', background: busy ? 'var(--bg-subtle)' : 'var(--bg-soft)',
            outline: 'none', transition: 'all 0.18s', lineHeight: 1.65,
            opacity: busy ? 0.7 : 1,
          }}
          onFocus={(e) => { if (!busy) { e.target.style.borderColor = '#8B5CF6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; } }}
          onBlur={(e)  => { e.target.style.borderColor = 'var(--border-md)'; e.target.style.background = 'var(--bg-soft)'; e.target.style.boxShadow = 'none'; }}
          required
        />

        {/* File chips */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {files.map((f, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 9px', borderRadius: 7,
                fontSize: 11.5, fontWeight: 600,
                fontFamily: "'Nunito',sans-serif",
                background: 'rgba(139,92,246,0.08)',
                color: '#7C3AED',
                border: '1px solid rgba(139,92,246,0.2)',
              }}>
                <Paperclip size={10} />
                <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                {!busy && (
                  <button type="button" onClick={() => removeFile(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A78BFA', padding: 0, display: 'flex' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#DC2626'}
                    onMouseOut={(e)  => e.currentTarget.style.color = '#A78BFA'}
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, borderTop: '1px solid var(--border)',
        }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            fontFamily: "'Montserrat',sans-serif",
            color: busy ? 'var(--tx-faint)' : 'var(--tx-muted)',
            cursor: busy ? 'not-allowed' : 'pointer',
            padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-soft)',
            opacity: busy ? 0.6 : 1,
            transition: 'all 0.18s',
          }}
          onMouseOver={(e) => { if (!busy) { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.background = '#fff'; } }}
          onMouseOut={(e)  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-soft)'; }}
          >
            <Paperclip size={13} /> Attach Files
            <input type="file" multiple disabled={busy} onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          <button
            type="submit"
            disabled={busy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 20px', borderRadius: 10,
              background: busy ? '#A78BFA' : 'linear-gradient(135deg,#7C3AED,#8B5CF6)',
              color: '#fff', border: 'none',
              fontSize: 12.5, fontWeight: 700,
              fontFamily: "'Montserrat',sans-serif",
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: busy ? 'none' : '0 4px 14px rgba(124,58,237,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {busy ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 0.65s linear infinite' }} /> Submitting Response…
              </>
            ) : (
              <>
                <Send size={13} /> Submit Response
              </>
            )}
          </button>
        </div>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
