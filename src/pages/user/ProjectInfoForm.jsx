import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

// ─── Zod Schema ───────────────────────────────────────────────────
const formSchema = z.object({
  projectName: z.string().min(1, 'Project Name is required'),
  projectType: z.string().min(1, 'Project Type is required'),
  projectSize: z.string().min(1, 'Project Size is required'),
  address: z.string().min(1, 'Address is required'),
  postCode: z.string().min(1, 'Post Code is required'),
  gpsCoordinates: z.string().min(1, 'GPS Coordinates is required'),
  siteArea: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Site Area must be a number' }).positive('Site Area must be positive')
  ),
  totalBuiltUpArea: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Total Built-up Area must be a number' }).positive('Total Built-up Area must be positive')
  ),
  constructionStartDate: z.string().min(1, 'Construction Start Date is required'),
  constructionEndDate: z.string().min(1, 'Construction End Date is required'),
  engineerName: z.string().min(1, 'Engineer/Owner Name is required'),
  designation: z.string().min(1, 'Designation is required'),
  organization: z.string().min(1, 'Organization is required'),
  officeAddress: z.string().min(1, 'Office Address is required'),
  officePostCode: z.string().min(1, 'Office Post Code is required'),
  telephone: z.string().optional().default(''),
  mobile: z.string().min(1, 'Mobile number is required'),
  email: z.string().email('Invalid email format'),
  projectCoordinatorDetails: z.string().min(1, 'Project Coordinator details are required'),
  architectName: z.string().min(1, 'Architect Name is required'),
  iabMembershipNo: z.string().min(1, 'IAB Membership Number is required'),
  greenBuildingConsultantDetails: z.string().min(1, 'Green Building Consultant details are required'),
  sredaRegistrationNumber: z.string().min(1, 'SREDA Registration Number is required'),
});

// ─── Reusable Field Components ─────────────────────────────────────
function Field({ label, required, error, children, colSpan }) {
  return (
    <div style={colSpan === 2 ? { gridColumn: 'span 2' } : {}}>
      <label style={{
        display: 'block',
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--tx-muted)',
        fontFamily: 'Montserrat,sans-serif',
        marginBottom: 6,
      }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{
          fontSize: 11.5, fontWeight: 700, color: '#EF4444',
          marginTop: 4, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ⚠ {error.message}
        </p>
      )}
    </div>
  );
}

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

// ─── Step Config ───────────────────────────────────────────────────
const STEPS = [
  { num: 1, icon: '🏗️', label: 'General Info', sub: 'Site & project details' },
  { num: 2, icon: '👤', label: 'Engineer / Owner', sub: 'Contact information' },
  { num: 3, icon: '🤝', label: 'Consultants', sub: 'Associates & registration' },
];

// ─── Main Component ────────────────────────────────────────────────
export default function ProjectInfoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      projectName: '', projectType: '', projectSize: '',
      address: '', postCode: '', gpsCoordinates: '',
      siteArea: '', totalBuiltUpArea: '',
      constructionStartDate: '', constructionEndDate: '',
      engineerName: '', designation: '', organization: '',
      officeAddress: '', officePostCode: '',
      telephone: '', mobile: '', email: '',
      projectCoordinatorDetails: '', architectName: '',
      iabMembershipNo: '', greenBuildingConsultantDetails: '',
      sredaRegistrationNumber: '',
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await axiosSecure.get('/categories');
        setCategories(catRes.data.categories || []);
        if (id) {
          const projRes = await axiosSecure.get(`/projects/${id}`);
          const p = projRes.data.project;
          if (p) {
            setValue('projectName', p.projectName || p.title || '');
            setValue('projectType', p.projectType || '');
            setValue('projectSize', p.projectSize || '');
            setValue('address', p.address || '');
            setValue('postCode', p.postCode || '');
            setValue('gpsCoordinates', p.gpsCoordinates || '');
            setValue('siteArea', p.siteArea ?? '');
            setValue('totalBuiltUpArea', p.totalBuiltUpArea ?? '');
            setValue('constructionStartDate', p.constructionStartDate ? p.constructionStartDate.split('T')[0] : '');
            setValue('constructionEndDate', p.constructionEndDate ? p.constructionEndDate.split('T')[0] : '');
            setValue('engineerName', p.engineerName || '');
            setValue('designation', p.designation || '');
            setValue('organization', p.organization || '');
            setValue('officeAddress', p.officeAddress || '');
            setValue('officePostCode', p.officePostCode || '');
            setValue('telephone', p.telephone || '');
            setValue('mobile', p.mobile || '');
            setValue('email', p.email || '');
            setValue('projectCoordinatorDetails', p.projectCoordinatorDetails || '');
            setValue('architectName', p.architectName || '');
            setValue('iabMembershipNo', p.iabMembershipNo || '');
            setValue('greenBuildingConsultantDetails', p.greenBuildingConsultantDetails || '');
            setValue('sredaRegistrationNumber', p.sredaRegistrationNumber || '');
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load project details');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, axiosSecure, setValue]);

  const stepFields = {
    1: ['projectName', 'projectType', 'projectSize', 'address', 'postCode',
        'gpsCoordinates', 'siteArea', 'totalBuiltUpArea', 'constructionStartDate', 'constructionEndDate'],
    2: ['engineerName', 'designation', 'organization', 'officeAddress', 'officePostCode', 'mobile', 'email'],
  };

  const handleNext = async () => {
    const isValid = await trigger(stepFields[step]);
    if (isValid) setStep(p => p + 1);
    else toast.error('Please fix the errors before continuing.');
  };

  const handleBack = () => setStep(p => p - 1);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await axiosSecure.patch(`/projects/${id}/info`, { ...data, status: 'submitted' });
      toast.success('Project registered successfully!');
      navigate(`/projects/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit details');
    } finally {
      setSaving(false);
    }
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      await axiosSecure.patch(`/projects/${id}/info`, { ...getValues(), status: 'draft' });
      toast.success('Draft saved.');
      navigate(`/projects/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading State ────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3.5px solid var(--g200)',
            borderTopColor: 'var(--g500)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--tx-faint)', fontWeight: 600, fontSize: 13 }}>Loading project details…</p>
        </div>
      </Layout>
    );
  }

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Layout>
      <style>{`
        .pif-input:focus {
          border-color: var(--g400) !important;
          box-shadow: 0 0 0 3px rgba(34,168,75,0.14) !important;
          background: #fff !important;
        }
        .pif-input::placeholder { color: var(--tx-faint); font-weight: 500; }
        .pif-step-done { background: linear-gradient(135deg,var(--g700),var(--g500)) !important; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pif-step-panel { animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 4px 32px' }}>

        {/* ── Page Header ─────────────────────────────────────── */}
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
              }}>
                Project Setup & Registration
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--tx-faint)', fontWeight: 600, marginLeft: 46 }}>
              Complete all 3 steps to register your green building project.
            </p>
          </div>

          {/* Save Draft Button */}
          <button
            onClick={saveAsDraft}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(34,168,75,0.08)', border: '1.5px solid rgba(34,168,75,0.3)',
              color: 'var(--g700)', fontWeight: 700, fontSize: 13,
              fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
              transition: 'all 0.18s',
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,168,75,0.15)'; e.currentTarget.style.borderColor = 'var(--g400)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,168,75,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,168,75,0.3)'; }}
          >
            💾 Save Draft
          </button>
        </div>

        {/* ── Step Indicator ───────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          background: '#fff', borderRadius: 14,
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--sh-sm)', overflow: 'hidden',
        }}>
          {STEPS.map((s, i) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div
                key={s.num}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px',
                  borderRight: i < STEPS.length - 1 ? '1.5px solid var(--border)' : 'none',
                  background: isCurrent
                    ? 'linear-gradient(135deg,var(--g50),rgba(34,168,75,0.06))'
                    : isDone ? 'var(--bg-soft)' : '#fff',
                  transition: 'background 0.25s',
                  position: 'relative',
                }}
              >
                {/* Step Number / Check Circle */}
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
                  fontWeight: 900,
                  fontFamily: 'Montserrat,sans-serif',
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
                    Step {s.num}: {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600, marginTop: 1 }}>
                    {s.sub}
                  </div>
                </div>

                {/* Active indicator dot */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg,var(--g600),var(--g400))',
                    borderRadius: '0 0 0 0',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Progress Bar ─────────────────────────────────────── */}
        <div style={{
          height: 6, borderRadius: 99,
          background: 'var(--bg-muted)',
          marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg,var(--g700),var(--g400))',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 1px 6px rgba(34,168,75,0.4)',
          }} />
        </div>

        {/* ── Form Card ────────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--sh-md)',
          overflow: 'hidden',
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
              {STEPS[step - 1].icon}
            </span>
            <div>
              <h2 style={{
                fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
                fontSize: 15, color: 'var(--g800)', margin: 0,
              }}>
                {STEPS[step - 1].label}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--tx-faint)', margin: 0, fontWeight: 600 }}>
                {STEPS[step - 1].sub}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700,
              color: 'var(--g700)', background: 'rgba(34,168,75,0.1)',
              padding: '3px 10px', borderRadius: 99, fontFamily: 'Montserrat,sans-serif',
            }}>
              Step {step} of 3
            </div>
          </div>

          {/* Card Body */}
          <div style={{ padding: '28px 24px' }}>

            {/* ── STEP 1: General Project Info ────────────────── */}
            {step === 1 && (
              <div className="pif-step-panel">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                  {/* Project Name */}
                  <Field label="Project Name" required error={errors.projectName}>
                    <input
                      className="pif-input"
                      {...register('projectName')}
                      placeholder="e.g. Dream Towers Phase 1"
                      style={inputStyle(errors.projectName)}
                    />
                  </Field>

                  {/* Project Type */}
                  <Field label="Project Type" required error={errors.projectType}>
                    <select
                      className="pif-input"
                      {...register('projectType')}
                      style={{ ...inputStyle(errors.projectType), cursor: 'pointer' }}
                    >
                      <option value="">— Select Type —</option>
                      {categories.map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>

                  {/* Project Size */}
                  <Field label="Project Size Classification" required error={errors.projectSize}>
                    <select
                      className="pif-input"
                      {...register('projectSize')}
                      style={{ ...inputStyle(errors.projectSize), cursor: 'pointer' }}
                    >
                      <option value="">— Select Size —</option>
                      <option value="Small">Small — Built-up area &lt; 5,000 sqm</option>
                      <option value="Medium">Medium — 5,000 to 20,000 sqm</option>
                      <option value="Large">Large — Built-up area &gt; 20,000 sqm</option>
                    </select>
                  </Field>

                  {/* GPS Coordinates */}
                  <Field label="GPS Coordinates" required error={errors.gpsCoordinates}>
                    <input
                      className="pif-input"
                      {...register('gpsCoordinates')}
                      placeholder="e.g. 23.8103° N, 90.4125° E"
                      style={inputStyle(errors.gpsCoordinates)}
                    />
                  </Field>

                  {/* Site Address — full width */}
                  <Field label="Site Address" required error={errors.address} colSpan={2}>
                    <input
                      className="pif-input"
                      {...register('address')}
                      placeholder="Street number, Area, City"
                      style={inputStyle(errors.address)}
                    />
                  </Field>

                  {/* Post Code */}
                  <Field label="Postal Code" required error={errors.postCode}>
                    <input
                      className="pif-input"
                      {...register('postCode')}
                      placeholder="e.g. 1212"
                      style={inputStyle(errors.postCode)}
                    />
                  </Field>

                  {/* Divider row label */}
                  <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'var(--tx-faint)',
                        fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                      }}>Area & Timeline</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  </div>

                  {/* Site Area */}
                  <Field label="Site Area (sqm)" required error={errors.siteArea}>
                    <input
                      className="pif-input"
                      type="number"
                      step="any"
                      {...register('siteArea')}
                      placeholder="e.g. 4500"
                      style={inputStyle(errors.siteArea)}
                    />
                  </Field>

                  {/* Total Built-up Area */}
                  <Field label="Total Built-up Area (sqm)" required error={errors.totalBuiltUpArea}>
                    <input
                      className="pif-input"
                      type="number"
                      step="any"
                      {...register('totalBuiltUpArea')}
                      placeholder="e.g. 12000"
                      style={inputStyle(errors.totalBuiltUpArea)}
                    />
                  </Field>

                  {/* Construction Start Date */}
                  <Field label="Construction Start Date" required error={errors.constructionStartDate}>
                    <input
                      className="pif-input"
                      type="date"
                      {...register('constructionStartDate')}
                      style={inputStyle(errors.constructionStartDate)}
                    />
                  </Field>

                  {/* Construction End Date */}
                  <Field label="Expected Completion Date" required error={errors.constructionEndDate}>
                    <input
                      className="pif-input"
                      type="date"
                      {...register('constructionEndDate')}
                      style={inputStyle(errors.constructionEndDate)}
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* ── STEP 2: Engineer / Owner Info ───────────────── */}
            {step === 2 && (
              <div className="pif-step-panel">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                  <Field label="Full Name" required error={errors.engineerName}>
                    <input
                      className="pif-input"
                      {...register('engineerName')}
                      placeholder="e.g. Engr. Rafiqul Islam"
                      style={inputStyle(errors.engineerName)}
                    />
                  </Field>

                  <Field label="Designation" required error={errors.designation}>
                    <input
                      className="pif-input"
                      {...register('designation')}
                      placeholder="e.g. Chief Structural Engineer"
                      style={inputStyle(errors.designation)}
                    />
                  </Field>

                  <Field label="Organization / Company" required error={errors.organization}>
                    <input
                      className="pif-input"
                      {...register('organization')}
                      placeholder="e.g. Apex Builders Ltd."
                      style={inputStyle(errors.organization)}
                    />
                  </Field>

                  <Field label="Office Post Code" required error={errors.officePostCode}>
                    <input
                      className="pif-input"
                      {...register('officePostCode')}
                      placeholder="e.g. 1207"
                      style={inputStyle(errors.officePostCode)}
                    />
                  </Field>

                  <Field label="Office Address" required error={errors.officeAddress} colSpan={2}>
                    <input
                      className="pif-input"
                      {...register('officeAddress')}
                      placeholder="Office building, Floor, Road, Area, City"
                      style={inputStyle(errors.officeAddress)}
                    />
                  </Field>

                  {/* Divider */}
                  <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'var(--tx-faint)',
                        fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                      }}>Contact Details</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  </div>

                  <Field label="Telephone" error={errors.telephone}>
                    <input
                      className="pif-input"
                      type="tel"
                      {...register('telephone')}
                      placeholder="e.g. +880-2-987654"
                      style={inputStyle(errors.telephone)}
                    />
                  </Field>

                  <Field label="Mobile" required error={errors.mobile}>
                    <input
                      className="pif-input"
                      type="tel"
                      {...register('mobile')}
                      placeholder="e.g. 01712345678"
                      style={inputStyle(errors.mobile)}
                    />
                  </Field>

                  <Field label="Email Address" required error={errors.email} colSpan={2}>
                    <input
                      className="pif-input"
                      type="email"
                      {...register('email')}
                      placeholder="e.g. rafiq@organization.com"
                      style={inputStyle(errors.email)}
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* ── STEP 3: Associates & Consultants ────────────── */}
            {step === 3 && (
              <div className="pif-step-panel">

                {/* Info banner */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  background: 'linear-gradient(135deg,var(--g50),rgba(34,168,75,0.04))',
                  border: '1.5px solid var(--g200)', borderRadius: 10,
                  marginBottom: 22,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
                  <p style={{ fontSize: 12.5, color: 'var(--tx-muted)', fontWeight: 600, margin: 0, lineHeight: 1.6 }}>
                    Please provide the name and contact for each key consultant. This information will appear on the official project registration document.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Each consultant in a card */}
                  {[
                    {
                      icon: '📋', title: 'Project Coordinator',
                      field: 'projectCoordinatorDetails',
                      placeholder: 'e.g. Tanvir Ahmed (Coordinator) — 01811223344',
                      label: 'Coordinator Name and Contact',
                    },
                    {
                      icon: '🏛️', title: 'Architect',
                      field: 'architectName',
                      placeholder: 'e.g. Ar. Syeda Shahnaz',
                      label: 'Architect Name',
                    },
                    {
                      icon: '🪪', title: 'IAB Membership',
                      field: 'iabMembershipNo',
                      placeholder: 'e.g. IAB M-8742',
                      label: 'IAB Membership Number',
                    },
                    {
                      icon: '🌿', title: 'Green Building Consultant',
                      field: 'greenBuildingConsultantDetails',
                      placeholder: 'e.g. GreenTech Consultants (Dr. Alam)',
                      label: 'Consultant Name and Company',
                    },
                    {
                      icon: '⚡', title: 'SREDA Registration',
                      field: 'sredaRegistrationNumber',
                      placeholder: 'e.g. SREDA-REG-2026-9051',
                      label: 'SREDA Registration Number',
                    },
                  ].map((item) => (
                    <div
                      key={item.field}
                      style={{
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                        padding: '16px', borderRadius: 12,
                        border: '1.5px solid var(--border)',
                        background: 'var(--bg-soft)',
                        transition: 'border-color 0.18s, box-shadow 0.18s',
                      }}
                      onFocus={() => {}} /* handled via CSS */
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, boxShadow: '0 2px 8px rgba(34,168,75,0.25)',
                        marginTop: 2,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={{
                          display: 'block', fontSize: 12, fontWeight: 800,
                          color: 'var(--g700)', fontFamily: 'Montserrat,sans-serif',
                          marginBottom: 3,
                        }}>
                          {item.title} <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <p style={{ fontSize: 11, color: 'var(--tx-faint)', margin: '0 0 8px', fontWeight: 600 }}>
                          {item.label}
                        </p>
                        <input
                          className="pif-input"
                          {...register(item.field)}
                          placeholder={item.placeholder}
                          style={{ ...inputStyle(errors[item.field]), background: '#fff' }}
                        />
                        {errors[item.field] && (
                          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#EF4444', marginTop: 5 }}>
                            ⚠ {errors[item.field].message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            )}
          </div>

          {/* ── Navigation Footer ──────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1.5px solid var(--border)',
            background: 'var(--bg-soft)',
          }}>
            {/* Left: Back / Cancel */}
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                  background: '#fff', border: '1.5px solid var(--border)',
                  color: 'var(--tx-muted)', fontWeight: 700, fontSize: 13,
                  fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--g400)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/projects/${id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                  background: '#fff', border: '1.5px solid var(--border)',
                  color: 'var(--tx-muted)', fontWeight: 700, fontSize: 13,
                  fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-md)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                ✕ Cancel
              </button>
            )}

            {/* Step counter pill */}
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {STEPS.map(s => (
                <div
                  key={s.num}
                  style={{
                    width: step === s.num ? 22 : 8,
                    height: 8, borderRadius: 99,
                    background: step > s.num
                      ? 'var(--g500)'
                      : step === s.num
                        ? 'linear-gradient(90deg,var(--g600),var(--g400))'
                        : 'var(--bg-muted)',
                    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: step === s.num ? '0 1px 6px rgba(34,168,75,0.4)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Right: Next / Submit */}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                  border: 'none', color: '#fff',
                  fontWeight: 800, fontSize: 13,
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
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 24px', borderRadius: 10,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  background: saving
                    ? 'var(--bg-muted)'
                    : 'linear-gradient(135deg,var(--g800),var(--g500))',
                  border: 'none', color: saving ? 'var(--tx-faint)' : '#fff',
                  fontWeight: 800, fontSize: 13,
                  fontFamily: 'Montserrat,sans-serif',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(34,168,75,0.4)',
                  transition: 'all 0.2s',
                  opacity: saving ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(34,168,75,0.5)'; }}}
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
