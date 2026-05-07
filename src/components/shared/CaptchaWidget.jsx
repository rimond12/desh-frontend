/**
 * CaptchaWidget.jsx — Self-hosted one-click CAPTCHA
 *
 * Flow:
 *  1. User sees an "I am not a robot" checkbox.
 *  2. On click a 700 ms verification animation plays.
 *  3a. If the click arrived faster than 250 ms after mount (bot-speed),
 *      a simple math challenge is shown instead of instant approval.
 *  3b. Otherwise the widget flips to "✓ Verified" and calls onVerify(true).
 *  4. The verified state is cached in sessionStorage so navigating back
 *     within the same browser session skips the CAPTCHA.
 *
 * Props:
 *   onVerify(bool) — called with true once the user passes
 *   sessionKey     — unique key per page (default "captcha_verified")
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Generate a random addition question  e.g. { q: "7 + 4", a: 11 }
function makeMath() {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { q: `${a} + ${b}`, a: a + b };
}

export default function CaptchaWidget({ onVerify, sessionKey = 'captcha_verified' }) {

    // ── Restore from session so users aren't re-challenged on back-nav ──
    const [status, setStatus] = useState(() =>
        sessionStorage.getItem(sessionKey) === '1' ? 'verified' : 'idle'
    );
    const [math, setMath]     = useState(null);   // { q, a } — set only for bot-speed clicks
    const [answer, setAnswer] = useState('');
    const [mathErr, setMathErr] = useState(false);
    const mountTime            = useRef(Date.now());

    // Notify parent immediately if already verified from session
    useEffect(() => {
        if (status === 'verified') onVerify(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCheck = useCallback(() => {
        if (status !== 'idle') return;

        const elapsed = Date.now() - mountTime.current;

        // Clicked suspiciously fast → show math fallback
        if (elapsed < 250) {
            setMath(makeMath());
            setStatus('math');
            return;
        }

        // Normal human click → animate then verify
        setStatus('loading');
        setTimeout(() => {
            setStatus('verified');
            sessionStorage.setItem(sessionKey, '1');
            onVerify(true);
        }, 700);
    }, [status, sessionKey, onVerify]);

    const handleMathSubmit = (e) => {
        e.preventDefault();
        if (parseInt(answer, 10) === math.a) {
            setMathErr(false);
            setStatus('loading');
            setTimeout(() => {
                setStatus('verified');
                sessionStorage.setItem(sessionKey, '1');
                onVerify(true);
            }, 500);
        } else {
            setMathErr(true);
            setAnswer('');
            setMath(makeMath()); // new question on wrong answer
        }
    };

    const refreshMath = () => {
        setMath(makeMath());
        setAnswer('');
        setMathErr(false);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={styles.root}>

            {/* ── Math challenge (rare bot-speed case) ── */}
            {status === 'math' && (
                <form onSubmit={handleMathSubmit} style={styles.mathWrap}>
                    <span style={styles.shieldIcon}>🛡</span>
                    <div style={styles.mathBody}>
                        <p style={styles.mathQuestion}>
                            Quick check: what is <strong>{math.q}</strong> ?
                        </p>
                        <div style={styles.mathInputRow}>
                            <input
                                type="number"
                                value={answer}
                                onChange={e => { setAnswer(e.target.value); setMathErr(false); }}
                                placeholder="Answer"
                                autoFocus
                                style={{
                                    ...styles.mathInput,
                                    borderColor: mathErr ? '#dc2626' : '#d1e8d5',
                                }}
                            />
                            <button type="submit" style={styles.mathBtn}>Verify</button>
                            <button type="button" onClick={refreshMath} style={styles.refreshBtn} title="New question">↺</button>
                        </div>
                        {mathErr && (
                            <p style={styles.mathError}>Incorrect — please try again.</p>
                        )}
                    </div>
                </form>
            )}

            {/* ── Checkbox row (idle / loading / verified) ── */}
            {status !== 'math' && (
                <div style={styles.row}>
                    {/* Checkbox */}
                    <button
                        type="button"
                        onClick={handleCheck}
                        disabled={status !== 'idle'}
                        style={{
                            ...styles.box,
                            ...(status === 'verified' ? styles.boxVerified : {}),
                            ...(status === 'loading'  ? styles.boxLoading  : {}),
                            cursor: status === 'idle' ? 'pointer' : 'default',
                        }}
                        aria-label="I am not a robot"
                    >
                        {status === 'idle'     && <span style={styles.boxInner} />}
                        {status === 'loading'  && <span style={styles.spinner} />}
                        {status === 'verified' && <span style={styles.checkmark}>✓</span>}
                    </button>

                    {/* Label */}
                    <span style={{
                        ...styles.label,
                        color: status === 'verified' ? '#166534' : '#3d6647',
                    }}>
                        {status === 'verified' ? 'Verified — you\'re human!' : 'I am not a robot'}
                    </span>

                    {/* Brand badge */}
                    <div style={styles.badge}>
                        <span style={styles.badgeIcon}>🛡</span>
                        <span style={styles.badgeText}>DESH{'\n'}Security</span>
                    </div>
                </div>
            )}

            <style>{captchaCSS}</style>
        </div>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
    root: {
        border: '1.5px solid #d4e8d8',
        borderRadius: 12,
        background: '#f4faf5',
        padding: '13px 16px',
        marginBottom: 14,
        fontFamily: "'DM Sans', sans-serif",
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    },
    box: {
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '2px solid #9dc8a6',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        outline: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    },
    boxVerified: {
        background: 'linear-gradient(135deg, #1e8c44, #2db55d)',
        border: '2px solid #1e8c44',
        boxShadow: '0 0 0 3px rgba(30,140,68,0.15)',
    },
    boxLoading: {
        border: '2px solid #6bbf7e',
        background: '#f0faf2',
    },
    boxInner: {
        display: 'block',
        width: 10,
        height: 10,
        borderRadius: 3,
        background: 'transparent',
    },
    spinner: {
        display: 'block',
        width: 13,
        height: 13,
        borderRadius: '50%',
        border: '2px solid #c0dfc7',
        borderTopColor: '#1e8c44',
        animation: 'captchaSpin 0.7s linear infinite',
    },
    checkmark: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 900,
        lineHeight: 1,
    },
    label: {
        flex: 1,
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0,
        transition: 'color 0.3s',
    },
    badge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '4px 8px',
        background: '#e8f5eb',
        border: '1px solid #c6e0cc',
        borderRadius: 8,
        flexShrink: 0,
    },
    badgeIcon: {
        fontSize: 13,
        lineHeight: 1,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: '#3d6647',
        textAlign: 'center',
        whiteSpace: 'pre',
        lineHeight: 1.3,
    },
    // Math challenge
    mathWrap: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
    },
    shieldIcon: {
        fontSize: 22,
        lineHeight: 1,
        flexShrink: 0,
        marginTop: 2,
    },
    mathBody: {
        flex: 1,
    },
    mathQuestion: {
        fontSize: 13,
        color: '#1a4a28',
        fontWeight: 500,
        marginBottom: 8,
        lineHeight: 1.5,
    },
    mathInputRow: {
        display: 'flex',
        gap: 6,
        alignItems: 'center',
    },
    mathInput: {
        width: 80,
        padding: '7px 10px',
        border: '1.5px solid #d4e8d8',
        borderRadius: 8,
        fontSize: 14,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        color: '#1a3d20',
        background: '#fff',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    mathBtn: {
        padding: '7px 14px',
        background: 'linear-gradient(135deg, #1e8c44, #2db55d)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
    },
    refreshBtn: {
        padding: '7px 10px',
        background: '#e8f5eb',
        color: '#3d6647',
        border: '1px solid #c6e0cc',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        lineHeight: 1,
        fontFamily: "'DM Sans', sans-serif",
    },
    mathError: {
        fontSize: 12,
        color: '#dc2626',
        fontWeight: 600,
        marginTop: 5,
    },
};

const captchaCSS = `
@keyframes captchaSpin {
  to { transform: rotate(360deg); }
}
`;
