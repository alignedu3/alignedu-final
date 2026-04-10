import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL exists:", !!url);
console.log("KEY exists:", !!key);

if (!url || !key) {
  console.log("❌ Missing env variables");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('profiles')
  .select('id, name, role')
  .limit(5);

console.log("DATA:", data);
console.log("ERROR:", error);