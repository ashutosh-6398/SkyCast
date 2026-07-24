// server.js - Express backend and proxy caching server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

if (!OPENWEATHER_API_KEY) {
    console.error("CRITICAL: OPENWEATHER_API_KEY is not defined in .env file.");
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Server-side cache setup
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }
    return null;
}

function setToCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// Helper to construct external URL and fetch data securely
async function fetchFromOpenWeather(endpoint, queryParams) {
    const params = new URLSearchParams(queryParams);
    params.set('appid', OPENWEATHER_API_KEY);
    const url = `https://api.openweathermap.org/${endpoint}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
    }
    return response.json();
}

/* ==========================================================
                    WEATHER API PROXY ENDPOINTS
========================================================== */

app.get('/api/weather', async (req, res) => {
    const { q, lat, lon, units } = req.query;
    const cacheKey = `weather_${q || ''}_${lat || ''}_${lon || ''}_${units || 'metric'}`;

    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    try {
        const queryParams = { units: units || 'metric' };
        if (q) queryParams.q = q;
        if (lat && lon) {
            queryParams.lat = lat;
            queryParams.lon = lon;
        }

        const data = await fetchFromOpenWeather('data/2.5/weather', queryParams);
        setToCache(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch weather data." });
    }
});

app.get('/api/forecast', async (req, res) => {
    const { q, lat, lon, units } = req.query;
    const cacheKey = `forecast_${q || ''}_${lat || ''}_${lon || ''}_${units || 'metric'}`;

    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    try {
        const queryParams = { units: units || 'metric' };
        if (q) queryParams.q = q;
        if (lat && lon) {
            queryParams.lat = lat;
            queryParams.lon = lon;
        }

        const data = await fetchFromOpenWeather('data/2.5/forecast', queryParams);
        setToCache(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch forecast data." });
    }
});

app.get('/api/air_pollution', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ message: "Latitude and Longitude are required." });
    }
    const cacheKey = `pollution_${lat}_${lon}`;

    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    try {
        const data = await fetchFromOpenWeather('data/2.5/air_pollution', { lat, lon });
        setToCache(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch air pollution data." });
    }
});

app.get('/api/direct', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: "Query parameter q is required." });
    }
    const cacheKey = `suggestions_${q}`;

    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    try {
        const data = await fetchFromOpenWeather('geo/1.0/direct', { q, limit: 5 });
        setToCache(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch autocomplete suggestions." });
    }
});

/* ==========================================================
                    DATABASE REST ENDPOINTS
========================================================== */

// Favorites Endpoints
app.get('/api/favorites', async (req, res) => {
    try {
        const favorites = await db.getFavorites();
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ message: "Failed to read favorites database." });
    }
});

app.post('/api/favorites', async (req, res) => {
    const { city } = req.body;
    if (!city) {
        return res.status(400).json({ message: "City name is required." });
    }
    try {
        const favorites = await db.addFavorite(city);
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ message: "Failed to save favorite." });
    }
});

app.delete('/api/favorites/:city', async (req, res) => {
    const { city } = req.params;
    try {
        const favorites = await db.removeFavorite(city);
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ message: "Failed to delete favorite." });
    }
});

// History Endpoints
app.get('/api/history', async (req, res) => {
    try {
        const history = await db.getHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Failed to read history database." });
    }
});

app.post('/api/history', async (req, res) => {
    const { city } = req.body;
    if (!city) {
        return res.status(400).json({ message: "City name is required." });
    }
    try {
        const history = await db.addHistory(city);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Failed to save search history." });
    }
});

app.delete('/api/history', async (req, res) => {
    try {
        const history = await db.clearHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Failed to clear search history." });
    }
});

// Alert Settings Endpoints
app.get('/api/alerts', async (req, res) => {
    try {
        const settings = await db.getAlertSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Failed to read alert settings." });
    }
});

app.post('/api/alerts', async (req, res) => {
    const settings = req.body;
    try {
        const updated = await db.saveAlertSettings(settings);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Failed to update alert settings." });
    }
});

// Fallback for Single Page Application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`SkyCast Server is running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});
