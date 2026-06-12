import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://diapfhpxnccicemnfbjb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYXBmaHB4bmNjaWNlbW5mYmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Nzg2OTEsImV4cCI6MjA5NjI1NDY5MX0.OE55YcEGy3L-TIfpWYOqvQb5uKsZ-y5hNYTzo6zk3PQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)