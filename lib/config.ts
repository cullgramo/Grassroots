// The app's Supabase project. Both values are public by design (they ship inside every copy of the app);
// the database's own rules decide what anyone can read. A .env file can point the app somewhere else.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dxkurwkmbnireaptcsbd.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TH7F6QqcfnHcjkBMczDKPw_qI8qLpyM';

// The public web address that shared fixture links point to (each fixture has a page at <SITE_URL>/f/<id>).
// Set EXPO_PUBLIC_SITE_URL (for example to a custom domain later) to point shared links somewhere else; set it to an
// empty value to switch link sharing off, and shared messages then carry a directions link instead.
export const SITE_URL: string | null = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://grassroots.expo.app') || null;
