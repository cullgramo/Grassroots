// The app's Supabase project. Both values are public by design (they ship inside every copy of the app);
// the database's own rules decide what anyone can read. A .env file can point the app somewhere else.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dxkurwkmbnireaptcsbd.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TH7F6QqcfnHcjkBMczDKPw_qI8qLpyM';

// The public web address that shared fixture links point to (each fixture has a page at <SITE_URL>/f/<id>).
// Empty until the site is deployed; shared messages then carry a directions link instead.
export const SITE_URL: string | null = process.env.EXPO_PUBLIC_SITE_URL || null;
