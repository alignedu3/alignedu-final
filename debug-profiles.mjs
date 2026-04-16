import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("URL EXISTS:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name');

  console.log("ERROR:", error);
  console.log("DATA:", data);
}

run();