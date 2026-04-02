import axios from "axios";
import { auth } from "../services/firebase";

const useAxiosSecure = () => {
    const instance = axios.create({
        baseURL: "http://localhost:5000/api",
        headers: { "Content-Type": "application/json" },
    });

    instance.interceptors.request.use(async (config) => {
        const user = auth.currentUser;
        if (user) {
            // Firebase token (localStorage নয়, সরাসরি Firebase থেকে)
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
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