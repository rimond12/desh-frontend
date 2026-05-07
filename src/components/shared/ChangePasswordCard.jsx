/**
 * ChangePasswordCard.jsx
 *
 * Shared "Change Password" UI used by both the Admin Settings page
 * and the User Account page.
 *
 * How it works:
 *  1. Calls Firebase `reauthenticateWithCredential` to verify the current
 *     password BEFORE accepting the new one — this is the "current password
 *     check" step.
 *  2. Calls Firebase `updatePassword` to set the new password.
 *     Firebase hashes the password on their servers; no plaintext ever
 *     reaches our MongoDB database (which stores no passwords at all).
 *  3. Google-only accounts have no password credential — we detect this
 *     via `user.providerData` and show an informational message instead.
 */

import { useState } from 'react';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import toast from 'react-hot-toast';

// Map Firebase error codes to friendly messages
function friendlyError(code) {
    switch (code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Current password is incorrect.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/weak-password':
            return 'New password must be at least 6 characters.';
        case 'auth/requires-recent-login':
            return 'Session expired. Please log out and log back in, then try again.';
        case 'auth/network-request-failed':
            return 'Network error. Check your connection and try again.';
        default:
            return 'Failed to change password. Please try again.';
    }
}

export default function ChangePasswordCard() {
    const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
    const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
    const [loading, setLoading] = useState(false);

    const firebaseUser = auth.currentUser;
    

    // Detect whether the signed-in user has a password-based provider.
    // Google / SSO-only accounts have no password and cannot use this form.
    const hasPasswordProvider = firebaseUser?.providerData?.some(
        p => p.providerId === 'password'
    );

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const toggleShow = (key) => setShow(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ── Client-side validation ────────────────────────────────────────────
        if (!form.current) {
            toast.error('Please enter your current password.');
            return;
        }
        if (!form.newPass) {
            toast.error('Please enter a new password.');
            return;
        }
        if (form.newPass.length < 6) {
            toast.error('New password must be at least 6 characters.');
            return;
        }
        if (form.newPass !== form.confirm) {
            toast.error("New passwords don't match.");
            return;
        }
        if (form.current === form.newPass) {
            toast.error('New password must be different from the current one.');
            return;
        }

        setLoading(true);
        try {
            // Step 1 — Re-authenticate with current password (server-side verification)
            const credential = EmailAuthProvider.credential(
                firebaseUser.email,
                form.current
            );
            await reauthenticateWithCredential(firebaseUser, credential);

            // Step 2 — Update password (Firebase hashes it; never stored in our DB)
            await updatePassword(firebaseUser, form.newPass);

            // Clear form
            setForm({ current: '', newPass: '', confirm: '' });
            toast.success('Password changed successfully!');
        } catch (err) {
            toast.error(friendlyError(err.code));
        } finally {
            setLoading(false);
        }
    };

    // ── Google / SSO-only account — no password to change ────────────────────
    if (!hasPasswordProvider) {
        return (
            <div className="glass-card p-6">
                <h2 className="font-bold text-lg mb-2">🔒 Change Password</h2>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    background: 'rgba(59,130,246,0.07)',
                    border: '1.5px solid rgba(59,130,246,0.22)',
                    borderRadius: 12,
                }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            Google sign-in detected
                        </p>
                        <p className="text-sm" style={{ color: 'var(--tx-muted)', lineHeight: 1.6 }}>
                            Your account is linked to Google. Password management is handled
                            by Google — you can change it from your{' '}
                            <a
                                href="https://myaccount.google.com/security"
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--g600)', textDecoration: 'underline' }}
                            >
                                Google Account settings
                            </a>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Password-based account ────────────────────────────────────────────────
    return (
        <div className="glass-card p-6">
            <h2 className="font-bold text-lg mb-1">🔒 Change Password</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--tx-muted)' }}>
                Your current password is verified before any change is applied.
                Firebase securely hashes the new password — it is never stored
                in plaintext.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {/* Current password */}
                <div>
                    <label
                        className="block text-xs font-semibold mb-2"
                        style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}
                    >
                        CURRENT PASSWORD
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={show.current ? 'text' : 'password'}
                            value={form.current}
                            onChange={e => set('current', e.target.value)}
                            placeholder="Enter your current password"
                            className="input-dark w-full px-4 py-3 text-sm"
                            style={{ paddingRight: 44 }}
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => toggleShow('current')}
                            style={eyeBtn}
                            tabIndex={-1}
                        >
                            {show.current ? '🙈' : '👁'}
                        </button>
                    </div>
                </div>

                {/* New password */}
                <div>
                    <label
                        className="block text-xs font-semibold mb-2"
                        style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}
                    >
                        NEW PASSWORD
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={show.newPass ? 'text' : 'password'}
                            value={form.newPass}
                            onChange={e => set('newPass', e.target.value)}
                            placeholder="Min 6 characters"
                            className="input-dark w-full px-4 py-3 text-sm"
                            style={{ paddingRight: 44 }}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => toggleShow('newPass')}
                            style={eyeBtn}
                            tabIndex={-1}
                        >
                            {show.newPass ? '🙈' : '👁'}
                        </button>
                    </div>
                    {/* Strength indicator */}
                    {form.newPass && (
                        <StrengthBar password={form.newPass} />
                    )}
                </div>

                {/* Confirm password */}
                <div>
                    <label
                        className="block text-xs font-semibold mb-2"
                        style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}
                    >
                        CONFIRM NEW PASSWORD
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={show.confirm ? 'text' : 'password'}
                            value={form.confirm}
                            onChange={e => set('confirm', e.target.value)}
                            placeholder="Repeat new password"
                            className="input-dark w-full px-4 py-3 text-sm"
                            style={{ paddingRight: 44 }}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => toggleShow('confirm')}
                            style={eyeBtn}
                            tabIndex={-1}
                        >
                            {show.confirm ? '🙈' : '👁'}
                        </button>
                    </div>
                    {/* Match indicator */}
                    {form.confirm && form.newPass && (
                        <p className="text-xs mt-1" style={{
                            color: form.newPass === form.confirm ? '#16a34a' : '#dc2626',
                            fontWeight: 500,
                        }}>
                            {form.newPass === form.confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary-green text-sm"
                    style={{ opacity: loading ? 0.7 : 1, minWidth: 160 }}
                >
                    {loading ? 'Updating…' : '🔒 Update Password'}
                </button>
            </form>
        </div>
    );
}

// ── Eye-button style ──────────────────────────────────────────────────────────
const eyeBtn = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    padding: '2px 4px',
    color: 'var(--tx-muted)',
};

// ── Password strength bar ─────────────────────────────────────────────────────
function StrengthBar({ password }) {
    const score = getStrengthScore(password);
    const levels = [
        { label: 'Very weak', color: '#dc2626' },
        { label: 'Weak',      color: '#f97316' },
        { label: 'Fair',      color: '#eab308' },
        { label: 'Strong',    color: '#22c55e' },
        { label: 'Very strong', color: '#16a34a' },
    ];
    const { label, color } = levels[score];

    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {levels.map((_, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            background: i <= score ? color : 'var(--border)',
                            transition: 'background 0.2s',
                        }}
                    />
                ))}
            </div>
            <p style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</p>
        </div>
    );
}

function getStrengthScore(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
}
