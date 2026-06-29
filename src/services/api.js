import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { useLoadingStore } from '../store/useLoadingStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const isExecution = config.url && config.url.includes('/execute');
    if (!isExecution) {
      useLoadingStore.getState().startLoading();
    }
    config._isExecution = isExecution;
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    if (error.config && !error.config._isExecution) {
      useLoadingStore.getState().stopLoading();
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (response.config && !response.config._isExecution) {
      useLoadingStore.getState().stopLoading();
    }
    return response;
  },
  (error) => {
    if (error.config && !error.config._isExecution) {
      useLoadingStore.getState().stopLoading();
    }
    return Promise.reject(error);
  }
);

export default api;
