import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "aura_user_id";

export async function getUserId(): Promise<number | null> {
  const id = await AsyncStorage.getItem(USER_ID_KEY);
  return id ? Number(id) : null;
}

export async function setUserId(id: number): Promise<void> {
  await AsyncStorage.setItem(USER_ID_KEY, String(id));
}

export async function clearUserId(): Promise<void> {
  await AsyncStorage.removeItem(USER_ID_KEY);
}
