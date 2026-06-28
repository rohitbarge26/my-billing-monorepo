import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:5001/api', // default base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to update the base URL dynamically at runtime (useful for mobile settings or environment switches)
export const setApiBaseUrl = (url: string) => {
  apiClient.defaults.baseURL = url;
};

// Request interceptor (e.g. for injecting Auth tokens if added in the future)
apiClient.interceptors.request.use(
  (config) => {
    // Modify config before request is sent
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
