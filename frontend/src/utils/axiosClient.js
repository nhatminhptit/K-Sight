import axios from "axios";
import store from "../store";
import { logout } from "../store/authSlice";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const token = localStorage.getItem("access_token");
    const isAuthRequest = /\/auth\/(login|register|google)/.test(
      error.config?.url || "",
    );

    if (token && !isAuthRequest && (status === 401 || status === 403)) {
      store.dispatch(logout());
      window.location.replace("/login");
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
