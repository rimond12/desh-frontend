import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../components/shared/Layout.jsx';
import ChangePasswordCard from '../../components/shared/ChangePasswordCard.jsx';

export default function Account() {
    const { user, dbUser } = useAuth();

    // Detect sign-in providers for the profile info badge
    const providers = user?.providerData?.map(p => p.providerId) || [];
    const isGoogle   = providers.includes('google.com');
    const isPassword = providers.includes('password');

    return (
        <Layout>
            {/* Page heading */}
            <div className="fade-in-up" style={{ marginBottom: 28 }}>
                <h1
                    style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 900,
                        fontSize: 28,
                        color: 'var(--tx)',
                        marginBottom: 4,
                    }}
                >
                    My Account
                </h1>
                <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>
                    Manage your profile and security settings
                </p>
            </div>

            <div style={{ maxWidth: 560 }} className="space-y-6">

                {/* ── Profile info card ── */}
                <div className="glass-card p-6">
                    <h2 className="font-bold text-lg mb-4">👤 Profile</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* Avatar + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--g500), var(--g700))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                                color: '#fff',
                                fontWeight: 800,
                                flexShrink: 0,
                                letterSpacing: 1,
                            }}>
                                {user?.displayName
                                    ? user.displayName.charAt(0).toUpperCase()
                                    : user?.email?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--tx)' }}>
                                    {user?.displayName || '—'}
                                </p>
                                <p style={{ fontSize: 13, color: 'var(--tx-muted)' }}>
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        {/* Role chip — shows the currently active role */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span
                                className="text-xs font-semibold"
                                style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}
                            >
                                ACTIVE ROLE
                            </span>
                            <span style={{
                                background: 'var(--g50)',
                                color: 'var(--g700)',
                                border: '1.5px solid var(--g200)',
                                borderRadius: 99,
                                padding: '2px 12px',
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: 'capitalize',
                            }}>
                                {(dbUser?.activeRole || dbUser?.role) === 'user'
                                    ? 'DESH Professional'
                                    : (dbUser?.activeRole || dbUser?.role || 'user')}
                            </span>
                        </div>

                        {/* Sign-in method(s) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span
                                className="text-xs font-semibold"
                                style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}
                            >
                                SIGN-IN
                            </span>
                            {isGoogle && (
                                <span style={providerBadge('#4285f4')}>
                                    🌐 Google
                                </span>
                            )}
                            {isPassword && (
                                <span style={providerBadge('var(--g600)')}>
                                    🔑 Email / Password
                                </span>
                            )}
                        </div>

                        {/* Member since */}
                        {user?.metadata?.creationTime && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span
                                    className="text-xs font-semibold"
                                    style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}
                                >
                                    MEMBER SINCE
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--tx)' }}>
                                    {new Date(user.metadata.creationTime).toLocaleDateString(
                                        undefined,
                                        { year: 'numeric', month: 'long', day: 'numeric' }
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Change password card (shared component) ── */}
                <ChangePasswordCard />

            </div>
        </Layout>
    );
}

const providerBadge = (color) => ({
    background: `${color}18`,
    color,
    border: `1.5px solid ${color}40`,
    borderRadius: 99,
    padding: '2px 12px',
    fontSize: 12,
    fontWeight: 700,
});
