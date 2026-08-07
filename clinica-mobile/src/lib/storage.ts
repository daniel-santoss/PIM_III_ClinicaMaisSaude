import * as SecureStore from 'expo-secure-store';

// Wrapper fino sobre o expo-secure-store. Tokens ficam cifrados no Keychain/Keystore
// do device — nunca em AsyncStorage/localStorage em texto puro.
export const storage = {
  get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  set(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  },
  remove(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};
