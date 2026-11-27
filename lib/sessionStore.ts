import * as SecureStore from 'expo-secure-store';

/** Where the sign-in is kept on a phone: the phone's own encrypted keychain or keystore, not plain app storage. */
const KEY = 'grassroots.session';

export const readSession = () => SecureStore.getItemAsync(KEY);
export const writeSession = (value: string) => SecureStore.setItemAsync(KEY, value);
export const clearSession = () => SecureStore.deleteItemAsync(KEY);
