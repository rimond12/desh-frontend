import { useState } from 'react';
import { X, Users, User, Mail, Plus } from 'lucide-react';
import useAxiosSecure from '../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

export default function CollaboratorsOwnersModal({ project, onClose, onSaved }) {
  const axiosSecure = useAxiosSecure();
  const [collabInput, setCollabInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [collaborators, setCollaborators] = useState(project.collaboratorEmails || []);
  const [owners, setOwners] = useState(project.ownerEmails || []);
  const [saving, setSaving] = useState(false);

  const addCollab = () => {
    const trimmed = collabInput.trim().toLowerCase();
    if (!trimmed) return;
    if (collaborators.includes(trimmed)) {
      toast.error('Email already added as collaborator');
      return;
    }
    setCollaborators([...collaborators, trimmed]);
    setCollabInput('');
  };

  const removeCollab = (email) => {
    setCollaborators(collaborators.filter(e => e !== email));
  };

  const addOwner = () => {
    const trimmed = ownerInput.trim().toLowerCase();
    if (!trimmed) return;
    if (owners.includes(trimmed)) {
      toast.error('Email already added as owner');
      return;
    }
    setOwners([...owners, trimmed]);
    setOwnerInput('');
  };

  const removeOwner = (email) => {
    setOwners(owners.filter(e => e !== email));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosSecure.patch(`/projects/${project._id}/access`, {
        collaboratorEmails: collaborators,
        ownerEmails: owners,
      });
      toast.success('Collaborators and Owners updated successfully!');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update access settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(5,26,10,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="fade-in-up"
        style={{
          width: '100%', maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 24,
          background: '#F4F8F5',
          border: '1.5px solid #A8EFC0',
          boxShadow: '0 32px 80px rgba(0,40,16,0.35), 0 8px 24px rgba(0,40,16,0.18)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'linear-gradient(135deg, #051A0A 0%, #0A2D14 50%, #145C28 100%)',
          borderRadius: '22px 22px 0 0',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 14,
          borderBottom: '1.5px solid rgba(52,201,97,0.25)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(34,168,75,0.3), rgba(52,201,97,0.15))',
            border: '1.5px solid rgba(93,216,130,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={18} color="#5DD882" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontSize: 9, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              color: 'rgba(93,216,130,0.7)', fontFamily: 'Montserrat,sans-serif',
              marginBottom: 3,
            }}>
              Access Control
            </span>
            <h2 style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
              fontSize: 16, color: '#fff', margin: 0, lineHeight: 1.2,
            }}>
              Collaborators &amp; Owners
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Section 1: Collaborators */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Users size={16} color="#145C28" />
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13, color: '#0A2016', margin: 0 }}>
                Collaborators
              </h3>
            </div>
            <p style={{ fontSize: 12, color: '#556B5C', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Collaborators can view the project, edit answers, and leave comments.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="email"
                placeholder="colleague@example.com"
                value={collabInput}
                onChange={e => setCollabInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCollab()}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #D0E8D8', outline: 'none',
                  fontSize: 13.5, fontFamily: 'Nunito,sans-serif', fontWeight: 600,
                }}
              />
              <button
                type="button"
                onClick={addCollab}
                style={{
                  background: '#145C28', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '0 16px', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: 'Montserrat,sans-serif',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 36, padding: '8px 12px', background: '#EAF4EE', borderRadius: 12, border: '1px dashed #A8EFC0' }}>
              {collaborators.length === 0 ? (
                <span style={{ fontSize: 12, color: '#889B8E', fontStyle: 'italic', alignSelf: 'center' }}>No collaborators assigned yet.</span>
              ) : (
                collaborators.map(email => (
                  <span key={email} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 99, background: '#fff',
                    border: '1px solid #C2E2CD', color: '#145C28',
                    fontSize: 12, fontWeight: 700, fontFamily: 'Nunito,sans-serif',
                  }}>
                    <Mail size={11} /> {email}
                    <button
                      type="button"
                      onClick={() => removeCollab(email)}
                      style={{
                        background: 'none', border: 'none', color: '#EF4444',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        padding: 0, marginLeft: 2,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Owners */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <User size={16} color="#145C28" />
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13, color: '#0A2016', margin: 0 }}>
                Project Owners (Clients)
              </h3>
            </div>
            <p style={{ fontSize: 12, color: '#556B5C', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Project owners can view assessment results and scores, but cannot make edits.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="email"
                placeholder="client@example.com"
                value={ownerInput}
                onChange={e => setOwnerInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOwner()}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #D0E8D8', outline: 'none',
                  fontSize: 13.5, fontFamily: 'Nunito,sans-serif', fontWeight: 600,
                }}
              />
              <button
                type="button"
                onClick={addOwner}
                style={{
                  background: '#145C28', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '0 16px', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: 'Montserrat,sans-serif',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 36, padding: '8px 12px', background: '#EAF4EE', borderRadius: 12, border: '1px dashed #A8EFC0' }}>
              {owners.length === 0 ? (
                <span style={{ fontSize: 12, color: '#889B8E', fontStyle: 'italic', alignSelf: 'center' }}>No owners assigned yet.</span>
              ) : (
                owners.map(email => (
                  <span key={email} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 99, background: '#fff',
                    border: '1px solid #C2E2CD', color: '#145C28',
                    fontSize: 12, fontWeight: 700, fontFamily: 'Nunito,sans-serif',
                  }}>
                    <Mail size={11} /> {email}
                    <button
                      type="button"
                      onClick={() => removeOwner(email)}
                      style={{
                        background: 'none', border: 'none', color: '#EF4444',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        padding: 0, marginLeft: 2,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 24px', borderTop: '1.5px solid #D0E8D8',
          background: '#EFF9F4', borderRadius: '0 0 22px 22px',
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
              background: '#fff', border: '1.5px solid #D0E8D8',
              color: '#556B5C', fontWeight: 700, fontSize: 13,
              fontFamily: 'Montserrat,sans-serif', transition: 'all 0.18s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#1A7A35'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#D0E8D8'}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 22px', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #1A7A35, #22A84B)',
              border: 'none', color: '#fff', fontWeight: 800, fontSize: 13,
              fontFamily: 'Montserrat,sans-serif',
              boxShadow: '0 4px 14px rgba(34,168,75,0.3)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { if(!saving) e.currentTarget.style.transform = 'none'; }}
          >
            {saving ? 'Saving...' : 'Save Access Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
