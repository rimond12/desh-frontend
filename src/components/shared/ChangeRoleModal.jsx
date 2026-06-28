import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getActiveRole } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

// ── Role display configuration (mirrors Users.jsx ROLE_CFG for consistency) ───
const ROLE_CFG = {
  admin:         { label: 'DESH Admin',        bg: 'rgba(249,115,22,0.15)',  color: '#FB923C', border: 'rgba(249,115,22,0.3)' },
  desh_manager:  { label: 'DESH Manager',      bg: 'rgba(14,165,233,0.15)',  color: '#38BDF8', border: 'rgba(14,165,233,0.3)' },
  desh_reviewer: { label: 'DESH Reviewer',     bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
  desh_assessor: { label: 'DESH Assessor',     bg: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: 'rgba(59,130,246,0.3)' },
  reviewer:      { label: 'Reviewer',          bg: 'rgba(234,179,8,0.15)',  color: '#FDE047', border: 'rgba(234,179,8,0.3)' },
  owner:         { label: 'Owner',             bg: 'rgba(168,85,247,0.15)', color: '#C084FC', border: 'rgba(168,85,247,0.3)' },
  user:          { label: 'DESH Professional', bg: 'rgba(34,168,75,0.15)',  color: '#4ADE80', border: 'rgba(34,168,75,0.3)' },
};

// ── Maps an activeRole to a dashboard route ────────────────────────────────────
function getDashboardPath(role) {
  if (role === 'admin')                                               return '/admin';
  if (role === 'desh_manager')                                        return '/manager/submissions';
  if (['desh_reviewer', 'desh_assessor', 'reviewer'].includes(role)) return '/reviewer/submissions';
  return '/dashboard';
}

// ── Small badge for displaying a role ─────────────────────────────────────────
function RoleBadge({ role, style = {} }) {
  const cfg = ROLE_CFG[role] || ROLE_CFG.user;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 11px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontFamily: 'Montserrat,sans-serif',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Main modal component ───────────────────────────────────────────────────────
export default function ChangeRoleModal({ onClose }) {
  const { user, dbUser, switchActiveRole } = useAuth();
  const navigate = useNavigate();

  const currentActiveRole = getActiveRole(dbUser);
  const assignedRoles     = Array.isArray(dbUser?.roles) ? dbUser.roles : ['user'];

  const [selected, setSelected] = useState(currentActiveRole);
  const [loading,  setLoading]  = useState(false);

  // ── Race-condition-safe navigation ────────────────────────────────────────
  // We store the intended destination in a ref. A useEffect watches dbUser.activeRole.
  // When React commits the new dbUser to state (after switchActiveRole), the effect
  // fires and navigates. By this point all route guards see the correct activeRole.
  const pendingNav = useRef(null);

  useEffect(() => {
    if (pendingNav.current && dbUser?.activeRole === selected) {
      const dest = pendingNav.current;
      pendingNav.current = null;
      onClose();
      navigate(dest, { replace: true });
    }
  }, [dbUser?.activeRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasChanged = selected !== currentActiveRole;

  const handleDone = async () => {
    if (!hasChanged || loading) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Store where we want to go BEFORE the state update
      pendingNav.current = getDashboardPath(selected);

      await switchActiveRole(selected);
      // switchActiveRole calls setDbUser(data.user) internally.
      // The useEffect above will fire once React commits that state update,
      // then navigate to pendingNav.current.

      const cfg = ROLE_CFG[selected] || ROLE_CFG.user;
      toast.success(`Switched to ${cfg.label}`);
    } catch (err) {
      pendingNav.current = null;
      toast.error(err.message || 'Failed to switch role');
      setLoading(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.18s ease both',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%', maxWidth: 420,
          background: '#081A0F',
          border: '1.5px solid rgba(52,201,97,0.22)',
          borderRadius: 22,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,201,97,0.08)',
          padding: '28px 24px 24px',
          color: '#fff',
          animation: 'fadeInUp 0.22s cubic-bezier(0.16,1,0.3,1) both',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle green glow at top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 120,
          background: 'radial-gradient(ellipse at 50% -20%,rgba(34,168,75,0.18) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          aria-label="Close"
        >✕</button>

        {/* ── User Info Section ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative', zIndex: 1 }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#145C28,#34C961)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: 'white',
            fontFamily: 'Montserrat,sans-serif',
            boxShadow: '0 4px 16px rgba(34,168,75,0.45)',
            border: '2px solid rgba(52,201,97,0.35)',
          }}>
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>

          {/* Name + email + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 15, fontWeight: 800, color: '#fff', margin: 0,
              fontFamily: 'Montserrat,sans-serif',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p style={{
              fontSize: 11.5, color: 'rgba(255,255,255,0.45)', margin: '2px 0 8px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.email}
            </p>

            {/* Active role badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                fontFamily: 'Montserrat,sans-serif',
              }}>Active</span>
              <RoleBadge role={currentActiveRole} />
            </div>
          </div>
        </div>

        {/* Green divider */}
        <div style={{
          height: 1, marginBottom: 20,
          background: 'linear-gradient(90deg,rgba(52,201,97,0.4),rgba(52,201,97,0.05),transparent)',
          borderRadius: 99, position: 'relative', zIndex: 1,
        }} />

        {/* ── Role Selector Section ── */}
        <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <p style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
            fontFamily: 'Montserrat,sans-serif', marginBottom: 12,
          }}>
            CHANGE SYSTEM ROLE
          </p>

          {/* Radio list — only assigned roles shown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {assignedRoles.map(role => {
              const cfg        = ROLE_CFG[role] || ROLE_CFG.user;
              const isSelected = selected === role;
              const isActive   = currentActiveRole === role;

              return (
                <button
                  key={role}
                  onClick={() => setSelected(role)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 13, width: '100%',
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: isSelected
                      ? `1.5px solid ${cfg.border}`
                      : '1.5px solid rgba(255,255,255,0.07)',
                    background: isSelected
                      ? cfg.bg
                      : 'rgba(255,255,255,0.03)',
                    boxShadow: isSelected ? `0 0 20px ${cfg.bg}` : 'none',
                  }}
                >
                  {/* Radio indicator */}
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${isSelected ? cfg.color : 'rgba(255,255,255,0.2)'}`,
                    background: isSelected ? cfg.color : 'transparent',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}>
                    {isSelected && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#fff',
                        display: 'block',
                      }} />
                    )}
                  </span>

                  {/* Role label */}
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isSelected ? cfg.color : 'rgba(255,255,255,0.55)',
                    fontFamily: 'Nunito,sans-serif',
                    flex: 1,
                    transition: 'color 0.15s',
                  }}>
                    {cfg.label}
                  </span>

                  {/* "Currently active" indicator */}
                  {isActive && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, fontFamily: 'Montserrat,sans-serif',
                      color: 'rgba(52,201,97,0.7)',
                      padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(52,201,97,0.1)',
                      border: '1px solid rgba(52,201,97,0.2)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
          <button
            onClick={handleDone}
            disabled={loading}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 13,
              fontSize: 13.5, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.01em',
              background: hasChanged
                ? 'linear-gradient(135deg,#1A7A35,#34C961)'
                : 'rgba(255,255,255,0.07)',
              color: hasChanged ? '#fff' : 'rgba(255,255,255,0.35)',
              border: hasChanged
                ? '1.5px solid rgba(52,201,97,0.4)'
                : '1.5px solid rgba(255,255,255,0.08)',
              boxShadow: hasChanged ? '0 4px 20px rgba(34,168,75,0.4)' : 'none',
              transition: 'all 0.18s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? '⟳ Switching…'
              : hasChanged
                ? '✓ Confirm Switch'
                : 'Done'}
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '11px 18px', borderRadius: 13,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Nunito,sans-serif',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.55)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Cancel
          </button>
        </div>

        {/* Helper text */}
        <p style={{
          marginTop: 14, fontSize: 10.5, color: 'rgba(255,255,255,0.22)',
          textAlign: 'center', fontFamily: 'Nunito,sans-serif',
          position: 'relative', zIndex: 1, lineHeight: 1.5,
        }}>
          Only roles assigned by an Administrator are shown.
          <br />Switching role does not change your permissions.
        </p>
      </div>
    </div>
  );
}
