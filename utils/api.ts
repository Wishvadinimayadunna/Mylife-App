// ============================================
// API Client - Axios HTTP Client
// Handles all API requests with auth tokens
// ============================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

// Base API URL - dynamically resolve computer's local IP address so mobile devices can connect
const getApiBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:5000/api`;
  }
  // Fallback to the current local Wi-Fi IP address
  return "http://172.25.6.15:5000/api";
};

const API_BASE_URL = getApiBaseUrl();

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
