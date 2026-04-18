import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../services/firebase';

const SERVER_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

function getLogoSrc(path) {
    if (path && path.startsWith('/uploads/')) return `${SERVER_URL}${path}`;
    return path;
}

export default function Settings() {
    const axiosSecure = useAxiosSecure();
    const [site, setSite] = useState({ siteName: 'DESH Project', maxFileSize: 10, allowedTypes: 'pdf,jpg,jpeg,png' });
    const [pass, setPass] = useState({ current: '', newPass: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [bannerUrl, setBannerUrl] = useState('');
    const [bannerPreview, setBannerPreview] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const bannerInputRef = useRef(null);

    // Footer CMS state
    const [footerLabel, setFooterLabel] = useState('Institutional Partners & Supporters');
    const [footerLogos, setFooterLogos] = useState([]);
    const [savingFooter, setSavingFooter] = useState(false);
    const [partnerLogoFile, setPartnerLogoFile] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const partnerLogoInputRef = useRef(null);

    // Auth page branding state
    const AUTH_LOGO_FIELDS = [
        { key: 'authHeaderLogo',   label: 'Header (Navbar) Logo',    hint: 'Displayed top-left on all auth pages' },
        { key: 'authCardLogoLeft', label: 'Card Left Logo',           hint: 'Left logo inside the login/register card' },
        { key: 'authCardLogoRight',label: 'Card Right Logo',          hint: 'Right logo inside the login/register card' },
    ];
    const [authBranding, setAuthBranding] = useState({
        authHeaderLogo:    '/images/bdLogo.jpg',
        authHeaderTitleBn: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
        authHeaderTitleEn: "Government of the People's Republic of Bangladesh",
        authCardLogoLeft:  '/images/0_HBRI_Picture3-removebg-preview.png',
        authCardLogoRight: '/images/logo (1).png',
        authSystemLabel:   'Green Building Assessment System',
    });
    const [savingAuth, setSavingAuth] = useState(false);
    const [uploadingAuthLogo, setUploadingAuthLogo] = useState(null); // key of field being uploaded

    // Calculate button global defaults
    const [calcBtnName, setCalcBtnName] = useState('Calculate');
    const [calcBtnColor, setCalcBtnColor] = useState('#22A84B');
    const [savingCalcBtn, setSavingCalcBtn] = useState(false);
    const authLogoInputRefs = {
        authHeaderLogo:    useRef(null),
        authCardLogoLeft:  useRef(null),
        authCardLogoRight: useRef(null),
    };

    useEffect(() => {
        axiosSecure.get('/settings')
            .then(res => {
                const s = res.data.settings;
                setSite({ siteName: s.siteName, maxFileSize: s.maxFileSize || 10, allowedTypes: s.allowedTypes || 'pdf,jpg,jpeg,png' });
                if (s.scoreCardBanner) setBannerUrl(s.scoreCardBanner);
                if (s.footerLabel) setFooterLabel(s.footerLabel);
                if (s.footerPartnerLogos) setFooterLogos(s.footerPartnerLogos);
                if (s.calcBtnName)  setCalcBtnName(s.calcBtnName);
                if (s.calcBtnColor) setCalcBtnColor(s.calcBtnColor);
                setAuthBranding(prev => ({
                    ...prev,
                    ...(s.authHeaderLogo    && { authHeaderLogo:    s.authHeaderLogo }),
                    ...(s.authHeaderTitleBn && { authHeaderTitleBn: s.authHeaderTitleBn }),
                    ...(s.authHeaderTitleEn && { authHeaderTitleEn: s.authHeaderTitleEn }),
                    ...(s.authCardLogoLeft  && { authCardLogoLeft:  s.authCardLogoLeft }),
                    ...(s.authCardLogoRight && { authCardLogoRight: s.authCardLogoRight }),
                    ...(s.authSystemLabel   && { authSystemLabel:   s.authSystemLabel }),
                }));
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

    const handleBannerFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(file));
    };

    const uploadBanner = async () => {
        if (!bannerFile) return;
        setUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append('banner', bannerFile);
            const res = await axiosSecure.post('/settings/banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setBannerUrl(res.data.scoreCardBanner);
            setBannerFile(null);
            setBannerPreview(null);
            if (bannerInputRef.current) bannerInputRef.current.value = '';
            toast.success('Banner uploaded!');
        } catch {
            toast.error('Failed to upload banner');
        } finally {
            setUploadingBanner(false);
        }
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

    const saveAuthBranding = async () => {
        setSavingAuth(true);
        try {
            await axiosSecure.put('/settings', {
                authHeaderTitleBn: authBranding.authHeaderTitleBn,
                authHeaderTitleEn: authBranding.authHeaderTitleEn,
                authSystemLabel:   authBranding.authSystemLabel,
            });
            toast.success('Auth branding saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSavingAuth(false); }
    };

    const uploadAuthLogoField = async (field) => {
        const file = authLogoInputRefs[field]?.current?.files?.[0];
        if (!file) return;
        setUploadingAuthLogo(field);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await axiosSecure.post(`/settings/auth-logo/${field}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setAuthBranding(prev => ({ ...prev, [field]: res.data.path }));
            if (authLogoInputRefs[field]?.current) authLogoInputRefs[field].current.value = '';
            toast.success('Logo uploaded!');
        } catch { toast.error('Upload failed'); }
        finally { setUploadingAuthLogo(null); }
    };

    const saveFooter = async () => {
        setSavingFooter(true);
        try {
            await axiosSecure.put('/settings', { footerLabel, footerPartnerLogos: footerLogos });
            toast.success('Footer settings saved!');
        } catch { toast.error('Failed to save footer'); }
        finally { setSavingFooter(false); }
    };

    const uploadPartnerLogo = async () => {
        if (!partnerLogoFile) return;
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', partnerLogoFile);
            const res = await axiosSecure.post('/settings/partner-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setFooterLogos(res.data.settings.footerPartnerLogos);
            setPartnerLogoFile(null);
            if (partnerLogoInputRef.current) partnerLogoInputRef.current.value = '';
            toast.success('Partner logo uploaded!');
        } catch { toast.error('Failed to upload logo'); }
        finally { setUploadingLogo(false); }
    };

    const removePartnerLogo = async (logoPath) => {
        try {
            const res = await axiosSecure.delete('/settings/partner-logo', { data: { logoPath } });
            setFooterLogos(res.data.settings.footerPartnerLogos);
            toast.success('Logo removed');
        } catch { toast.error('Failed to remove logo'); }
    };

    const saveCalcBtn = async () => {
        setSavingCalcBtn(true);
        try {
            await axiosSecure.put('/settings', { calcBtnName, calcBtnColor });
            toast.success('Calculate button defaults saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSavingCalcBtn(false); }
    };

    return (
        <Layout isAdmin>
            <div className="mb-8 fade-in-up">
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Settings</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>System configuration</p>
            </div>

            <div className="max-w-2xl space-y-6">
                {/* <div className="glass-card p-6">
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
                </div> */}

                {/* Score Card Banner */}
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-1">🖼 Score Card Banner</h2>
                    <p className="text-xs mb-5" style={{ color: 'var(--tx-muted)' }}>
                        Image displayed on the right side of the Leaf Score Card for all users.
                    </p>

                    {/* Current banner preview */}
                    {(bannerPreview || bannerUrl) && (
                        <div style={{ marginBottom: 16 }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>
                                {bannerPreview ? 'NEW PREVIEW' : 'CURRENT BANNER'}
                            </p>
                            <div style={{
                                borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)',
                                maxHeight: 180, background: 'var(--bg-subtle)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <img
                                    src={bannerPreview || `${SERVER_URL}${bannerUrl}`}
                                    alt="Score card banner"
                                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Drop zone / file picker */}
                    <div
                        onClick={() => bannerInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border)', borderRadius: 12,
                            padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                            background: 'rgba(0,0,0,0.02)', marginBottom: 14,
                            transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--g500)'; e.currentTarget.style.background = 'rgba(34,168,75,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                    >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', margin: '0 0 4px' }}>
                            {bannerFile ? bannerFile.name : 'Click to select an image'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--tx-muted)', margin: 0 }}>
                            PNG, JPG, WEBP — max 5 MB · Recommended: 1400×250 px
                        </p>
                        <input
                            ref={bannerInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleBannerFileChange}
                        />
                    </div>

                    <button
                        onClick={uploadBanner}
                        disabled={!bannerFile || uploadingBanner}
                        className="btn-primary-green text-sm"
                        style={{ opacity: (!bannerFile || uploadingBanner) ? 0.5 : 1 }}
                    >
                        {uploadingBanner ? 'Uploading…' : '⬆ Upload Banner'}
                    </button>
                </div>

                {/* Auth Page Branding */}
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-1">🎨 Auth Page Branding</h2>
                    <p className="text-xs mb-5" style={{ color: 'var(--tx-muted)' }}>
                        Controls the navbar logo, titles, card logos, and system label shown on Login, Register, and Admin Login pages.
                    </p>

                    {/* Header (Navbar) */}
                    <p className="text-xs font-bold mb-3" style={{ color: 'var(--tx-muted)', letterSpacing: '0.08em' }}>NAVBAR / HEADER</p>

                    {/* Header logo upload */}
                    <div className="mb-4">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>HEADER LOGO</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                            <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '6px 10px', background: 'var(--bg-subtle)' }}>
                                <img src={getLogoSrc(authBranding.authHeaderLogo)} alt="" style={{ height: 40, objectFit: 'contain', maxWidth: 120 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <input ref={authLogoInputRefs.authHeaderLogo} type="file" accept="image/*"
                                    className="input-dark px-3 py-2 text-sm" style={{ flex: 1, minWidth: 0 }} />
                                <button onClick={() => uploadAuthLogoField('authHeaderLogo')}
                                    disabled={uploadingAuthLogo === 'authHeaderLogo'}
                                    className="btn-primary-green text-sm" style={{ whiteSpace: 'nowrap' }}>
                                    {uploadingAuthLogo === 'authHeaderLogo' ? 'Uploading…' : '⬆ Upload'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Title Bengali */}
                    <div className="mb-4">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>TITLE (BENGALI)</label>
                        <input value={authBranding.authHeaderTitleBn}
                            onChange={e => setAuthBranding(prev => ({ ...prev, authHeaderTitleBn: e.target.value }))}
                            className="input-dark w-full px-4 py-3 text-sm" />
                    </div>

                    {/* Title English */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>TITLE (ENGLISH)</label>
                        <input value={authBranding.authHeaderTitleEn}
                            onChange={e => setAuthBranding(prev => ({ ...prev, authHeaderTitleEn: e.target.value }))}
                            className="input-dark w-full px-4 py-3 text-sm" />
                    </div>

                    {/* Card Logos */}
                    <p className="text-xs font-bold mb-3" style={{ color: 'var(--tx-muted)', letterSpacing: '0.08em' }}>CARD LOGOS</p>

                    {AUTH_LOGO_FIELDS.filter(f => f.key !== 'authHeaderLogo').map(({ key, label, hint }) => (
                        <div key={key} className="mb-4">
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>{label.toUpperCase()}</label>
                            <p className="text-xs mb-2" style={{ color: 'var(--tx-muted)' }}>{hint}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '6px 10px', background: 'var(--bg-subtle)' }}>
                                    <img src={getLogoSrc(authBranding[key])} alt="" style={{ height: 36, objectFit: 'contain', maxWidth: 100 }} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    <input ref={authLogoInputRefs[key]} type="file" accept="image/*"
                                        className="input-dark px-3 py-2 text-sm" style={{ flex: 1, minWidth: 0 }} />
                                    <button onClick={() => uploadAuthLogoField(key)}
                                        disabled={uploadingAuthLogo === key}
                                        className="btn-primary-green text-sm" style={{ whiteSpace: 'nowrap' }}>
                                        {uploadingAuthLogo === key ? 'Uploading…' : '⬆ Upload'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* System label */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>SYSTEM LABEL TEXT</label>
                        <input value={authBranding.authSystemLabel}
                            onChange={e => setAuthBranding(prev => ({ ...prev, authSystemLabel: e.target.value }))}
                            className="input-dark w-full px-4 py-3 text-sm"
                            placeholder="e.g. Green Building Assessment System" />
                    </div>

                    <button onClick={saveAuthBranding} disabled={savingAuth} className="btn-primary-green text-sm">
                        {savingAuth ? 'Saving...' : '💾 Save Auth Branding'}
                    </button>
                </div>

                {/* Footer CMS */}
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-1">🦶 Footer Settings</h2>
                    <p className="text-xs mb-5" style={{ color: 'var(--tx-muted)' }}>
                        Manage the partner footer shown on all pages (login, register, dashboard).
                    </p>

                    {/* Footer label text */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>FOOTER LABEL TEXT</label>
                        <input
                            value={footerLabel}
                            onChange={e => setFooterLabel(e.target.value)}
                            className="input-dark w-full px-4 py-3 text-sm"
                            placeholder="e.g. Institutional Partners & Supporters"
                        />
                    </div>

                    {/* Current partner logos */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>
                            PARTNER LOGOS ({footerLogos.length})
                        </label>
                        {footerLogos.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>No logos added yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                {footerLogos.map((logo, i) => logo && (
                                    <div key={i} style={{
                                        position: 'relative',
                                        border: '1.5px solid var(--border)',
                                        borderRadius: 10,
                                        padding: '8px 10px',
                                        background: 'var(--bg-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}>
                                        <img
                                            src={getLogoSrc(logo)}
                                            alt=""
                                            style={{ height: 36, objectFit: 'contain', maxWidth: 80 }}
                                        />
                                        <button
                                            onClick={() => removePartnerLogo(logo)}
                                            title="Remove"
                                            style={{
                                                background: 'rgba(220,50,50,0.1)',
                                                border: 'none',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                color: '#c0392b',
                                                fontWeight: 700,
                                                fontSize: 13,
                                                padding: '2px 7px',
                                                lineHeight: 1.4,
                                            }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Upload new partner logo */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>UPLOAD NEW PARTNER LOGO</label>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                ref={partnerLogoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={e => setPartnerLogoFile(e.target.files?.[0] || null)}
                                className="input-dark px-3 py-2 text-sm"
                                style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                                onClick={uploadPartnerLogo}
                                disabled={!partnerLogoFile || uploadingLogo}
                                className="btn-primary-green text-sm"
                                style={{ opacity: (!partnerLogoFile || uploadingLogo) ? 0.5 : 1, whiteSpace: 'nowrap' }}
                            >
                                {uploadingLogo ? 'Uploading…' : '⬆ Upload Logo'}
                            </button>
                        </div>
                        {partnerLogoFile && (
                            <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>{partnerLogoFile.name}</p>
                        )}
                    </div>

                    <button onClick={saveFooter} disabled={savingFooter} className="btn-primary-green text-sm">
                        {savingFooter ? 'Saving...' : '💾 Save Footer Settings'}
                    </button>
                </div>

                {/* Calculate Button Defaults */}
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-1">🧮 Calculate Button Defaults</h2>
                    <p className="text-xs mb-5" style={{ color: 'var(--tx-muted)' }}>
                        Global defaults for the Calculate button. These are pre-filled when you configure the button on individual input fields — you can override them per field.
                    </p>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>BUTTON NAME</label>
                            <input
                                value={calcBtnName}
                                onChange={e => setCalcBtnName(e.target.value)}
                                className="input-dark w-full px-4 py-3 text-sm"
                                placeholder="Calculate"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>BUTTON COLOR</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="color"
                                    value={calcBtnColor}
                                    onChange={e => setCalcBtnColor(e.target.value)}
                                    style={{
                                        width: 44, height: 44, border: '2px solid var(--border-md)',
                                        borderRadius: 10, cursor: 'pointer', padding: 3,
                                        background: 'var(--bg-soft)', flexShrink: 0
                                    }}
                                />
                                <input
                                    value={calcBtnColor}
                                    onChange={e => setCalcBtnColor(e.target.value)}
                                    className="input-dark px-4 py-3 text-sm"
                                    style={{ width: 130, fontFamily: 'monospace' }}
                                    placeholder="#22A84B"
                                />
                                <div style={{
                                    padding: '10px 20px', borderRadius: 10,
                                    background: calcBtnColor || '#22A84B', color: '#fff',
                                    fontWeight: 700, fontSize: 13,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    userSelect: 'none', whiteSpace: 'nowrap'
                                }}>
                                    🧮 {calcBtnName || 'Calculate'}
                                </div>
                            </div>
                        </div>
                        <button onClick={saveCalcBtn} disabled={savingCalcBtn} className="btn-primary-green text-sm">
                            {savingCalcBtn ? 'Saving...' : '💾 Save Defaults'}
                        </button>
                    </div>
                </div>

                {/* <div className="glass-card p-6">
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
                </div> */}
            </div>
        </Layout>
    );
}