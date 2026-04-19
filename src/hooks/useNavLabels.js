import { useState, useEffect } from 'react';
import axios from 'axios';
import { NAV_LABEL_DEFAULTS } from '../config/navConfig.js';

export { NAV_LABEL_DEFAULTS };

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function useNavLabels() {
    const [labels, setLabels] = useState({ ...NAV_LABEL_DEFAULTS });

    useEffect(() => {
        axios.get(`${API_URL}/settings`)
            .then(res => {
                const saved = res.data.settings?.navLabels || {};
                setLabels({ ...NAV_LABEL_DEFAULTS, ...saved });
            })
            .catch(() => {});
    }, []);

    return labels;
}
