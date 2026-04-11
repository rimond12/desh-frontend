import axios from "axios";
import { auth } from "../services/firebase";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const useAxiosSecure = () => {
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

    return instance;
};

export default useAxiosSecure;