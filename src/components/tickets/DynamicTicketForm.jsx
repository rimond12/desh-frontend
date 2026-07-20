import React from 'react';

export default function DynamicTicketForm({ schema, values = {}, onChange }) {
  if (!schema || !schema.fields || schema.fields.length === 0) {
    return null;
  }

  const handleFieldChange = (fieldId, val) => {
    onChange({ ...values, [fieldId]: val });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {schema.fields.map((field) => {
        const colSpanClass = field.colSpan === 1 ? 'col-span-1' : 'col-span-1 md:col-span-2';

        return (
          <div key={field.fieldId} className={colSpanClass}>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-2)' }}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                value={values[field.fieldId] || ''}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                className="input-field w-full text-xs"
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={values[field.fieldId] || ''}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                className="input-field w-full text-xs"
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                value={values[field.fieldId] || ''}
                required={field.required}
                onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                className="input-field w-full text-xs"
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                rows={3}
                value={values[field.fieldId] || ''}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                className="input-field w-full text-xs"
              />
            )}

            {field.type === 'dropdown' && (
              <select
                value={values[field.fieldId] || ''}
                required={field.required}
                onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                className="input-field w-full text-xs"
              >
                <option value="">Select an option</option>
                {field.options?.map((opt, oIdx) => (
                  <option key={oIdx} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'gps' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Latitude, Longitude"
                  value={values[field.fieldId] || ''}
                  onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                  className="input-field w-full text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        handleFieldChange(field.fieldId, `${pos.coords.latitude}, ${pos.coords.longitude}`);
                      });
                    }
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white text-xs rounded font-semibold whitespace-nowrap hover:bg-emerald-700"
                >
                  GPS
                </button>
              </div>
            )}

            {field.helpText && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--tx-muted)' }}>
                {field.helpText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
