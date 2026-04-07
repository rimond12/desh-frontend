import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../services/firebase';

export default function Settings() {
    const axiosSecure = useAxiosSecure();
    const [site, setSite] = useState({ siteName: 'DESH Project', maxFileSize: 10, allowedTypes: 'pdf,jpg,jpeg,png' });
    const [pass, setPass] = useState({ current: '', newPass: '', confirm: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axiosSecure.get('/settings')
            .then(res => {
                const s = res.data.settings;
                setSite({ siteName: s.siteName, maxFileSize: s.maxFileSize || 10, allowedTypes: s.allowedTypes || 'pdf,jpg,jpeg,png' });
            }).catch(console.error);
    }, []);

    const saveSite = async () => {
        setSaving(true);
        try {
            await axiosSecure.put('/settings', site);
            toast.success('Settings saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const changePass = async () => {
        if (!pass.current || !pass.newPass) { toast.error('Fill all fields'); return; }
        if (pass.newPass !== pass.confirm) { toast.error("Passwords don't match"); return; }
        if (pass.newPass.length < 6) { toast.error('Min 6 characters'); return; }
        setSaving(true);
        try {
            const user = auth.currentUser;
            const cred = EmailAuthProvider.credential(user.email, pass.current);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, pass.newPass);
            setPass({ current: '', newPass: '', confirm: '' });
            toast.success('Password changed!');
        } catch (err) {
            toast.error(err.code === 'auth/wrong-password' ? 'Wrong current password' : 'Failed to change password');
        } finally { setSaving(false); }
    };

    return (
        <Layout isAdmin>
            <div className="mb-8 fade-in-up">
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Settings</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>System configuration</p>
            </div>

            <div className="max-w-2xl space-y-6">
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-5">⚙ Site Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>SITE NAME</label>
                            <input value={site.siteName} onChange={e => setSite({ ...site, siteName: e.target.value })}
                                className="input-dark w-full px-4 py-3 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>MAX FILE SIZE (MB)</label>
                            <input type="number" value={site.maxFileSize} onChange={e => setSite({ ...site, maxFileSize: e.target.value })}
                                className="input-dark w-40 px-4 py-3 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>ALLOWED FILE TYPES</label>
                            <input value={site.allowedTypes} onChange={e => setSite({ ...site, allowedTypes: e.target.value })}
                                className="input-dark w-full px-4 py-3 text-sm" />
                        </div>
                        <button onClick={saveSite} disabled={saving} className="btn-primary-green text-sm">
                            {saving ? 'Saving...' : '💾 Save Settings'}
                        </button>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-5">🔒 Change Password</h2>
                    <div className="space-y-4">
                        {[
                            { label: 'CURRENT PASSWORD', key: 'current', placeholder: '••••••••' },
                            { label: 'NEW PASSWORD', key: 'newPass', placeholder: 'Min 6 characters' },
                            { label: 'CONFIRM PASSWORD', key: 'confirm', placeholder: 'Repeat new password' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>{f.label}</label>
                                <input type="password" value={pass[f.key]} onChange={e => setPass({ ...pass, [f.key]: e.target.value })}
                                    placeholder={f.placeholder} className="input-dark w-full px-4 py-3 text-sm" />
                            </div>
                        ))}
                        {pass.confirm && pass.newPass !== pass.confirm && (
                            <p className="text-xs" style={{ color: '#E2670C' }}>⚠ Passwords don't match</p>
                        )}
                        <button onClick={changePass} disabled={saving}
                            className="w-full py-3 px-6 rounded-xl font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg,#97542A,#E2670C)', color: 'white' }}>
                            {saving ? 'Updating...' : '🔒 Change Password'}
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}