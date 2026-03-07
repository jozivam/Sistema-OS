import { supabase } from './services/supabaseClient.ts';

async function checkLocations() {
    const { data, error } = await supabase.from('storage_locations').select('*');
    console.log('Locations:', data);
    console.log('Error:', error);
}

checkLocations();
