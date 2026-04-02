import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LeafLogo from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';

// 🔧 তোমার সব admin email এখানে রাখো
const ADMIN_EMAILS = [
    'draculabile55@gmail.com',
    'rimondey010@gmail.com',
    'admin@desh.com'
];

export default function AdminLogin() {
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [gLoading, setGLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const checkAdmin = (email) => {
        if (!ADMIN_EMAILS.includes(email)) {
            toast.error(`Access denied. (${email}) is not an admin.`);
            return false;
        }
        return true;
    };

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cred = await login(form.email, form.password);
            if (!checkAdmin(cred.user.email)) { setLoading(false); return; }
            toast.success('Welcome, Admin!');
            navigate('/admin');
        } catch (err) {
            toast.error('Invalid credentials: ' + err.code);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setGLoading(true);
        try {
            const cred = await loginWithGoogle();
            // দেখাবে কোন email দিয়ে login হলো
            console.log('Google login email:', cred.user.email);
            if (!checkAdmin(cred.user.email)) { setGLoading(false); return; }
            toast.success('Welcome, Admin!');
            navigate('/admin');
        } catch (err) {
            toast.error('Google sign-in failed: ' + err.code);
        } finally {
            setGLoading(false);
        }
    };

    return (
        <div className="auth-bg noise min-h-screen flex items-center justify-center px-4">

            <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle,#E2670C 0%,transparent 70%)', transform: 'translate(30%,-30%)' }} />
            <div className="fixed bottom-0 left-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle,#97542A 0%,transparent 70%)', transform: 'translate(-30%,30%)' }} />

            <div className="w-full max-w-md fade-in-up">

                <div className="text-center mb-8">
                    <div className="inline-block mb-4 relative">
                        <LeafLogo size={52} animated />
                        <div className="absolute -bottom-1 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'linear-gradient(135deg,#E2670C,#97542A)', color: 'white' }}>
                            ⚙
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                        Admin Portal
                    </h1>
                    <p className="text-sm" style={{ color: 'rgba(232,245,233,0.35)' }}>
                        DESH Green Building — Restricted Access
                    </p>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                    style={{ background: 'rgba(226,103,12,0.08)', border: '1px solid rgba(226,103,12,0.2)' }}>
                    <span className="text-base flex-shrink-0">⚠</span>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(226,103,12,0.9)' }}>
                        Authorized administrators only. Unauthorized access is prohibited.
                    </p>
                </div>

                <div className="glass-card p-8"
                    style={{ boxShadow: '0 0 40px rgba(226,103,12,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

                    <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
                        Admin Sign In
                    </h2>
                    <p className="text-sm mb-6" style={{ color: 'rgba(232,245,233,0.35)' }}>
                        Enter your admin credentials to continue
                    </p>

                    {/* Google Button */}
                    <button onClick={handleGoogle} disabled={gLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border font-semibold text-sm transition-all mb-5 disabled:opacity-60"
                        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(226,103,12,0.2)', color: '#E8F5E9' }}>
                        {gLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {gLoading ? 'Verifying...' : 'Continue with Google'}
                    </button>

                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px" style={{ background: 'rgba(226,103,12,0.1)' }} />
                        <span className="text-xs" style={{ color: 'rgba(232,245,233,0.2)' }}>or sign in with email</span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(226,103,12,0.1)' }} />
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold mb-2"
                                style={{ color: 'rgba(232,245,233,0.45)', letterSpacing: '0.06em' }}>ADMIN EMAIL</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                                    style={{ color: 'rgba(232,245,233,0.2)' }}>✉</span>
                                <input type="email" name="email" value={form.email} onChange={handle}
                                    required placeholder="admin@gmail.com"
                                    className="input-dark w-full pl-9 pr-4 py-3 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold mb-2"
                                style={{ color: 'rgba(232,245,233,0.45)', letterSpacing: '0.06em' }}>PASSWORD</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                                    style={{ color: 'rgba(232,245,233,0.2)' }}>🔒</span>
                                <input type={showPass ? 'text' : 'password'} name="password" value={form.password}
                                    onChange={handle} required placeholder="••••••••"
                                    className="input-dark w-full pl-9 pr-14 py-3 text-sm" />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                                    style={{ color: 'rgba(232,245,233,0.3)' }}>
                                    {showPass ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all mt-1 disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg,#97542A,#E2670C)', color: 'white', fontFamily: 'Syne, sans-serif', boxShadow: '0 8px 25px rgba(226,103,12,0.2)' }}>
                            {loading ? (
                                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                            ) : <>⚙ Sign In as Admin</>}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-5" style={{ color: 'rgba(232,245,233,0.35)' }}>
                        Not an admin?{' '}
                        <Link to="/login" style={{ color: '#4ADE80' }} className="font-semibold hover:underline">
                            User Login →
                        </Link>
                    </p>
                </div>

            </div>
        </div>
    );
}