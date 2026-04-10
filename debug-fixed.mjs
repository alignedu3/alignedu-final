import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const run = async () => {
  const { data } = await supabase.from('profiles').select('*').limit(5);
  console.log("DATA:", data);
};

run();