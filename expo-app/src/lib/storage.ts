import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "aura_user_id";
const AUTH_TOKEN_KEY = "aura_auth_token";

export async function getUserId(): Promise<number | null> {
  const id = await AsyncStorage.getItem(USER_ID_KEY);
  return id ? Number(id) : null;
}

export async function setUserId(id: number): Promise<void> {
  await AsyncStorage.setItem(USER_ID_KEY, String(id));
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function setAuth(userId: number, token: string): Promise<void> {
  await AsyncStorage.multiSet([
    [USER_ID_KEY, String(userId)],
    [AUTH_TOKEN_KEY, token],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([USER_ID_KEY, AUTH_TOKEN_KEY]);
}

/** @deprecated Use clearAuth() instead */
export async function clearUserId(): Promise<void> {
  return clearAuth();
}
