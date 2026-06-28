import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import MapSyncField from '../../components/MapSyncField.jsx';
import { Plus, X } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: `1.5px solid ${hasError ? '#FCA5A5' : 'var(--border)'}`,
  background: hasError ? '#FFF5F5' : '#fff',
  color: 'var(--tx)',
  fontSize: 13.5,
  fontFamily: 'Nunito,sans-serif',
  fontWeight: 600,
  outline: 'none',
  transition: 'all 0.18s',
  boxShadow: hasError ? '0 0 0 3px rgba(239,68,68,0.08)' : 'var(--sh-xs)',
});

function FieldLabel({ label, required }) {
  return (
    <label style={{
      display: 'block', fontSize: 10.5, fontWeight: 800,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--tx-muted)', fontFamily: 'Montserrat,sans-serif', marginBottom: 6,
    }}>
      {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
  );
}

function FieldError({ error }) {
  if (!error) return null;
  return (
    <p style={{ fontSize: 11.5, fontWeight: 700, color: '#EF4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      ⚠ {error}
    </p>
  );
}

function Divider({ label }) {
  return (
    <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--tx-faint)',
          fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
    </div>
  );
}


// ─── Repeatable Field Input Component ────────────────────────────────────────
function RepeatableInput({ field, regKey, register, setValue, getValues, error, commonProps, categories }) {
  const [values, setValues] = useState(['']);

  // Load initial values from react-hook-form on mount
  useEffect(() => {
    const val = getValues(regKey);
    if (val) {
      if (Array.isArray(val)) {
        setValues(val.length > 0 ? val : ['']);
      } else if (typeof val === 'string') {
        // Use semicolon to split regular single-string fields
        const isArrayField = regKey === 'collaboratorEmails' || regKey === 'ownerEmails';
        const separator = isArrayField ? ',' : ';';
        const split = val.split(separator).map(e => e.trim()).filter(Boolean);
        setValues(split.length > 0 ? split : ['']);
      }
    } else {
      setValues(['']);
    }
  }, [getValues, regKey]);

  // Synchronize values to react-hook-form whenever they change
  const updateFormValue = (newValues) => {
    setValues(newValues);
    setValue(regKey, newValues, { shouldValidate: true });
  };

  const handleValueChange = (index, val) => {
    const newValues = [...values];
    newValues[index] = val;
    updateFormValue(newValues);
  };

  const addField = () => {
    updateFormValue([...values, '']);
  };

  const removeField = (index) => {
    if (values.length <= 1) {
      updateFormValue(['']);
    } else {
      const newValues = values.filter((_, i) => i !== index);
      updateFormValue(newValues);
    }
  };

  useEffect(() => {
    register(regKey, { required: field.required ? `${field.label} is required` : false });
  }, [register, regKey, field.required, field.label]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      {values.map((val, idx) => {
        let inputElement = null;

        if (field.inputType === 'dropdown') {
          const isCategories = field.fieldKey === 'projectType';
          inputElement = (
            <select
              value={val}
              onChange={e => handleValueChange(idx, e.target.value)}
              className="pif-input"
              style={{ ...commonProps.style, flex: 1, cursor: 'pointer' }}
            >
              <option value="">— Select —</option>
              {isCategories
                ? categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
                : (field.options || []).map(opt => {
                    const v = opt.split(' — ')[0];
                    return <option key={v} value={v}>{opt}</option>;
                  })
              }
            </select>
          );
        } else if (field.inputType === 'textarea') {
          inputElement = (
            <textarea
              value={val}
              onChange={e => handleValueChange(idx, e.target.value)}
              className="pif-input"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              rows={3}
              style={{ ...commonProps.style, flex: 1, resize: 'vertical', minHeight: 80 }}
            />
          );
        } else {
          inputElement = (
            <input
              type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
              value={val}
              onChange={e => handleValueChange(idx, e.target.value)}
              className="pif-input"
              style={{ ...commonProps.style, flex: 1 }}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            />
          );
        }

        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {inputElement}
            {idx === values.length - 1 ? (
              <button
                type="button"
                onClick={addField}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'linear-gradient(135deg, #1A7A35, #22A84B)',
                  color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(34,168,75,0.2)',
                  transition: 'all 0.15s',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => removeField(idx)}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1.5px solid rgba(239,68,68,0.2)',
                  color: '#EF4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Other Professionals / Engineers repeatable section ─────────────────────
function OtherProfessionalsSection({ register, setValue, getValues, errors }) {
  const [professionals, setProfessionals] = useState([]);

  // Load initial values from react-hook-form on mount
  useEffect(() => {
    const val = getValues('extra_otherProfessionals');
    if (Array.isArray(val)) {
      setProfessionals(val);
    }
  }, [getValues]);

  const updateProfessionals = (newProfs) => {
    setProfessionals(newProfs);
    setValue('extra_otherProfessionals', newProfs, { shouldValidate: true });
  };

  const addProfessional = () => {
    updateProfessionals([
      ...professionals,
      { name: '', designation: '', organization: '', mobile: '', email: '' }
    ]);
  };

  const removeProfessional = (index) => {
    const newProfs = professionals.filter((_, i) => i !== index);
    updateProfessionals(newProfs);
  };

  const handleFieldChange = (index, fieldKey, val) => {
    const newProfs = [...professionals];
    newProfs[index] = { ...newProfs[index], [fieldKey]: val };
    updateProfessionals(newProfs);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <Divider label="Other Professionals / Engineers" />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
        {professionals.map((prof, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-soft)',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => removeProfessional(idx)}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444', borderRadius: 8, padding: '4px 8px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >
              ✕ Remove
            </button>

            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--g700)', marginBottom: 12, fontFamily: 'Montserrat,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Professional #{idx + 1}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel label="Full Name" />
                <input
                  type="text"
                  value={prof.name || ''}
                  onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                  placeholder="e.g. Engr. John Doe"
                  className="pif-input"
                  style={inputStyle(false)}
                />
              </div>
              <div>
                <FieldLabel label="Designation" />
                <input
                  type="text"
                  value={prof.designation || ''}
                  onChange={e => handleFieldChange(idx, 'designation', e.target.value)}
                  placeholder="e.g. Mechanical Engineer"
                  className="pif-input"
                  style={inputStyle(false)}
                />
              </div>
              <div>
                <FieldLabel label="Organization / Company" />
                <input
                  type="text"
                  value={prof.organization || ''}
                  onChange={e => handleFieldChange(idx, 'organization', e.target.value)}
                  placeholder="e.g. Apex Engineering Ltd."
                  className="pif-input"
                  style={inputStyle(false)}
                />
              </div>
              <div>
                <FieldLabel label="Mobile" />
                <input
                  type="text"
                  value={prof.mobile || ''}
                  onChange={e => handleFieldChange(idx, 'mobile', e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="pif-input"
                  style={inputStyle(false)}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <FieldLabel label="Email Address" />
                <input
                  type="text"
                  value={prof.email || ''}
                  onChange={e => handleFieldChange(idx, 'email', e.target.value)}
                  placeholder="e.g. john@apex.com"
                  className="pif-input"
                  style={inputStyle(false)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addProfessional}
        style={{
          marginTop: 14,
          padding: '10px 20px',
          borderRadius: 10,
          background: 'linear-gradient(135deg, #1A7A35, #22A84B)',
          color: '#fff',
          border: 'none',
          fontWeight: 800,
          fontSize: 12,
          fontFamily: 'Montserrat,sans-serif',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(34,168,75,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.18s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      >
        <Plus size={14} strokeWidth={2.5} /> Add Other Professional / Engineer
      </button>
    </div>
  );
}

// ─── Dynamic field renderer ──────────────────────────────────────────────────
function DynamicField({
  field, value, onChange, error,
  register, categories, isExtraField, errors,
  setValue, getValues
}) {
  const regKey = isExtraField ? `extra_${field.fieldKey}` : field.fieldKey;
  const hasError = !!error;

  const commonProps = {
    className: 'pif-input',
    style: inputStyle(hasError),
  };

  let input = null;

  const isRepeatableField = field.isRepeatable || field.fieldKey === 'collaboratorEmails' || field.fieldKey === 'ownerEmails';

  if (isRepeatableField) {
    input = (
      <RepeatableInput
        field={field}
        regKey={regKey}
        register={register}
        setValue={setValue}
        getValues={getValues}
        error={error}
        commonProps={commonProps}
        categories={categories}
      />
    );
  } else if (field.inputType === 'dropdown') {
    // projectType uses categories; projectSize uses built-in options
    const isCategories = field.fieldKey === 'projectType';
    input = (
      <select
        {...register(regKey, { required: field.required ? `${field.label} is required` : false })}
        {...commonProps}
        style={{ ...commonProps.style, cursor: 'pointer' }}
      >
        <option value="">— Select —</option>
        {isCategories
          ? categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)
          : (field.options || []).map(opt => {
            const val = opt.split(' — ')[0]; // e.g. "Small"
            return <option key={val} value={val}>{opt}</option>;
          })
        }
      </select>
    );
  } else if (field.inputType === 'textarea') {
    input = (
      <textarea
        {...register(regKey, { required: field.required ? `${field.label} is required` : false })}
        {...commonProps}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...commonProps.style, resize: 'vertical', minHeight: 80 }}
      />
    );
  } else if (field.inputType === 'date') {
    input = (
      <input
        type="date"
        {...register(regKey, { required: field.required ? `${field.label} is required` : false })}
        {...commonProps}
      />
    );
  } else if (field.inputType === 'number') {
    input = (
      <input
        type="number"
        step="any"
        {...register(regKey, {
          required: field.required ? `${field.label} is required` : false,
          valueAsNumber: true,
          validate: v => isExtraField ? true : (isNaN(v) || v <= 0 ? `${field.label} must be a positive number` : true),
        })}
        {...commonProps}
        placeholder={field.placeholder}
      />
    );
  } else {
    // text / gps (gps is handled separately in step renderer, but fallback here)
    const extraValidation = field.fieldKey === 'email'
      ? { validate: v => !v || isEmail(v) ? true : 'Invalid email format' }
      : {};
    input = (
      <input
        type="text"
        {...register(regKey, {
          required: field.required ? `${field.label} is required` : false,
          ...extraValidation,
        })}
        {...commonProps}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <div style={field.colSpan === 2 || isRepeatableField ? { gridColumn: 'span 2' } : {}}>
      <FieldLabel label={field.label} required={field.required} />
      {input}
      <FieldError error={error} />

      {/* Sub-fields */}
      {(field.subFields || []).length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: '2px solid var(--g200)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {field.subFields.map(sf => {
            const sfKey = `extra_${sf.fieldKey}`;
            const sfErr = errors?.[sfKey];
            return (
              <div key={sf.fieldKey}>
                <FieldLabel label={sf.label} required={sf.required} />
                <input
                  type={sf.inputType === 'number' ? 'number' : sf.inputType === 'date' ? 'date' : 'text'}
                  {...register(sfKey, {
                    required: sf.required ? `${sf.label} is required` : false,
                  })}
                  className="pif-input"
                  placeholder={sf.placeholder}
                  style={inputStyle(!!sfErr)}
                />
                <FieldError error={sfErr ? (sfErr.message || `${sf.label} is required`) : null} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProjectInfoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { dbUser } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formSchema, setFormSchema] = useState(null);

  // GPS + Address state (managed separately for bidirectional map sync)
  const [gpsValue, setGpsValue] = useState('');
  const [addressValue, setAddressValue] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({ mode: 'onChange' });

  // ── Fetch schema + categories + project data on mount ─────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [schemaRes, catRes] = await Promise.all([
          axiosSecure.get('/form-schema'),
          axiosSecure.get('/categories'),
        ]);
        setFormSchema(schemaRes.data.schema);
        setCategories(catRes.data.categories || []);

        if (id) {
          const projRes = await axiosSecure.get(`/projects/${id}`);
          const p = projRes.data.project;
          if (p) {
            const isCreator = dbUser && String(p.userId?._id || p.userId) === String(dbUser._id);
            const isAdmin = dbUser?.role === 'admin';
            const isReviewerOrAssessor = dbUser?.role === 'reviewer' || dbUser?.role === 'desh_reviewer' || dbUser?.role === 'desh_assessor';
            if (!isCreator && !isAdmin && !isReviewerOrAssessor) {
              toast.error('You are not authorized to edit this project.');
              navigate(`/projects/${id}`);
              return;
            }
            // Core fields
            const coreMap = {
              projectName: p.projectName || p.title || '',
              projectType: p.projectType || '',
              projectSize: p.projectSize || '',
              address: p.address || '',
              postCode: p.postCode || '',
              gpsCoordinates: p.gpsCoordinates || '',
              siteArea: p.siteArea ?? '',
              totalBuiltUpArea: p.totalBuiltUpArea ?? '',
              constructionStartDate: p.constructionStartDate ? p.constructionStartDate.split('T')[0] : '',
              constructionEndDate: p.constructionEndDate ? p.constructionEndDate.split('T')[0] : '',
              engineerName: p.engineerName || '',
              designation: p.designation || '',
              organization: p.organization || '',
              officeAddress: p.officeAddress || '',
              officePostCode: p.officePostCode || '',
              telephone: p.telephone || '',
              mobile: p.mobile || '',
              email: p.email || '',
              collaboratorEmails: p.collaboratorEmails || [],
              ownerEmails: p.ownerEmails || [],
              projectCoordinatorDetails: p.projectCoordinatorDetails || '',
              architectName: p.architectName || '',
              iabMembershipNo: p.iabMembershipNo || '',
              greenBuildingConsultantDetails: p.greenBuildingConsultantDetails || '',
              sredaRegistrationNumber: p.sredaRegistrationNumber || '',
            };
            Object.entries(coreMap).forEach(([k, v]) => setValue(k, v));
            setGpsValue(p.gpsCoordinates || '');
            setAddressValue(p.address || '');

            // Extra fields
            if (p.extraFields) {
              Object.entries(p.extraFields).forEach(([k, v]) => setValue(`extra_${k}`, v));
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, axiosSecure, setValue, dbUser, navigate]);

  // ── Keep GPS/address synced with react-hook-form ──────────────────────────
  const handleGpsChange = useCallback((val) => {
    setGpsValue(val);
    setValue('gpsCoordinates', val, { shouldValidate: true });
  }, [setValue]);

  const handleAddressChange = useCallback((val) => {
    setAddressValue(val);
    setValue('address', val, { shouldValidate: true });
  }, [setValue]);

  // ── Collect field keys for the current step (for trigger()) ──────────────
  const getStepFieldKeys = useCallback((stepNum) => {
    if (!formSchema) return [];
    const stepData = formSchema.steps.find(s => s.stepNum === stepNum);
    if (!stepData) return [];
    const keys = [];
    stepData.groups.forEach(g => {
      g.fields.forEach(f => {
        if (f.required) {
          keys.push(f.isCore ? f.fieldKey : `extra_${f.fieldKey}`);
          (f.subFields || []).forEach(sf => { if (sf.required) keys.push(`extra_${sf.fieldKey}`); });
        }
      });
    });
    return keys;
  }, [formSchema]);

  const handleNext = async () => {
    const currentStep = steps[step - 1];
    if (!currentStep) return;
    const keys = getStepFieldKeys(currentStep.stepNum);
    // Also validate GPS/address manually
    let gpsOk = true, addrOk = true;
    const stepData = currentStep;
    if (stepData) {
      stepData.groups.forEach(g => g.fields.forEach(f => {
        if (f.isMapField && f.required && !gpsValue.trim()) gpsOk = false;
        if (f.isAddressField && f.required && !addressValue.trim()) addrOk = false;
      }));
    }
    if (!gpsOk || !addrOk) {
      toast.error('Please fill all required fields before continuing.');
      return;
    }
    const isValid = await trigger(keys);
    if (isValid) setStep(p => p + 1);
    else toast.error('Please fix the errors before continuing.');
  };

  const handleBack = () => setStep(p => p - 1);

  const buildPayload = (data) => {
    const extraFields = {};
    const coreFields = {};
    Object.entries(data).forEach(([k, v]) => {
      let val = v;
      if (Array.isArray(v)) {
        val = v.map(e => typeof e === 'string' ? e.trim() : e).filter(Boolean);
      }
      if (k.startsWith('extra_')) extraFields[k.replace('extra_', '')] = val;
      else coreFields[k] = val;
    });
    return {
      ...coreFields,
      gpsCoordinates: gpsValue,
      address: addressValue,
      extraFields,
    };
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await axiosSecure.patch(`/projects/${id}/info`, buildPayload(data));
      toast.success('Project registered successfully!');
      navigate(`/projects/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit details');
    } finally { setSaving(false); }
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      await axiosSecure.patch(`/projects/${id}/info`, buildPayload(getValues()));
      toast.success('Draft saved.');
      navigate(`/projects/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft');
    } finally { setSaving(false); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || !formSchema) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3.5px solid var(--g200)', borderTopColor: 'var(--g500)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--tx-faint)', fontWeight: 600, fontSize: 13 }}>Loading form…</p>
        </div>
      </Layout>
    );
  }

  const isReviewerOrAssessor = dbUser?.role === 'reviewer' || dbUser?.role === 'desh_reviewer' || dbUser?.role === 'desh_assessor';
  const steps = formSchema.steps.filter(s => !(isReviewerOrAssessor && s.stepNum === 2));
  const currentStepData = steps[step - 1] || steps[0];
  const progressPercent = Math.round((step / steps.length) * 100);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      <style>{`
        .pif-input:focus {
          border-color: var(--g400) !important;
          box-shadow: 0 0 0 3px rgba(34,168,75,0.14) !important;
          background: #fff !important;
        }
        .pif-input::placeholder { color: var(--tx-faint); font-weight: 500; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pif-step-panel { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 4px 32px' }}>

        {/* ── Page Header ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, marginBottom: 24, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,var(--g800),var(--g500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: '0 4px 12px rgba(34,168,75,0.3)',
              }}>🏢</div>
              <h1 style={{
                fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                fontSize: 22, color: 'var(--tx)', margin: 0, letterSpacing: '-0.02em',
              }}>Project Setup &amp; Registration</h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--tx-faint)', fontWeight: 600, marginLeft: 46 }}>
              Complete all {steps.length} steps to register your green building project.
            </p>
          </div>
          <button
            onClick={saveAsDraft}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(34,168,75,0.08)', border: '1.5px solid rgba(34,168,75,0.3)',
              color: 'var(--g700)', fontWeight: 700, fontSize: 13,
              fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
              transition: 'all 0.18s', opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,168,75,0.15)'; e.currentTarget.style.borderColor = 'var(--g400)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,168,75,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,168,75,0.3)'; }}
          >
            💾 Save Draft
          </button>
        </div>

        {/* ── Step Indicator ── */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          background: '#fff', borderRadius: 14,
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--sh-sm)', overflow: 'hidden',
        }}>
          {steps.map((s, i) => {
            const isDone = step > (i + 1);
            const isCurrent = step === (i + 1);
            return (
              <div key={s.stepNum} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 16px',
                borderRight: i < steps.length - 1 ? '1.5px solid var(--border)' : 'none',
                background: isCurrent
                  ? 'linear-gradient(135deg,var(--g50),rgba(34,168,75,0.06))'
                  : isDone ? 'var(--bg-soft)' : '#fff',
                transition: 'background 0.25s',
                position: 'relative',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isDone ? 16 : 14,
                  background: isDone
                    ? 'linear-gradient(135deg,var(--g700),var(--g500))'
                    : isCurrent
                      ? 'linear-gradient(135deg,var(--g600),var(--g400))'
                      : 'var(--bg-muted)',
                  color: isDone || isCurrent ? '#fff' : 'var(--tx-faint)',
                  fontWeight: 900, fontFamily: 'Montserrat,sans-serif',
                  boxShadow: isCurrent ? '0 3px 10px rgba(34,168,75,0.35)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? '✓' : s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 800, fontFamily: 'Montserrat,sans-serif',
                    color: isCurrent ? 'var(--g800)' : isDone ? 'var(--g600)' : 'var(--tx-faint)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    Step {i + 1}: {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600, marginTop: 1 }}>
                    {s.sub}
                  </div>
                </div>
                {isCurrent && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg,var(--g600),var(--g400))',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Progress Bar ── */}
        <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-muted)', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg,var(--g700),var(--g400))',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 1px 6px rgba(34,168,75,0.4)',
          }} />
        </div>

        {/* ── Form Card ── */}
        <div style={{
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: 16, boxShadow: 'var(--sh-md)', overflow: 'hidden',
        }}>

          {/* Card Header */}
          <div style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg,var(--g50),rgba(34,168,75,0.04))',
            borderBottom: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,var(--g700),var(--g500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, boxShadow: '0 2px 8px rgba(34,168,75,0.3)',
            }}>
              {currentStepData.icon}
            </span>
            <div>
              <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--g800)', margin: 0 }}>
                {currentStepData.label}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--tx-faint)', margin: 0, fontWeight: 600 }}>
                {currentStepData.sub}
              </p>
            </div>
            <div style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700,
              color: 'var(--g700)', background: 'rgba(34,168,75,0.1)',
              padding: '3px 10px', borderRadius: 99, fontFamily: 'Montserrat,sans-serif',
            }}>
              Step {step} of {steps.length}
            </div>
          </div>

          {/* Card Body */}
          <div style={{ padding: '28px 24px' }}>
            <div className="pif-step-panel" key={step}>
              {renderStep({
                stepData: currentStepData,
                register,
                errors,
                categories,
                gpsValue, addressValue,
                handleGpsChange, handleAddressChange,
                setValue, getValues
              })}

              {step === 2 && (
                <OtherProfessionalsSection
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  errors={errors}
                />
              )}
            </div>
          </div>

          {/* ── Navigation Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1.5px solid var(--border)',
            background: 'var(--bg-soft)',
          }}>
            {step > 1 ? (
              <button type="button" onClick={handleBack} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                background: '#fff', border: '1.5px solid var(--border)',
                color: 'var(--tx-muted)', fontWeight: 700, fontSize: 13,
                fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--g400)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >← Back</button>
            ) : (
              <button type="button" onClick={() => navigate(`/projects/${id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                background: '#fff', border: '1.5px solid var(--border)',
                color: 'var(--tx-muted)', fontWeight: 700, fontSize: 13,
                fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >✕ Cancel</button>
            )}

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {steps.map((s, i) => (
                <div key={s.stepNum} style={{
                  width: step === (i + 1) ? 22 : 8, height: 8, borderRadius: 99,
                  background: step > (i + 1) ? 'var(--g500)'
                    : step === (i + 1) ? 'linear-gradient(90deg,var(--g600),var(--g400))' : 'var(--bg-muted)',
                  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: step === s.stepNum ? '0 1px 6px rgba(34,168,75,0.4)' : 'none',
                }} />
              ))}
            </div>

            {step < steps.length ? (
              <button type="button" onClick={handleNext} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
                background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 13,
                fontFamily: 'Montserrat,sans-serif',
                boxShadow: '0 4px 14px rgba(34,168,75,0.35)',
                transition: 'all 0.18s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(34,168,75,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(34,168,75,0.35)'; }}
              >
                Continue →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit(onSubmit)} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 10,
                cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'var(--bg-muted)' : 'linear-gradient(135deg,var(--g800),var(--g500))',
                border: 'none', color: saving ? 'var(--tx-faint)' : '#fff',
                fontWeight: 800, fontSize: 13, fontFamily: 'Montserrat,sans-serif',
                boxShadow: saving ? 'none' : '0 4px 16px rgba(34,168,75,0.4)',
                transition: 'all 0.2s', opacity: saving ? 0.7 : 1,
              }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(34,168,75,0.5)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = saving ? 'none' : '0 4px 16px rgba(34,168,75,0.4)'; }}
              >
                {saving ? '⏳ Registering…' : '✓ Submit & Register'}
              </button>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}

// ─── Step renderer — pure function, renders groups and fields ────────────────
function renderStep({
  stepData, register, errors, categories,
  gpsValue, addressValue, handleGpsChange, handleAddressChange,
  setValue, getValues
}) {
  // Find isMapField and isAddressField in this step
  let mapField = null;
  let addrField = null;
  stepData.groups.forEach(g => g.fields.forEach(f => {
    if (f.isMapField) mapField = f;
    if (f.isAddressField) addrField = f;
  }));

  const mapSyncRendered = { done: false };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {stepData.groups.map((group, gi) => {
        const fields = [...group.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        return (
          <div key={gi}>
            {group.dividerLabel && <Divider label={group.dividerLabel} />}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: group.dividerLabel ? 14 : 0 }}>
              {fields.map(field => {
                // GPS map field — render MapSyncField spanning full width (covers GPS + address)
                if (field.isMapField && !mapSyncRendered.done) {
                  mapSyncRendered.done = true;
                  return (
                    <MapSyncField
                      key="map-sync"
                      gpsValue={gpsValue}
                      addressValue={addressValue}
                      onGpsChange={handleGpsChange}
                      onAddressChange={handleAddressChange}
                      gpsError={errors.gpsCoordinates ? { message: errors.gpsCoordinates.message || 'GPS Coordinates is required' } : null}
                      addressError={errors.address ? { message: errors.address.message || 'Site Address is required' } : null}
                      gpsLabel={mapField?.label || 'GPS Coordinates'}
                      addressLabel={addrField?.label || 'Site Address'}
                      gpsPlaceholder={mapField?.placeholder || 'e.g. 23.8103° N, 90.4125° E'}
                      addressPlaceholder={addrField?.placeholder || 'Street number, Area, City'}
                      gpsRequired={mapField?.required ?? true}
                      addressRequired={addrField?.required ?? true}
                      gpsRegisterProps={register('gpsCoordinates', { required: (mapField?.required ?? true) ? 'GPS Coordinates is required' : false })}
                      addressRegisterProps={register('address', { required: (addrField?.required ?? true) ? 'Site Address is required' : false })}
                    />
                  );
                }

                // Skip the address field — it's already rendered inside MapSyncField
                if (field.isAddressField && mapField) return null;

                const isExtraField = !field.isCore;
                const regKey = isExtraField ? `extra_${field.fieldKey}` : field.fieldKey;
                const fieldErr = errors[regKey];

                return (
                  <DynamicField
                    key={field.fieldKey}
                    field={field}
                    value={undefined}
                    error={fieldErr ? (fieldErr.message || `${field.label} is required`) : null}
                    register={register}
                    categories={categories}
                    isExtraField={isExtraField}
                    errors={errors}
                    setValue={setValue}
                    getValues={getValues}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
