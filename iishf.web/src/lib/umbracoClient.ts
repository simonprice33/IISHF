import axios from "axios";

const UMBRACO_BASE_URL =
  process.env.UMBRACO_BASE_URL ?? "https://localhost:44395";

export const umbracoClient = axios.create({
  baseURL: UMBRACO_BASE_URL,
  timeout: 60_000,
  headers: {
    Accept: "application/json",
  },
});
