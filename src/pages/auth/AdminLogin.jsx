import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import PartnerFooter from '../../components/shared/PartnerFooter.jsx';
import useAuthBranding, { getImgSrc } from '../../hooks/useAuthBranding.js';

export default function AdminLogin() {
  const branding = useAuthBranding();
  const { login, loginWithGoogle, getRoleFromDb } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await login(form.email, form.password);
      const role = await getRoleFromDb();
      if (role !== 'admin') { toast.error('Access denied. Admin only.'); setLoading(false); return; }
      toast.success('Welcome, Admin!'); navigate('/admin');
    } catch {
      toast.error('Invalid credentials');
    }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      await loginWithGoogle();
      const role = await getRoleFromDb();
      if (role !== 'admin') { toast.error('Access denied. Admin only.'); setGLoading(false); return; }
      toast.success('Welcome, Admin!'); navigate('/admin');
    } catch { toast.error('Google sign-in failed'); }
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

        .admin-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #faf5f0;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .admin-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 900px 600px at 15% 10%, rgba(180,80,10,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 700px 500px at 85% 90%, rgba(180,80,10,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 400px 400px at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }
        .admin-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(180,80,10,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,80,10,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .gov-header {
          width: 100%;
          background: #fff;
          border-bottom: 1px solid rgba(180,80,10,0.12);
          padding: 14px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          position: relative;
          z-index: 10;
          animation: fadeIn 0.5s ease both;
          box-shadow: 0 1px 0 rgba(180,80,10,0.08), 0 4px 24px rgba(0,0,0,0.04);
        }
        .gov-header img { height: 100px; object-fit: contain; }
        .gov-header-text { display: flex; flex-direction: column; }
        .gov-header-text .title-bn {
          font-size: 15px; font-weight: 600; color: #3d1a06;
          line-height: 1.4; letter-spacing: 0.01em;
        }
        .gov-header-text .title-en {
          font-size: 11px; color: #8a5a3a; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .gov-divider { width: 1px; height: 50px; background: rgba(180,80,10,0.2); }

        .main-section {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 48px 20px; position: relative; z-index: 1;
        }

        .form-card {
          width: 100%; max-width: 440px;
          animation: fadeUp 0.6s ease 0.15s both;
        }

        .desh-logo-wrap { text-align: center; margin-bottom: 32px; }
        .desh-logo-wrap img {
           object-fit: contain;
          filter: drop-shadow(0 4px 16px rgba(180,80,10,0.18));
        }
        .desh-logo-wrap .system-label {
          display: block; margin-top: 10px;
          font-size: 10px; font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; color: #b07050;
        }

        .warn-banner {
          display: flex; gap: 10px; align-items: flex-start;
          background: rgba(234,88,12,0.08);
          border: 1px solid rgba(234,88,12,0.22);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 16px;
          font-size: 12px; font-weight: 600;
          color: #92400e;
          font-family: 'DM Sans', sans-serif;
        }
        .warn-banner span { font-size: 15px; flex-shrink: 0; }

        .card-box {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(180,80,10,0.12);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.9) inset,
            0 8px 32px rgba(180,80,10,0.08),
            0 32px 80px rgba(0,0,0,0.06);
          padding: 36px 32px;
        }

        .card-heading {
          font-family: 'Playfair Display', serif;
          font-size: 26px; font-weight: 700;
          color: #2d1106; margin-bottom: 4px; letter-spacing: -0.02em;
        }
        .card-subheading {
          font-size: 13px; color: #b08060; font-weight: 500; margin-bottom: 28px;
        }

        .field-wrap { position: relative; margin-bottom: 14px; }
        .field-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          font-size: 15px; color: #c4a080; pointer-events: none; line-height: 1;
        }
        .field-input {
          width: 100%; padding: 13px 16px 13px 44px;
          border: 1.5px solid #f0ddd0; border-radius: 12px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          font-weight: 500; color: #3d1a06; background: #fdf9f6;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input::placeholder { color: #c8a888; }
        .field-input:focus {
          border-color: #ea580c;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(234,88,12,0.1);
        }
        .show-btn {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 9px; font-weight: 800;
          letter-spacing: 0.12em; color: #c09070; cursor: pointer;
          font-family: 'DM Sans', sans-serif; padding: 4px 6px; border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .show-btn:hover { color: #ea580c; background: rgba(234,88,12,0.07); }

        .submit-btn {
          width: 100%; padding: 14px; margin-top: 8px; border: none; border-radius: 12px;
          background: linear-gradient(135deg, #92400e 0%, #ea580c 100%);
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 16px rgba(234,88,12,0.28), 0 1px 0 rgba(255,255,255,0.2) inset;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(234,88,12,0.36); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
        }

        .divider {
          display: flex; align-items: center; gap: 12px; margin: 20px 0;
        }
        .divider-line { flex: 1; height: 1px; background: #f0e0d0; }
        .divider-text { font-size: 11px; font-weight: 700; color: #c8a080; letter-spacing: 0.08em; }

        .google-btn {
          width: 100%; padding: 13px;
          border: 1.5px solid #f0ddd0; border-radius: 12px;
          background: #fff; color: #3d1a06;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .google-btn:hover:not(:disabled) {
          border-color: #e0b090; background: #fdf6f0;
          box-shadow: 0 4px 12px rgba(180,80,10,0.08);
        }
        .google-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .card-links { margin-top: 22px; text-align: center; }
        .card-links p { font-size: 13px; color: #b08060; font-weight: 500; }
        .card-links a { color: #1e8c44; font-weight: 700; text-decoration: none; }
        .card-links a:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .gov-header { padding: 12px 16px; gap: 8px; flex-wrap: wrap; justify-content: center; }
          .gov-header img { height: 60px; }
          .gov-divider { display: none; }
          .gov-header-text { text-align: center; }
          .card-box { padding: 24px 16px; }
          .card-heading { font-size: 22px; }
        }
      `}</style>

      <div className="admin-root">

        <header className="gov-header">
          <img src={getImgSrc(branding.authHeaderLogo)} alt="Header Logo" />
          <div className="gov-divider" />
          <div className="gov-header-text">
            <span className="title-bn">{branding.authHeaderTitleBn}</span>
            <span className="title-en">{branding.authHeaderTitleEn}</span>
          </div>
        </header>

        <main className="main-section">
          <div className="form-card">

            <div className="warn-banner">
              <span>⚠️</span>
              Authorized administrators only. Unauthorized access is prohibited.
            </div>

            <div className="card-box">
              <div className="desh-logo-wrap flex justify-center mx-auto flex-wrap gap-2">
                {(branding.authCardLogos || []).map((logo, i) => (
                  <img key={i} src={getImgSrc(logo)} alt="Logo" className='h-14' style={{ objectFit: 'contain' }} />
                ))}
              </div>
              {(branding.authSystemLabel || branding.authSystemLabel2) && (
                <div className="system-labels-wrap flex flex-col items-center justify-center -mt-4 mb-6 text-center">
                  {branding.authSystemLabel && (
                    <span className="text-xs font-semibold tracking-wide text-[#7a9e84] whitespace-nowrap">
                      {branding.authSystemLabel.replace(/(\S)\(/g, '$1 (')}
                    </span>
                  )}
                  {branding.authSystemLabel2 && (
                    <span className="text-[9.5px] sm:text-[11px] font-medium tracking-wide text-[#8ba98f] mt-1 leading-normal whitespace-nowrap">
                      {branding.authSystemLabel2.replace(/(\S)\(/g, '$1 (')}
                    </span>
                  )}
                </div>
              )}
              <h2 className="card-heading text-center">Admin Sign In</h2>
              <p className="card-subheading text-center">Enter your admin credentials to continue</p>

              <button onClick={handleGoogle} disabled={gLoading} className="google-btn">
                {gLoading ? 'Verifying…' : (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">OR</span>
                <div className="divider-line" />
              </div>

              <form onSubmit={submit}>
                <div className="field-wrap">
                  <span className="field-icon">✉</span>
                  <input type="email" name="email" value={form.email} onChange={handle}
                    required placeholder="Admin email" className="field-input" />
                </div>

                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input type={showPass ? 'text' : 'password'} name="password"
                    value={form.password} onChange={handle} required
                    placeholder="Password" className="field-input"
                    style={{ paddingRight: 56 }} />
                  <button type="button" className="show-btn"
                    onClick={() => setShowPass(!showPass)}>
                    {showPass ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading
                    ? <><span className="spinner" /> Verifying…</>
                    : '⚙ Sign In as Admin'}
                </button>
              </form>

              <div className="card-links">
                <p>
                  Not an admin?{' '}
                  <Link to="/login">User Login →</Link>
                </p>
              </div>
            </div>

          </div>
        </main>

        <PartnerFooter />

      </div>
    </>
  );
}