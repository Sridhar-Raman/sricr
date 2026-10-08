import axios from 'axios';

const TOKEN_KEY = 'appointment_token';

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY),
};

// In development Vite proxies /api to the server. In production set VITE_API_URL (e.g. https://sricr-api.onrender.com)
// at build time when the API is hosted on a different address from the website.
const api = axios.create({ baseURL: `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api` });

api.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// An expired/invalid token anywhere sends the user back to the login page (but not for a failed login itself).
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401 && !error.config.url.endsWith('/auth/login')) {
        tokenStore.clear();
        window.location.assign('/login');
    }
    return Promise.reject(error);
});

/** The API's message for an error, falling back to a generic one. */
export const errorMessage = (error) => error.response?.data?.errors?.[0]
    ? `${error.response.data.errors[0].field}: ${error.response.data.errors[0].message}`
    : (error.response?.data?.message || 'Something went wrong, please try again.');

export default api;
