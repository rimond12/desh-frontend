import React, { useState } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketResponseForm({ onSubmit, loading = false }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      return toast.error('Response content cannot be empty');
    }
    onSubmit({ text, files });
    setText('');
    setFiles([]);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-4 rounded-xl space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700">Submit Official Response / Evidence</h4>

      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Provide technical clarification, findings, or detailed response to this ticket..."
        className="input-field w-full text-xs"
        required
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-50 text-purple-700 font-medium">
              <Paperclip size={12} /> {f.name}
              <button type="button" onClick={() => removeFile(i)} className="hover:text-red-600">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800">
          <Paperclip size={14} /> Attach Evidence / File
          <input type="file" multiple onChange={handleFileChange} className="hidden" />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary-green inline-flex items-center gap-1.5 text-xs px-4 py-2"
        >
          <Send size={13} /> {loading ? 'Submitting...' : 'Submit Response'}
        </button>
      </div>
    </form>
  );
}
