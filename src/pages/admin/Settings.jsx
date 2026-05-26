import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { NAV_CONFIG, NAV_LABEL_DEFAULTS } from '../../config/navConfig.js';
import ChangePasswordCard from '../../components/shared/ChangePasswordCard.jsx';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getLogoSrc(path) {
    if (path && path.startsWith('/uploads/')) return `${SERVER_URL}${path}`;
    return path;
}

export default function Settings() {
    const axiosSecure = useAxiosSecure();
    const [site, setSite] = useState({ siteName: 'DESH Project', maxFileSize: 10, allowedTypes: 'pdf,jpg,jpeg,png' });
    const [saving, setSaving] = useState(false);

    // Footer CMS state
    const [footerLabel, setFooterLabel] = useState('Institutional Partners & Supporters');
    const [footerLogos, setFooterLogos] = useState([]);
    const [savingFooter, setSavingFooter] = useState(false);
    const [partnerLogoFile, setPartnerLogoFile] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const partnerLogoInputRef = useRef(null);

    // Auth page branding state
    const [authBranding, setAuthBranding] = useState({
        authHeaderLogo: '/images/bdLogo.jpg',
        authHeaderTitleBn: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
        authHeaderTitleEn: "Government of the People's Republic of Bangladesh",
        authSystemLabel: 'Sustainable Design Assessment System',
    });
    const [authCardLogos, setAuthCardLogos] = useState([]);
    const [authCardLogoFile, setAuthCardLogoFile] = useState(null);
    const [uploadingCardLogo, setUploadingCardLogo] = useState(false);
    const cardLogoInputRef = useRef(null);
    const [savingAuth, setSavingAuth] = useState(false);
    const [uploadingAuthLogo, setUploadingAuthLogo] = useState(null); // key of field being uploaded

    // Calculate button global defaults
    const [calcBtnName, setCalcBtnName] = useState('Calculate');
    const [calcBtnColor, setCalcBtnColor] = useState('#22A84B');
    const [savingCalcBtn, setSavingCalcBtn] = useState(false);

    // Navigation labels state
    const [navLabels, setNavLabels] = useState({ ...NAV_LABEL_DEFAULTS });
    const [savingNav, setSavingNav] = useState(false);
    const [navTab, setNavTab] = useState('shared');

    const authLogoInputRefs = {
        authHeaderLogo: useRef(null),
    };

    useEffect(() => {
        axiosSecure.get('/settings')
            .then(res => {
                const s = res.data.settings;
                setSite({ siteName: s.siteName, maxFileSize: s.maxFileSize || 10, allowedTypes: s.allowedTypes || 'pdf,jpg,jpeg,png' });
                if (s.footerLabel) setFooterLabel(s.footerLabel);
                if (s.footerPartnerLogos) setFooterLogos(s.footerPartnerLogos);
                if (s.calcBtnName) setCalcBtnName(s.calcBtnName);
                if (s.calcBtnColor) setCalcBtnColor(s.calcBtnColor);
                setAuthBranding(prev => ({
                    ...prev,
                    ...(s.authHeaderLogo && { authHeaderLogo: s.authHeaderLogo }),
                    ...(s.authHeaderTitleBn && { authHeaderTitleBn: s.authHeaderTitleBn }),
                    ...(s.authHeaderTitleEn && { authHeaderTitleEn: s.authHeaderTitleEn }),
                    ...(s.authSystemLabel && { authSystemLabel: s.authSystemLabel }),
                }));
                if (s.authCardLogos && s.authCardLogos.length > 0) setAuthCardLogos(s.authCardLogos);
                else setAuthCardLogos(['/images/0_HBRI_Picture3-removebg-preview.png', '/images/DESH_Picture1.png']);
                if (s.navLabels) setNavLabels(prev => ({ ...prev, ...s.navLabels }));
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

    const saveAuthBranding = async () => {
        setSavingAuth(true);
        try {
            await axiosSecure.put('/settings', {
                authHeaderTitleBn: authBranding.authHeaderTitleBn,
                authHeaderTitleEn: authBranding.authHeaderTitleEn,
                authSystemLabel: authBranding.authSystemLabel,
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

    const uploadCardLogo = async () => {
        if (!authCardLogoFile) return;
        setUploadingCardLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', authCardLogoFile);
            const res = await axiosSecure.post('/settings/auth-card-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setAuthCardLogos(res.data.settings.authCardLogos);
            setAuthCardLogoFile(null);
            if (cardLogoInputRef.current) cardLogoInputRef.current.value = '';
            toast.success('Card logo uploaded!');
        } catch { toast.error('Upload failed'); }
        finally { setUploadingCardLogo(false); }
    };

    const removeCardLogo = async (logoPath) => {
        try {
            const res = await axiosSecure.delete('/settings/auth-card-logo', { data: { logoPath } });
            setAuthCardLogos(res.data.settings.authCardLogos);
            toast.success('Logo removed');
        } catch { toast.error('Failed to remove logo'); }
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

    const saveNavLabels = async () => {
        setSavingNav(true);
        try {
            await axiosSecure.put('/settings', { navLabels });
            toast.success('Navigation labels saved!');
        } catch { toast.error('Failed to save'); }
        finally { setSavingNav(false); }
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

                    {/* Current card logos */}
                    <div className="mb-4">
                        <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>
                            CURRENT LOGOS ({authCardLogos.length})
                        </label>
                        {authCardLogos.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>No card logos added yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                {authCardLogos.map((logo, i) => logo && (
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
                                            onClick={() => removeCardLogo(logo)}
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

                    {/* Upload new card logo */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>UPLOAD NEW CARD LOGO</label>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                ref={cardLogoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={e => setAuthCardLogoFile(e.target.files?.[0] || null)}
                                className="input-dark px-3 py-2 text-sm"
                                style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                                onClick={uploadCardLogo}
                                disabled={!authCardLogoFile || uploadingCardLogo}
                                className="btn-primary-green text-sm"
                                style={{ opacity: (!authCardLogoFile || uploadingCardLogo) ? 0.5 : 1, whiteSpace: 'nowrap' }}
                            >
                                {uploadingCardLogo ? 'Uploading…' : '⬆ Upload Logo'}
                            </button>
                        </div>
                        {authCardLogoFile && (
                            <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>{authCardLogoFile.name}</p>
                        )}
                    </div>

                    {/* System label */}
                    <div className="mb-5">
                        <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>SYSTEM LABEL TEXT</label>
                        <input value={authBranding.authSystemLabel}
                            onChange={e => setAuthBranding(prev => ({ ...prev, authSystemLabel: e.target.value }))}
                            className="input-dark w-full px-4 py-3 text-sm"
                            placeholder="e.g. Sustainable Design Assessment System" />
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

                {/* Navigation Labels */}
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-1">🔤 Navigation &amp; Sidebar Labels</h2>
                    <p className="text-xs mb-1" style={{ color: 'var(--tx-muted)' }}>
                        Rename any sidebar item, section group, or page heading. Changes apply live for all users.
                    </p>
                    <p className="text-xs mb-5" style={{ color: 'var(--tx-muted)', fontStyle: 'italic' }}>
                        New routes added to <code style={{ fontFamily: 'monospace', background: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: 4 }}>navConfig.js</code> appear here automatically.
                    </p>

                    {/* Role tab bar */}
                    <div style={{ display: 'flex', gap: 2, borderBottom: '1.5px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
                        {NAV_CONFIG.map(roleGroup => {
                            const isActive = navTab === roleGroup.role;
                            // Count customised keys for this role
                            const allKeys = roleGroup.sections.flatMap(s => [
                                ...(s.sectionKey ? [s.sectionKey] : []),
                                ...s.items.map(i => i.key),
                            ]);
                            const customCount = allKeys.filter(k => navLabels[k] !== undefined && navLabels[k] !== NAV_LABEL_DEFAULTS[k]).length;
                            return (
                                <button
                                    key={roleGroup.role}
                                    onClick={() => setNavTab(roleGroup.role)}
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: 13,
                                        fontWeight: isActive ? 700 : 500,
                                        color: isActive ? roleGroup.roleColor : 'var(--tx-muted)',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: isActive ? `2.5px solid ${roleGroup.roleColor}` : '2.5px solid transparent',
                                        marginBottom: -1.5,
                                        cursor: 'pointer',
                                        transition: 'color 0.15s',
                                        whiteSpace: 'nowrap',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    <span>{roleGroup.roleIcon}</span>
                                    <span>{roleGroup.roleLabel}</span>
                                    {customCount > 0 && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700,
                                            background: roleGroup.roleColor,
                                            color: '#fff', borderRadius: 99,
                                            padding: '1px 6px', lineHeight: 1.6,
                                        }}>{customCount}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Active tab content */}
                    {(() => {
                        const activeRole = NAV_CONFIG.find(r => r.role === navTab);
                        if (!activeRole) return null;
                        return (
                            <div>
                                <p className="text-xs mb-4" style={{ color: 'var(--tx-muted)' }}>
                                    {activeRole.description}
                                </p>

                                {activeRole.sections.map((section, si) => {
                                    const sectionChanged = section.sectionKey
                                        && navLabels[section.sectionKey] !== undefined
                                        && navLabels[section.sectionKey] !== section.sectionDefault;

                                    return (
                                        <div key={si} style={{
                                            marginBottom: 16,
                                            border: '1.5px solid var(--border)',
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                        }}>
                                            {/* Section group header */}
                                            <div style={{
                                                background: 'var(--bg-subtle)',
                                                padding: '10px 14px',
                                                borderBottom: '1px solid var(--border)',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                            }}>
                                                {section.sectionKey ? (
                                                    <>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                                                            SECTION GROUP
                                                        </span>
                                                        <input
                                                            value={navLabels[section.sectionKey] ?? section.sectionDefault}
                                                            onChange={e => setNavLabels(prev => ({ ...prev, [section.sectionKey]: e.target.value }))}
                                                            placeholder={section.sectionDefault}
                                                            className="input-dark px-3 py-1.5 text-xs font-semibold"
                                                            style={{ flex: 1, minWidth: 0, letterSpacing: '0.06em' }}
                                                        />
                                                        {sectionChanged && (
                                                            <button
                                                                title="Reset to default"
                                                                onClick={() => setNavLabels(prev => { const n = { ...prev }; delete n[section.sectionKey]; return n; })}
                                                                style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                    color: 'var(--tx-muted)', fontSize: 14, padding: '2px 4px',
                                                                    borderRadius: 4, flexShrink: 0,
                                                                }}
                                                            >↺</button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', letterSpacing: '0.08em' }}>
                                                        {section.sectionDefault}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Nav items */}
                                            {section.items.map((item, ii) => {
                                                const current = navLabels[item.key] ?? item.defaultLabel;
                                                const isChanged = navLabels[item.key] !== undefined && navLabels[item.key] !== item.defaultLabel;
                                                const isLast = ii === section.items.length - 1;
                                                return (
                                                    <div key={item.key} style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '9px 14px',
                                                        borderBottom: isLast ? 'none' : '1px solid var(--border)',
                                                        background: isChanged ? 'rgba(34,168,75,0.03)' : 'transparent',
                                                    }}>
                                                        {/* Icon chip */}
                                                        <div style={{
                                                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                            background: isChanged ? 'rgba(34,168,75,0.12)' : 'var(--bg-subtle)',
                                                            border: '1px solid var(--border)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 14,
                                                        }}>
                                                            {item.icon}
                                                        </div>

                                                        {/* Path or description */}
                                                        <div style={{ flex: '0 0 auto', minWidth: 0 }}>
                                                            {item.path ? (
                                                                <code style={{
                                                                    fontSize: 11, color: 'var(--tx-muted)',
                                                                    background: 'var(--bg-subtle)',
                                                                    padding: '2px 8px', borderRadius: 5,
                                                                    fontFamily: 'monospace',
                                                                    display: 'block', maxWidth: 180,
                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                }}>
                                                                    {item.path}
                                                                </code>
                                                            ) : item.description ? (
                                                                <span style={{
                                                                    fontSize: 11, color: 'var(--tx-muted)',
                                                                    maxWidth: 180, display: 'block',
                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                }}>
                                                                    {item.description}
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        {/* Arrow */}
                                                        <span style={{ color: 'var(--tx-muted)', fontSize: 12, flexShrink: 0 }}>→</span>

                                                        {/* Label input */}
                                                        <input
                                                            value={current}
                                                            onChange={e => setNavLabels(prev => ({ ...prev, [item.key]: e.target.value }))}
                                                            placeholder={item.defaultLabel}
                                                            className="input-dark px-3 py-1.5 text-sm"
                                                            style={{ flex: 1, minWidth: 0 }}
                                                        />

                                                        {/* Reset button — only when value differs from default */}
                                                        {isChanged ? (
                                                            <button
                                                                title={`Reset to "${item.defaultLabel}"`}
                                                                onClick={() => setNavLabels(prev => { const n = { ...prev }; delete n[item.key]; return n; })}
                                                                style={{
                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                    color: 'var(--tx-muted)', fontSize: 15, padding: '2px 4px',
                                                                    borderRadius: 4, flexShrink: 0,
                                                                }}
                                                            >↺</button>
                                                        ) : (
                                                            <div style={{ width: 24, flexShrink: 0 }} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                        <button onClick={saveNavLabels} disabled={savingNav} className="btn-primary-green text-sm">
                            {savingNav ? 'Saving...' : '💾 Save Navigation Labels'}
                        </button>
                        <button
                            onClick={() => setNavLabels({ ...NAV_LABEL_DEFAULTS })}
                            style={{
                                background: 'none', border: '1.5px solid var(--border)',
                                borderRadius: 10, padding: '8px 16px', fontSize: 13,
                                color: 'var(--tx-muted)', cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            ↺ Reset All to Defaults
                        </button>
                    </div>
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

                {/* Change Password */}
                <ChangePasswordCard />
            </div>
        </Layout>
    );
}