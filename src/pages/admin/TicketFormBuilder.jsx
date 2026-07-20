import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { Plus, Trash2, Save, MoveUp, MoveDown, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketFormBuilder() {
  const axiosSecure = useAxiosSecure();
  const [schema, setSchema] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosSecure.get('/ticket-forms')
      .then(res => {
        const s = res.data.schema;
        setSchema(s);
        setFields(s?.fields || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [axiosSecure]);

  const addField = (type) => {
    const newField = {
      fieldId: `field_${Date.now()}`,
      label: `New ${type.toUpperCase()} Field`,
      type,
      required: false,
      colSpan: 2,
      order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const updateField = (idx, key, val) => {
    const updated = [...fields];
    updated[idx][key] = val;
    setFields(updated);
  };

  const removeField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const moveField = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === fields.length - 1)) return;
    const updated = [...fields];
    const temp = updated[idx];
    updated[idx] = updated[idx + direction];
    updated[idx + direction] = temp;
    setFields(updated);
  };

  const handleSave = async () => {
    try {
      await axiosSecure.post('/ticket-forms', {
        name: schema?.name || 'Default Dynamic Ticket Form',
        fields,
      });
      toast.success('Form schema saved & published!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save form schema');
    }
  };

  return (
    <Layout isAdmin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <FileCode className="text-emerald-600" /> Ticket Dynamic Form Builder
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
            Configure dynamic fields, required validations, and order for ticket submission forms.
          </p>
        </div>
        <button onClick={handleSave} className="btn-primary-green inline-flex items-center gap-2 text-xs px-4 py-2">
          <Save size={14} /> Save Schema
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Field Palette */}
        <div className="glass-card p-4 rounded-xl space-y-3 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Add Field Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {['text', 'number', 'date', 'textarea', 'dropdown', 'gps'].map((t) => (
              <button
                key={t}
                onClick={() => addField(t)}
                className="px-3 py-2 text-xs font-bold rounded-lg border bg-white/50 hover:bg-emerald-50 hover:border-emerald-300 text-left capitalize flex items-center gap-1.5 transition-all"
                style={{ borderColor: 'var(--border)' }}
              >
                <Plus size={12} className="text-emerald-600" /> {t}
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields Canvas */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading schema...</div>
          ) : fields.length === 0 ? (
            <div className="glass-card p-12 text-center text-xs text-gray-500 rounded-xl">
              No dynamic fields added yet. Click a field type on the left to start building!
            </div>
          ) : (
            fields.map((field, idx) => (
              <div key={field.fieldId || idx} className="glass-card p-4 rounded-xl space-y-3 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-700">
                    Field #{idx + 1} — {field.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveField(idx, -1)} className="p-1 hover:bg-gray-200 rounded">
                      <MoveUp size={14} />
                    </button>
                    <button onClick={() => moveField(idx, 1)} className="p-1 hover:bg-gray-200 rounded">
                      <MoveDown size={14} />
                    </button>
                    <button onClick={() => removeField(idx)} className="p-1 hover:bg-red-100 text-red-600 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Label</label>
                    <input
                      type="text"
                      value={field.label || ''}
                      onChange={(e) => updateField(idx, 'label', e.target.value)}
                      className="input-field w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Placeholder</label>
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={(e) => updateField(idx, 'placeholder', e.target.value)}
                      className="input-field w-full text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => updateField(idx, 'required', e.target.checked)}
                      />
                      Required
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
