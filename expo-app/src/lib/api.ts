import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseUrl(): string {
  if (Platform.OS === "web") {
    return "";
  }
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:5000`;
  }
  return "http://localhost:5000";
}

export const API_BASE = getBaseUrl();

export async function apiRequest(method: string, path: string, data?: unknown): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiRequest("GET", path);
  return res.json();
}
