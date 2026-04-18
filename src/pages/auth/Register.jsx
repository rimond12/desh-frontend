import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import PartnerFooter from '../../components/shared/PartnerFooter.jsx';
import useAuthBranding, { getImgSrc } from '../../hooks/useAuthBranding.js';

export default function Register() {
  const branding = useAuthBranding();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Min. 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      toast.success('Welcome to DESH!');
      navigate('/dashboard');
    } catch (err) { toast.error(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['', '#EA580C', '#D97706', '#22A84B'][strength];
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'][strength];

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

        .reg-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f4f0;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .reg-root::before {
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
        .reg-root::after {
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

        .gov-header {
          width: 100%;
          background: #fff;
          border-bottom: 1px solid rgba(34,139,60,0.12);
          padding: 14px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          position: relative;
          z-index: 10;
          animation: fadeIn 0.5s ease both;
          box-shadow: 0 1px 0 rgba(34,139,60,0.08), 0 4px 24px rgba(0,0,0,0.04);
        }
        .gov-header img { height: 100px; object-fit: contain; }
        .gov-header-text { display: flex; flex-direction: column; }
        .gov-header-text .title-bn {
          font-size: 15px; font-weight: 600; color: #1a4a28;
          line-height: 1.4; letter-spacing: 0.01em;
        }
        .gov-header-text .title-en {
          font-size: 11px; color: #5a7a63; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .gov-divider { width: 1px; height: 50px; background: rgba(34,139,60,0.2); }

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

        .field-wrap { position: relative; margin-bottom: 14px; }
        .field-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          font-size: 15px; color: #b0c8b4; pointer-events: none; line-height: 1;
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
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 9px; font-weight: 800;
          letter-spacing: 0.12em; color: #8fba96; cursor: pointer;
          font-family: 'DM Sans', sans-serif; padding: 4px 6px; border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .show-btn:hover { color: #2e9e52; background: rgba(46,158,82,0.07); }

        .strength-bars { display: flex; gap: 4px; margin-bottom: 4px; }
        .strength-bar { flex: 1; height: 3px; border-radius: 99px; transition: all 0.3s; }
        .strength-label {
          font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mismatch-msg { color: #EA580C; font-size: 12px; font-weight: 600; margin: -6px 0 6px; }

        .submit-btn {
          width: 100%; padding: 14px; margin-top: 8px; border: none; border-radius: 12px;
          background: linear-gradient(135deg, #1e8c44 0%, #2db55d 100%);
          color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: 0.04em; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 16px rgba(30,140,68,0.25), 0 1px 0 rgba(255,255,255,0.2) inset;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(30,140,68,0.32); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.8s linear infinite; display: inline-block;
        }

        .card-links { margin-top: 22px; text-align: center; }
        .card-links p { font-size: 13px; color: #8ba98f; font-weight: 500; }
        .card-links a.reg-link { color: #1e8c44; font-weight: 700; text-decoration: none; }
        .card-links a.reg-link:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .gov-header { padding: 12px 20px; }
          .card-box { padding: 28px 20px; }
        }
      `}</style>

      <div className="reg-root">

        {/* ══ SECTION 1: Government Header ══ */}
        <header className="gov-header">
          <img src={getImgSrc(branding.authHeaderLogo)} alt="Header Logo" />
          <div className="gov-divider" />
          <div className="gov-header-text">
            <span className="title-bn">{branding.authHeaderTitleBn}</span>
            <span className="title-en">{branding.authHeaderTitleEn}</span>
          </div>
        </header>

        {/* ══ SECTION 2: Main Register Form ══ */}
        <main className="main-section">
          <div className="form-card">

            {/* DESH Logo + label */}

            {/* Card */}
            <div className="card-box">
              <div className="desh-logo-wrap flex justify-center mx-auto">
                <img src={getImgSrc(branding.authCardLogoLeft)} alt="Logo" className='h-12' />
                <img src={getImgSrc(branding.authCardLogoRight)} alt="Logo" className='h-14 mr-5' />
              </div>
              <span className="system-label card-subheading -mt-8 text-xs flex justify-center mx-auto text-center">{branding.authSystemLabel}</span>
              <h2 className="card-heading text-center">Create Account</h2>
              <p className="card-subheading text-center">Join the green building community</p>

              <form onSubmit={submit}>
                {/* Full Name */}
                <div className="field-wrap">
                  <span className="field-icon">👤</span>
                  <input type="text" name="name" value={form.name} onChange={handle}
                    required placeholder="Full name" className="field-input" />
                </div>

                {/* Email */}
                <div className="field-wrap">
                  <span className="field-icon">✉</span>
                  <input type="email" name="email" value={form.email} onChange={handle}
                    required placeholder="Email address" className="field-input" />
                </div>

                {/* Password */}
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input type={showPass ? 'text' : 'password'} name="password"
                    value={form.password} onChange={handle} required
                    placeholder="Password (min. 6 chars)" className="field-input"
                    style={{ paddingRight: 56 }} />
                  <button type="button" className="show-btn"
                    onClick={() => setShowPass(!showPass)}>
                    {showPass ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="strength-bars">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="strength-bar"
                          style={{ background: strength >= i ? strengthColor : '#e2ede4' }} />
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: strengthColor }}>
                      {strengthLabel} Password
                    </span>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input type="password" name="confirm" value={form.confirm}
                    onChange={handle} required placeholder="Confirm password"
                    className="field-input" />
                </div>

                {form.confirm && form.password !== form.confirm && (
                  <p className="mismatch-msg">⚠ Passwords don't match</p>
                )}

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading
                    ? <><span className="spinner" /> Creating…</>
                    : 'Create Account →'}
                </button>
              </form>

              <div className="card-links">
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="reg-link">Sign in</Link>
                </p>
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