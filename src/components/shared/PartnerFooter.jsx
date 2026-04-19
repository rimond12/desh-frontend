import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL    = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL;

const DEFAULT_LOGOS = [
    '/images/1_UNOPS_Picture4.png',
    '/images/3_UN_HABITAT_Picture8.png',
    '/images/0_HBRI_Picture3.png',
    '/images/bdLogo.jpg',
    '/images/4_UNEP_Picture6.png',
    '/images/5_GABC_Picture7.png',
    '/images/federal-ministry.png',
];

function getLogoSrc(logo) {
    // Logos starting with /uploads/ are served from the Node backend
    if (logo && logo.startsWith('/uploads/')) return `${SERVER_URL}${logo}`;
    // Logos starting with /images/ are static files in the React public folder
    return logo;
}

export default function PartnerFooter() {
    const [footerLabel, setFooterLabel] = useState('Institutional Partners & Supporters');
    const [logos, setLogos] = useState(DEFAULT_LOGOS);

    useEffect(() => {
        axios.get(`${API_URL}/settings`)
            .then(res => {
                const s = res.data.settings;
                if (s.footerLabel) setFooterLabel(s.footerLabel);
                if (s.footerPartnerLogos && s.footerPartnerLogos.length > 0) {
                    setLogos(s.footerPartnerLogos);
                }
            })
            .catch(() => {}); // silently fall back to defaults
    }, []);

    return (
        <footer style={{
            position: 'relative',
            zIndex: 10,
            borderTop: '1px solid rgba(34,139,60,0.1)',
            background: '#fff',
            padding: '20px 40px 24px',
            marginTop: 'auto',
        }}>
            <p style={{
                textAlign: 'center',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#bccdc0',
                marginBottom: 14,
                fontFamily: "'DM Sans', sans-serif",
            }}>
                {footerLabel}
            </p>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 28,
            }}>
                {logos.map((logo, i) => (
                    logo && (
                        <img
                            key={i}
                            src={getLogoSrc(logo)}
                            alt=""
                            style={{ height: 50, objectFit: 'contain', transition: 'opacity 0.2s, filter 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.filter = 'grayscale(40%)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'none'; }}
                        />
                    )
                ))}
            </div>
        </footer>
    );
}
