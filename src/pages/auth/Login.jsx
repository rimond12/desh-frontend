import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import PartnerFooter from '../../components/shared/PartnerFooter.jsx';
import useAuthBranding, { getImgSrc } from '../../hooks/useAuthBranding.js';
import CaptchaWidget from '../../components/shared/CaptchaWidget.jsx';

export default function Login() {
  const branding = useAuthBranding();
  const { login, loginWithGoogle, getRoleFromDb } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [captchaDone, setCaptchaDone] = useState(
    () => sessionStorage.getItem('captcha_login') === '1'
  );

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const redirectByRole = async () => {
    const role = await getRoleFromDb();
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'desh_manager') {
      navigate('/manager/submissions');
    } else if (role === 'reviewer' || role === 'desh_reviewer' || role === 'desh_assessor') {
      navigate('/reviewer/submissions');
    } else {
      navigate('/dashboard');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!captchaDone) { toast.error('Please complete the verification first.'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      await redirectByRole();
    } catch { toast.error('Invalid email or password.'); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (!captchaDone) { toast.error('Please complete the verification first.'); return; }
    setGLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in!');
      await redirectByRole();
    } catch { toast.error('Google sign-in failed.'); }
    finally { setGLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f4f0;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Subtle geometric background */
        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 900px 600px at 15% 10%, rgba(34,139,60,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 700px 500px at 85% 90%, rgba(34,139,60,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 400px 400px at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }
        .login-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(34,139,60,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,139,60,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        /* ── SECTION 1: Gov Header ── */
        .gov-header {
          width: 100%;
          background: #fff;
          border-bottom: 1px solid rgba(34,139,60,0.12);
          padding: 14px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          z-index: 10;
          animation: fadeIn 0.5s ease both;
          box-shadow: 0 1px 0 rgba(34,139,60,0.08), 0 4px 24px rgba(0,0,0,0.04);
        }
        .gov-header img {
          height: 100px;
          object-fit: contain;
        }
        .gov-header-text {
          display: flex;
          flex-direction: column;
        }
        .gov-header-text .title-bn {
          font-size: 15px;
          font-weight: 600;
          color: #1a4a28;
          line-height: 1.4;
          letter-spacing: 0.01em;
        }
        .gov-header-text .title-en {
          font-size: 11px;
          color: #5a7a63;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .gov-divider {
          width: 1px;
          height: 50px;
          background: rgba(34,139,60,0.2);
        }

        /* ── SECTION 2: Main Form ── */
        .main-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
          position: relative;
          z-index: 1;
        }

        .form-card {
          width: 100%;
          max-width: 440px;
          animation: fadeUp 0.6s ease 0.15s both;
        }

        .desh-logo-wrap {
          text-align: center;
          margin-bottom: 32px;
        }
        .desh-logo-wrap img {
         
          object-fit: contain;
          filter: drop-shadow(0 4px 16px rgba(34,139,60,0.18));
        }
        .desh-logo-wrap .system-label {
          display: block;
          margin-top: 10px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #7a9e84;
        }

        .card-box {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(34,139,60,0.1);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.9) inset,
            0 8px 32px rgba(34,139,60,0.08),
            0 32px 80px rgba(0,0,0,0.06);
          padding: 36px 32px;
        }

        .card-heading {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 700;
          color: #0d2b14;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }
        .card-subheading {
          font-size: 13px;
          color: #8ba98f;
          font-weight: 500;
          margin-bottom: 28px;
        }

        .field-wrap {
          position: relative;
          margin-bottom: 14px;
        }
        .field-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          color: #b0c8b4;
          pointer-events: none;
          line-height: 1;
        }
        .field-input {
          width: 100%;
          padding: 13px 16px 13px 44px;
          border: 1.5px solid #e2ede4;
          border-radius: 12px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          color: #1a3d20;
          background: #f9fdf9;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input::placeholder { color: #b5cab8; }
        .field-input:focus {
          border-color: #2e9e52;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(46,158,82,0.1);
        }
        .show-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #8fba96;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          padding: 4px 6px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .show-btn:hover { color: #2e9e52; background: rgba(46,158,82,0.07); }

        .submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 8px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #1e8c44 0%, #2db55d 100%);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 16px rgba(30,140,68,0.25), 0 1px 0 rgba(255,255,255,0.2) inset;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(30,140,68,0.32);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .divider-line { flex: 1; height: 1px; background: #edf3ee; }
        .divider-text { font-size: 11px; font-weight: 700; color: #b8ceba; letter-spacing: 0.08em; }

        .google-btn {
          width: 100%;
          padding: 13px;
          border: 1.5px solid #e2ede4;
          border-radius: 12px;
          background: #fff;
          color: #2a4a30;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .google-btn:hover:not(:disabled) {
          border-color: #b2d4ba;
          background: #f5fbf6;
          box-shadow: 0 4px 12px rgba(34,139,60,0.08);
        }
        .google-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .card-links {
          margin-top: 22px;
          text-align: center;
        }
        .card-links p {
          font-size: 13px;
          color: #8ba98f;
          font-weight: 500;
          margin-bottom: 10px;
        }
        .card-links a.reg-link {
          color: #1e8c44;
          font-weight: 700;
          text-decoration: none;
        }
        .card-links a.reg-link:hover { text-decoration: underline; }
        .card-links a.admin-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #a8c0ac;
          font-weight: 600;
          text-decoration: none;
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid #e6eee7;
          transition: all 0.2s;
        }
        .card-links a.admin-link:hover {
          background: #f4faf5;
          color: #1e8c44;
          border-color: #c5dfc8;
        }

        @media (max-width: 480px) {
          .gov-header { padding: 12px 16px; gap: 8px; flex-wrap: wrap; justify-content: center; }
          .gov-header img { height: 60px; }
          .gov-divider { display: none; }
          .gov-header-text { text-align: center; }
          .card-box { padding: 24px 16px; }
          .card-heading { font-size: 22px; }
        }
      `}</style>

      <div className="login-root">

        {/* ══ SECTION 1: Government Header ══ */}
        <header className="gov-header">
          <img src={getImgSrc(branding.authHeaderLogo)} alt="Header Logo" />
          <div className="gov-divider" />
          <div className="gov-header-text">
            <span className="title-bn">{branding.authHeaderTitleBn}</span>
            <span className="title-en">{branding.authHeaderTitleEn}</span>
          </div>
        </header>

        {/* ══ SECTION 2: Main Login Form ══ */}
        <main className="main-section">
          <div className="form-card">

            {/* DESH Logo + label */}


            {/* Card */}
            <div className="card-box">
              <div className="desh-logo-wrap flex justify-center text-center mx-auto flex-wrap gap-2">
                {(branding.authCardLogos || []).map((logo, i) => (
                  <img key={i} src={getImgSrc(logo)} alt="Logo" className='h-12' style={{ objectFit: 'contain' }} />
                ))}
              </div>
              <span className="system-label card-subheading -mt-8 text-xs flex justify-center mx-auto text-center">{branding.authSystemLabel}</span>
              <h2 className="card-heading text-center">Sign In</h2>
              <p className="card-subheading text-center">Sign in to continue to your account</p>

              <form onSubmit={submit}>
                {/* Email */}
                <div className="field-wrap">
                  <span className="field-icon">✉</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handle}
                    required
                    placeholder="Email address"
                    className="field-input"
                  />
                </div>

                {/* Password */}
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handle}
                    required
                    placeholder="Password"
                    className="field-input"
                    style={{ paddingRight: 56 }}
                  />
                  <button
                    type="button"
                    className="show-btn"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                {/* ── CAPTCHA verification ── */}
                <CaptchaWidget
                  sessionKey="captcha_login"
                  onVerify={setCaptchaDone}
                />

                <button
                  type="submit"
                  disabled={loading || !captchaDone}
                  className="submit-btn"
                  style={{ opacity: !captchaDone ? 0.5 : 1 }}
                >
                  {loading
                    ? <><span className="spinner" /> Signing in…</>
                    : 'Sign In →'}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">OR</span>
                <div className="divider-line" />
              </div>

              <button onClick={handleGoogle} disabled={gLoading || !captchaDone} className="google-btn" style={{ opacity: !captchaDone ? 0.5 : 1 }}>
                {gLoading
                  ? 'Connecting…'
                  : <>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>}
              </button>

              <div className="card-links">
                <p>
                  Don't have an account?{' '}
                  <Link to="/register" className="reg-link">Register</Link>
                </p>
                <Link to="/admin/login" className="admin-link">
                  🔐 Admin Portal
                </Link>
              </div>
            </div>

          </div>
        </main>

        {/* ══ SECTION 3: Partner Footer ══ */}
        <PartnerFooter />

      </div>
    </>
  );
}