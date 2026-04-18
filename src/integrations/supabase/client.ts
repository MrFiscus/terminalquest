import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vtizdyjqkwcrygqblpcm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TzCNEgUsi0mKNAe4noHThw_BGrhDtAz";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
