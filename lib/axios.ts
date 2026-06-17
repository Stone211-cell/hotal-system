import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to bypass browser caching on GET requests
api.interceptors.request.use((config) => {
  if (config.method === "get") {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "เกิดข้อผิดพลาด";
    return Promise.reject(new Error(message));
  }
);

export default api;

