import AsyncStorage from '@react-native-async-storage/async-storage';

/** On the website the sign-in is kept in the browser's storage for this site, as every web sign-in is. */
const KEY = 'grassroots.session';

export const readSession = () => AsyncStorage.getItem(KEY);
export const writeSession = (value: string) => AsyncStorage.setItem(KEY, value);
export const clearSession = () => AsyncStorage.removeItem(KEY);
