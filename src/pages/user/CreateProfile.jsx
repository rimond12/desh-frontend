import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

const USER_TYPES = [
  { value: 'student',      label: 'Student',            icon: '🎓' },
  { value: 'professional', label: 'Professional',        icon: '💼' },
  { value: 'owner',        label: 'Building Owner',      icon: '🏢' },
  { value: 'architect',    label: 'Architect',           icon: '📐' },
  { value: 'engineer',     label: 'Engineer',            icon: '⚙️' },
  { value: 'researcher',   label: 'Researcher',          icon: '🔬' },
  { value: 'other',        label: 'Other',               icon: '👤' },
];

export default function CreateProfile() {
  const { user, dbUser, refreshDbUser } = useAuth();
  const ax = useAxiosSecure();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!selected) { toast.error('Please select your role to continue'); return; }
    setSaving(true);
    try {
      await ax.patch('/users/me/profile', { userType: selected });
      await refreshDbUser();
      toast.success('Profile set up successfully!');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#f5faf6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Nunito, sans-serif', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#fff', borderRadius: 24,
        border: '1px solid rgba(34,139,60,0.12)',
        boxShadow: '0 8px 40px rgba(34,139,60,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '40px 36px',
        animation: 'fadeUp 0.5s ease both',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/images/DESH_Picture1.png" alt="DESH"
            style={{ height: 64, objectFit: 'contain', marginBottom: 16 }} />
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 900,
            fontSize: 22, color: '#0d2b14', marginBottom: 8,
          }}>Complete Your Profile</h1>
          <p style={{ fontSize: 14, color: '#6b9e78', fontWeight: 500 }}>
            Welcome, <strong style={{ color: '#1e6b38' }}>{user?.displayName || dbUser?.name || 'there'}</strong>!
            Select your role to get started.
          </p>
        </div>

        {/* Role grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 24,
        }}>
          {USER_TYPES.map(({ value, label, icon }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                onClick={() => setSelected(value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                  border: isSelected
                    ? '2px solid #1e8c44'
                    : '1.5px solid #e2ede4',
                  background: isSelected ? '#f0faf3' : '#fafcfa',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: 14,
                  color: isSelected ? '#1e6b38' : '#4a7a54',
                  transition: 'all 0.15s',
                  boxShadow: isSelected
                    ? '0 0 0 3px rgba(30,140,68,0.12)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span>{label}</span>
                {isSelected && (
                  <span style={{
                    marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%',
                    background: '#1e8c44', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info note */}
        <p style={{
          fontSize: 12, color: '#9ab89f', textAlign: 'center',
          marginBottom: 20, fontStyle: 'italic',
        }}>
          Admin and Reviewer roles are assigned by administrators only.
        </p>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selected || saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: selected
              ? 'linear-gradient(135deg, #1e8c44 0%, #2db55d 100%)'
              : '#d4e8d9',
            color: '#fff', fontFamily: 'Nunito, sans-serif',
            fontWeight: 800, fontSize: 15, cursor: selected ? 'pointer' : 'not-allowed',
            boxShadow: selected ? '0 4px 16px rgba(30,140,68,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving…' : 'Continue to Deshboard →'}
        </button>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
