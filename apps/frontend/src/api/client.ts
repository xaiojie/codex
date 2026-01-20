import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const adminToken = import.meta.env.VITE_ADMIN_TOKEN || "";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "X-Admin-Token": adminToken
  }
});
