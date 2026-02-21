import { Platform } from "react-native";
import Constants from "expo-constants";
import { getAuthToken, clearAuth } from "./storage";
import { router } from "expo-router";

function getBaseUrl(): string {
  if (__DEV__) {
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
  return "https://vitality-score.replit.app";
}

export const API_BASE = getBaseUrl();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle401(): Promise<void> {
  await clearAuth();
  router.replace("/onboarding");
}

export async function apiRequest(method: string, path: string, data?: unknown): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders,
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (res.status === 401) {
    await handle401();
    throw new Error("Authentication expired");
  }
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
