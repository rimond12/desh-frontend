import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL;

const DEFAULTS = {
    authHeaderLogo: '/images/bdLogo.jpg',
    authHeaderTitleBn: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
    authHeaderTitleEn: "Government of the People's Republic of Bangladesh",
    authCardLogoLeft: '/images/0_HBRI_Picture3-removebg-preview.png',
    authCardLogoRight: '/images/logo (1).png',
    authCardLogos: ['/images/0_HBRI_Picture3-removebg-preview.png', '/images/logo (1).png'],
    authSystemLabel: 'Sustainable Design Assessment System',
};

/**
 * Returns the correct src URL for a branding image.
 * Paths starting with /uploads/ are served by the Node backend.
 * Everything else (e.g. /images/) is served by the React public folder.
 */
export function getImgSrc(path) {
    if (!path) return '';
    if (path.startsWith('/uploads/')) return `${SERVER_URL}${path}`;
    return path;
}

/**
 * Fetches auth-page branding settings from the public /settings endpoint.
 * Falls back to hardcoded defaults while loading or on error.
 */
export default function useAuthBranding() {
    const [branding, setBranding] = useState(DEFAULTS);

    useEffect(() => {
        axios.get(`${API_URL}/settings`)
            .then(res => {
                const s = res.data.settings || {};
                setBranding({
                    authHeaderLogo: s.authHeaderLogo || DEFAULTS.authHeaderLogo,
                    authHeaderTitleBn: s.authHeaderTitleBn || DEFAULTS.authHeaderTitleBn,
                    authHeaderTitleEn: s.authHeaderTitleEn || DEFAULTS.authHeaderTitleEn,
                    authCardLogoLeft: s.authCardLogoLeft || DEFAULTS.authCardLogoLeft,
                    authCardLogoRight: s.authCardLogoRight || DEFAULTS.authCardLogoRight,
                    authCardLogos: (s.authCardLogos && s.authCardLogos.length > 0) ? s.authCardLogos : DEFAULTS.authCardLogos,
                    authSystemLabel: s.authSystemLabel || DEFAULTS.authSystemLabel,
                });
            })
            .catch(() => { }); // silently keep defaults on error
    }, []);

    return branding;
}
