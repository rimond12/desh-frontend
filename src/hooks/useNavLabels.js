import { useState, useEffect } from 'react';
import axios from 'axios';
import { NAV_LABEL_DEFAULTS } from '../config/navConfig.js';

export { NAV_LABEL_DEFAULTS };

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let cachedLabels = null;
let activePromise = null;
const listeners = new Set();

function broadcast(newLabels) {
    listeners.forEach(fn => fn(newLabels));
}

export function clearNavLabelsCache() {
    cachedLabels = null;
    activePromise = null;
}

export function updateNavLabelsCache(saved) {
    cachedLabels = { ...NAV_LABEL_DEFAULTS, ...saved };
    broadcast(cachedLabels);
}

export default function useNavLabels() {
    const [labels, setLabels] = useState(cachedLabels || { ...NAV_LABEL_DEFAULTS });

    useEffect(() => {
        const handler = (newLabels) => {
            setLabels(newLabels);
        };
        listeners.add(handler);

        if (!cachedLabels && !activePromise) {
            activePromise = axios.get(`${API_URL}/settings`)
                .then(res => {
                    const saved = res.data.settings?.navLabels || {};
                    cachedLabels = { ...NAV_LABEL_DEFAULTS, ...saved };
                    broadcast(cachedLabels);
                    activePromise = null;
                    return saved;
                })
                .catch(() => {
                    activePromise = null;
                    return {};
                });
        } else if (activePromise) {
            activePromise.then(() => {
                if (cachedLabels) {
                    setLabels(cachedLabels);
                }
            });
        }

        return () => {
            listeners.delete(handler);
        };
    }, []);

    return labels;
}
