import {createClient} from '@supabase/supabase-js';
export const URL_=import.meta.env.VITE_SUPABASE_URL, KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const sb=createClient(URL_,KEY);
