// ============================================
// API Client - Axios HTTP Client
// Handles all API requests with auth tokens
// ============================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Base API URL - change this for production
// Use your computer's IP address so mobile devices can connect
const API_BASE_URL = "http://10.28.15.15:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token to requests
api.interceptors.request.use(
  async (config: any) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error: any) {
      console.error("Error getting auth token:", error);
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userId");
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  },
);

export default api;
