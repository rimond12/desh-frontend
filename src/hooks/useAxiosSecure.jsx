import axios from "axios";
import { useRef } from "react";
import { auth } from "../services/firebase";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const useAxiosSecure = () => {
    // Keep one stable instance per component mount so the reference never
    // changes between renders — prevents useEffect dependency-loop bugs.
    const instanceRef = useRef(null);

    if (!instanceRef.current) {
        const instance = axios.create({
            baseURL,
            headers: { "Content-Type": "application/json" },
        });

        instance.interceptors.request.use(async (config) => {
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            }
            const savedRole = localStorage.getItem("desh_active_role");
            if (savedRole) {
                config.headers["x-active-role"] = savedRole;
            }
            // FormData হলে Content-Type সরিয়ে দাও — browser নিজে boundary সহ সেট করবে
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            return config;
        }, Promise.reject);

        instance.interceptors.response.use(
            (res) => res,
            (error) => {
                console.error("API ERROR:", error.response?.data || error.message);
                return Promise.reject(error);
            }
        );

        instanceRef.current = instance;
    }

    return instanceRef.current;
};

export default useAxiosSecure;