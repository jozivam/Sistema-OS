import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.from('vendas').select('*').limit(1);
    console.log("Vendas:", data, error);
    const { data: cols } = await supabase.rpc('get_columns_for_table', { table_name: 'vendas' });
    console.log("Cols:", cols);
})();
