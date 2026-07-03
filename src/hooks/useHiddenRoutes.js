import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let cachedHiddenRoutes = null;
let activePromise = null;
const listeners = new Set();

function broadcast(newHidden) {
    listeners.forEach(fn => fn(newHidden));
}

export function clearHiddenRoutesCache() {
    cachedHiddenRoutes = null;
    activePromise = null;
}

export function updateHiddenRoutesCache(saved) {
    cachedHiddenRoutes = saved || {};
    broadcast(cachedHiddenRoutes);
}

export default function useHiddenRoutes() {
    const [hiddenRoutes, setHiddenRoutes] = useState(cachedHiddenRoutes || {});

    useEffect(() => {
        const handler = (newHidden) => {
            setHiddenRoutes(newHidden);
        };
        listeners.add(handler);

        if (!cachedHiddenRoutes && !activePromise) {
            activePromise = axios.get(`${API_URL}/settings`)
                .then(res => {
                    const saved = res.data.settings?.hiddenRoutes || {};
                    cachedHiddenRoutes = saved;
                    broadcast(cachedHiddenRoutes);
                    activePromise = null;
                    return saved;
                })
                .catch(() => {
                    activePromise = null;
                    return {};
                });
        } else if (activePromise) {
            activePromise.then(() => {
                if (cachedHiddenRoutes) {
                    setHiddenRoutes(cachedHiddenRoutes);
                }
            });
        }

        return () => {
            listeners.delete(handler);
        };
    }, []);

    return hiddenRoutes;
}
