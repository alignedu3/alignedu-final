import { createClient } from '@supabase/supabase-js'

// 🔥 PUT YOUR REAL VALUES HERE FROM .env.local
const supabaseUrl = "PASTE_SUPABASE_URL_HERE"
const supabaseKey = "PASTE_SUPABASE_ANON_KEY_HERE"

const supabase = createClient(supabaseUrl, supabaseKey)

// 🔥 PUT REAL TEACHER ID HERE (from admin click)
const id = "PASTE_TEACHER_ID_HERE"

async function run() {
  console.log("Testing ID:", id)

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)

  console.log("PROFILE:", profile)
  console.log("PROFILE ERROR:", pErr)

  const { data: analyses, error: aErr } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', id)

  console.log("ANALYSES:", analyses)
  console.log("ANALYSES ERROR:", aErr)
}

run()