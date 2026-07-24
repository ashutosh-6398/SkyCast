// db.js - Supabase Cloud Database Module
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("CRITICAL: SUPABASE_URL and SUPABASE_KEY must be defined in .env file.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("[db.js] Connected to Supabase cloud database ✅");

// ========================
//       FAVORITES
// ========================

async function getFavorites() {
    const { data, error } = await supabase
        .from('favorites')
        .select('city')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("[db.js] getFavorites error:", error.message);
        return [];
    }
    return data.map(row => row.city);
}

async function addFavorite(city) {
    if (!city) return;
    const cleanCity = city.trim();

    const { error } = await supabase
        .from('favorites')
        .upsert({ city: cleanCity }, { onConflict: 'city' });

    if (error) {
        console.error("[db.js] addFavorite error:", error.message);
    }
    return getFavorites();
}

async function removeFavorite(city) {
    if (!city) return;
    const cleanCity = city.trim();

    const { error } = await supabase
        .from('favorites')
        .delete()
        .ilike('city', cleanCity);

    if (error) {
        console.error("[db.js] removeFavorite error:", error.message);
    }
    return getFavorites();
}

// ========================
//        HISTORY
// ========================

async function getHistory() {
    const { data, error } = await supabase
        .from('history')
        .select('city')
        .order('searched_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("[db.js] getHistory error:", error.message);
        return [];
    }
    return data.map(row => row.city);
}

async function addHistory(city) {
    if (!city) return;
    const cleanCity = city.trim();

    // Remove old entries of the same city (case-insensitive)
    await supabase
        .from('history')
        .delete()
        .ilike('city', cleanCity);

    // Insert fresh entry with current timestamp
    const { error } = await supabase
        .from('history')
        .insert({ city: cleanCity });

    if (error) {
        console.error("[db.js] addHistory error:", error.message);
    }

    // Keep only last 10 entries
    const { data: allHistory } = await supabase
        .from('history')
        .select('id')
        .order('searched_at', { ascending: false });

    if (allHistory && allHistory.length > 10) {
        const idsToDelete = allHistory.slice(10).map(row => row.id);
        await supabase
            .from('history')
            .delete()
            .in('id', idsToDelete);
    }

    return getHistory();
}

async function clearHistory() {
    const { error } = await supabase
        .from('history')
        .delete()
        .neq('id', 0); // Deletes all rows

    if (error) {
        console.error("[db.js] clearHistory error:", error.message);
    }
    return [];
}

// ========================
//     ALERT SETTINGS
// ========================

async function getAlertSettings() {
    const { data, error } = await supabase
        .from('alert_settings')
        .select('rain, storm, uv, aqi, wind')
        .eq('id', 1)
        .single();

    if (error) {
        console.error("[db.js] getAlertSettings error:", error.message);
        return { rain: true, storm: true, uv: true, aqi: true, wind: true };
    }
    return data;
}

async function saveAlertSettings(newSettings) {
    const { data, error } = await supabase
        .from('alert_settings')
        .upsert({
            id: 1,
            ...newSettings,
            updated_at: new Date().toISOString()
        })
        .select('rain, storm, uv, aqi, wind')
        .single();

    if (error) {
        console.error("[db.js] saveAlertSettings error:", error.message);
        return newSettings;
    }
    return data;
}

module.exports = {
    getFavorites,
    addFavorite,
    removeFavorite,
    getHistory,
    addHistory,
    clearHistory,
    getAlertSettings,
    saveAlertSettings
};
