import axios from "axios";

export const apiClient = axios.create({
  baseURL: "", // keep empty; we'll pass absolute "/api/..." paths
  headers: {
    "Content-Type": "application/json",
  },
});
