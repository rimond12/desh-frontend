import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/calc';

export default function CalculationsArchivePage() {
    const [calculations, setCalculations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/calculations`)
            .then(r => r.json())
            .then(json => {
                if (json.error) throw new Error(json.error);
                setCalculations(json.data || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const active = calculations.filter(c => c.active !== false);

    return (
        <Layout>
            {/* Header */}
            <div className="fade-in-up" style={{ marginBottom: 28 }}>
                <p style={{ color: 'var(--tx-muted)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    Tools
                </p>
                <h1 style={{
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                    fontSize: 28, color: 'var(--tx)', marginBottom: 4,
                }}>
                    ∑ Calculations
                </h1>
                <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>
                    Browse available calculation modules
                </p>
            </div>

            {/* Content */}
            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: '3px solid var(--g200)', borderTopColor: 'var(--g600)',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                    }} />
                    <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>Loading calculations…</p>
                </div>
            ) : error ? (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <p style={{ color: '#EF4444', fontSize: 14, fontWeight: 600 }}>{error}</p>
                </div>
            ) : active.length === 0 ? (
                <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>∑</div>
                    <h3 style={{
                        fontFamily: 'Montserrat,sans-serif', fontWeight: 700,
                        fontSize: 17, color: 'var(--tx)', marginBottom: 8,
                    }}>
                        No calculations yet
                    </h3>
                    <p style={{ color: 'var(--tx-muted)', fontSize: 13 }}>
                        Calculation modules will appear here once an admin creates them.
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                }}>
                    {active.map((calc, i) => (
                        <Link
                            key={calc._id}
                            to={`/calculations/${calc._id}`}
                            className="card fade-in-up"
                            style={{
                                textDecoration: 'none',
                                display: 'block',
                                padding: 20,
                                animationDelay: `${i * 0.05}s`,
                                transition: 'box-shadow 0.18s, transform 0.18s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,122,53,0.13)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            {/* Icon + Order */}
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', marginBottom: 14,
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20, color: 'white',
                                    boxShadow: '0 3px 10px rgba(26,122,53,0.25)',
                                }}>
                                    ∑
                                </div>
                                {calc.order_num != null && (
                                    <span style={{
                                        fontSize: 11, fontWeight: 700,
                                        color: 'var(--tx-muted)',
                                        background: 'var(--g50)',
                                        padding: '3px 8px', borderRadius: 20,
                                    }}>
                                        #{calc.order_num}
                                    </span>
                                )}
                            </div>

                            {/* Name */}
                            <h3 style={{
                                fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
                                fontSize: 15, color: 'var(--tx)', marginBottom: 6, lineHeight: 1.3,
                            }}>
                                {calc.name}
                            </h3>

                            {/* Description */}
                            {calc.description && (
                                <p style={{
                                    fontSize: 12.5, color: 'var(--tx-muted)',
                                    lineHeight: 1.55, marginBottom: 14,
                                }}>
                                    {calc.description}
                                </p>
                            )}

                            {/* Open link */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                color: 'var(--g600)', fontSize: 13, fontWeight: 700,
                                marginTop: 'auto',
                            }}>
                                Open calculation →
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </Layout>
    );
}
