/* ==========================================================
                    SKYCAST WEATHER APP ENGINE
                    js/app.js (AQI.in, City Comparison & PDF Export Engine)
========================================================== */

/* ==========================================================
                    CONFIGURATION & API KEYS
========================================================== */
const OPENWEATHER_API_KEY = "backend_secured";
const OPENWEATHER_BASE_URL = (window.location.protocol === 'file:' || window.location.port !== '8080') ? 'http://localhost:8080/api' : '/api';
const OPENWEATHER_GEO_URL = OPENWEATHER_BASE_URL;
const DEFAULT_CITY = "Delhi";

const STORAGE_KEYS = {
    HISTORY: "skycast_history",
    UNIT: "skycast_unit",
    THEME: "skycast_theme",
    LAST_CITY: "skycast_last_city",
    FAVORITES: "skycast_favorites"
};

/* ==========================================================
                    GLOBAL APPLICATION STATE
========================================================== */
let currentCity = DEFAULT_CITY;
let currentUnit = localStorage.getItem(STORAGE_KEYS.UNIT) || "metric";
let currentWeather = null;
let forecastData = null;
let aqiData = null;
let refreshTimer = null;
let favoritesCache = [];
let historyCache = [];

// Map & Chart & Canvas Instances
let leafletMap = null;
let radarTileLayer = null;
let cloudsTileLayer = null;
let mapMarker = null;
let hourlyChartInstance = null;
let particleAnimationId = null;
let particles = [];
let audioContext = null;
let isAudioPlaying = false;

/* ==========================================================
                    DOM ELEMENT SELECTIONS
========================================================== */
const cityInput = document.getElementById("cityInput");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const themeBtn = document.getElementById("themeBtn");
const soundBtn = document.getElementById("soundBtn");
const soundIcon = document.getElementById("soundIcon");
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const favoriteIcon = document.getElementById("favoriteIcon");
const favoriteList = document.getElementById("favoriteList");

const loader = document.getElementById("loader");
const errorPopup = document.getElementById("errorPopup");
const errorText = document.getElementById("errorText");

const cityName = document.getElementById("cityName");
const dateElement = document.getElementById("date");
const weatherIcon = document.getElementById("weatherIcon");
const tempElement = document.getElementById("temp");
const weatherCondition = document.getElementById("weatherCondition");

const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");

// View Switcher & Action Elements
const tabWeather = document.getElementById("tabWeather");
const tabAQI = document.getElementById("tabAQI");
const shareBtn = document.getElementById("shareBtn");
const weatherCardView = document.getElementById("weatherCardView");
const aqiHeroCardView = document.getElementById("aqiHeroCardView");

// Side-by-Side Comparison Modal Elements
const compareBtn = document.getElementById("compareBtn");
const compareModal = document.getElementById("compareModal");
const closeCompareBtn = document.getElementById("closeCompareBtn");
const compareCity1Input = document.getElementById("compareCity1Input");
const compareCity2Input = document.getElementById("compareCity2Input");
const useCurrentCity1Btn = document.getElementById("useCurrentCity1Btn");
const runCompareBtn = document.getElementById("runCompareBtn");

// PDF Export Button
const exportPdfBtn = document.getElementById("exportPdfBtn");

// AQI.in Live AQI Card Elements
const aqiStatusPill = document.getElementById("aqiStatusPill");
const aqiScoreVal = document.getElementById("aqiScoreVal");
const pm25Val = document.getElementById("pm25Val");
const pm10Val = document.getElementById("pm10Val");
const aqiSpectrumDot = document.getElementById("aqiSpectrumDot");
const aqiSubIcon = document.getElementById("aqiSubIcon");
const aqiSubTemp = document.getElementById("aqiSubTemp");
const aqiSubDesc = document.getElementById("aqiSubDesc");
const aqiSubHumidity = document.getElementById("aqiSubHumidity");
const aqiSubWind = document.getElementById("aqiSubWind");
const aqiSubUV = document.getElementById("aqiSubUV");
const aqiUpdateTime = document.getElementById("aqiUpdateTime");

// AQI.in Highlights Elements
const compassPointer = document.getElementById("compassPointer");
const windDegreeText = document.getElementById("windDegreeText");
const windSpeedText = document.getElementById("windSpeedText");
const gustSpeedText = document.getElementById("gustSpeedText");
const cloudCoverText = document.getElementById("cloudCoverText");
const visibilityText = document.getElementById("visibilityText");
const precipValText = document.getElementById("precipValText");
const precipSubtext = document.getElementById("precipSubtext");
const pressureValText = document.getElementById("pressureValText");
const pressureNeedle = document.getElementById("pressureNeedle");
const pressureSpectrumDot = document.getElementById("pressureSpectrumDot");
const pressureSubtext = document.getElementById("pressureSubtext");
const uvValText = document.getElementById("uvValText");
const uvSpectrumDot = document.getElementById("uvSpectrumDot");
const uvSubtext = document.getElementById("uvSubtext");

// Alert Banner Elements
const weatherAlert = document.getElementById("weatherAlert");
const alertTitle = document.getElementById("alertTitle");
const alertText = document.getElementById("alertText");
const alertIcon = document.getElementById("alertIcon");

// Map Layer Toggle Buttons
const rainLayerBtn = document.getElementById("rainLayerBtn");
const cloudsLayerBtn = document.getElementById("cloudsLayerBtn");

// Forecast & History Containers
const hourlyContainer = document.querySelector(".hourly-container");
const forecastContainer = document.querySelector(".forecast-list");
const historyList = document.getElementById("historyList");
const voiceBtn = document.getElementById("voiceBtn");
const scrollTopBtn = document.getElementById("scrollTopBtn");
const weatherCanvas = document.getElementById("weatherCanvas");

let debounceTimer = null;
let selectedAutocompleteIndex = -1;

/* ==========================================================
                    LOADER & ERROR UTILITIES
========================================================== */
function showLoader() {}
function hideLoader() {}

function showError(message) {
    if (!errorPopup) {
        alert(message);
        return;
    }
    errorText.textContent = message;
    errorPopup.classList.remove("hidden");
    setTimeout(() => {
        errorPopup.classList.add("hidden");
    }, 4000);
}

/* ==========================================================
                    DATE & TIME SETUP
========================================================== */
function updateDateDisplay() {
    if (dateElement) {
        const d = new Date();
        dateElement.textContent = d.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
}

/* ==========================================================
                    FALLBACK MOCK DATA ENGINE
========================================================== */
function getMockWeather(cityNameStr) {
    const isImperial = currentUnit === "imperial";
    const isShimla = cityNameStr.toLowerCase().includes("shimla");
    const tempC = isShimla ? 16 : 28;
    const temp = isImperial ? Math.round(tempC * 9 / 5 + 32) : tempC;
    const feelsC = isShimla ? 15 : 30;
    const feels = isImperial ? Math.round(feelsC * 9 / 5 + 32) : feelsC;

    return {
        name: cityNameStr || "Delhi",
        sys: { country: "IN", sunrise: Math.floor(Date.now() / 1000) - 21600, sunset: Math.floor(Date.now() / 1000) + 21600 },
        main: { temp: temp, feels_like: feels, humidity: isShimla ? 98 : 55, pressure: isShimla ? 1012 : 998 },
        wind: { speed: isShimla ? 0.8 : 16.9, deg: 91, gust: 6.3 },
        clouds: { all: isShimla ? 85 : 65 },
        visibility: 10000,
        rain: { "1h": 0.12 },
        coord: { lat: isShimla ? 31.1048 : 28.6139, lon: isShimla ? 77.1734 : 77.2090 },
        weather: [{ main: isShimla ? "Clouds" : "Clear", description: isShimla ? "broken clouds" : "clear sky", icon: isShimla ? "03d" : "01d" }]
    };
}

function getMockForecast() {
    const isImperial = currentUnit === "imperial";
    const list = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < 40; i++) {
        const time = now + i * 3 * 3600;
        const dateObj = new Date(time * 1000);
        const dateTxt = dateObj.toISOString().replace("T", " ").substring(0, 19);
        const tempBase = 26 + Math.sin(i * 0.5) * 6;
        const temp = isImperial ? Math.round(tempBase * 9 / 5 + 32) : Math.round(tempBase);

        list.push({
            dt: time,
            dt_txt: dateTxt,
            main: { temp: temp, humidity: 50 + Math.floor(Math.sin(i) * 20) },
            weather: [{ main: i % 4 === 0 ? "Clouds" : i % 7 === 0 ? "Rain" : "Clear", icon: i % 4 === 0 ? "03d" : i % 7 === 0 ? "10d" : "01d" }]
        });
    }
    return { list };
}

/* ==========================================================
                    DYNAMIC CANVAS WEATHER PARTICLES
========================================================== */
function initWeatherParticles(condition) {
    if (!weatherCanvas) return;
    const ctx = weatherCanvas.getContext("2d");
    weatherCanvas.width = window.innerWidth;
    weatherCanvas.height = window.innerHeight;

    if (particleAnimationId) cancelAnimationFrame(particleAnimationId);
    particles = [];

    const type = condition ? condition.toLowerCase() : "clear";
    const count = type.includes("rain") ? 120 : type.includes("snow") ? 70 : 35;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * weatherCanvas.width,
            y: Math.random() * weatherCanvas.height,
            speedY: type.includes("rain") ? 12 + Math.random() * 8 : type.includes("snow") ? 1 + Math.random() * 2 : 0.2 + Math.random() * 0.5,
            speedX: type.includes("snow") ? Math.sin(i) * 1 : 0,
            length: type.includes("rain") ? 18 + Math.random() * 10 : 3 + Math.random() * 4,
            opacity: 0.2 + Math.random() * 0.5
        });
    }

    function animate() {
        ctx.clearRect(0, 0, weatherCanvas.width, weatherCanvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            if (type.includes("rain")) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity})`;
                ctx.lineWidth = 1.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y + p.length);
                ctx.stroke();
            } else if (type.includes("snow")) {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                ctx.arc(p.x, p.y, p.length / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = `rgba(255, 213, 79, ${p.opacity * 0.5})`;
                ctx.arc(p.x, p.y, p.length * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            p.y += p.speedY;
            p.x += p.speedX;

            if (p.y > weatherCanvas.height) {
                p.y = -20;
                p.x = Math.random() * weatherCanvas.width;
            }
        });
        particleAnimationId = requestAnimationFrame(animate);
    }

    animate();
}

window.addEventListener("resize", () => {
    if (weatherCanvas) {
        weatherCanvas.width = window.innerWidth;
        weatherCanvas.height = window.innerHeight;
    }
});

/* ==========================================================
                    WEB AUDIO WEATHER SOUNDSCAPE
========================================================== */
function toggleWeatherAudio() {
    if (isAudioPlaying) {
        if (audioContext) audioContext.suspend();
        isAudioPlaying = false;
        if (soundIcon) soundIcon.className = "fa-solid fa-volume-xmark";
    } else {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        audioContext.resume();
        isAudioPlaying = true;
        if (soundIcon) soundIcon.className = "fa-solid fa-volume-high";
        playAmbientSynth();
    }
}

function playAmbientSynth() {
    if (!audioContext || !isAudioPlaying) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, audioContext.currentTime);

    gain.gain.setValueAtTime(0.02, audioContext.currentTime);
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 4);
}

if (soundBtn) {
    soundBtn.addEventListener("click", toggleWeatherAudio);
}

/* ==========================================================
                    SEARCH AUTOCOMPLETE & GEOCODING
========================================================== */
async function fetchCitySuggestions(query) {
    if (!query || query.trim().length < 2) {
        hideAutocomplete();
        return;
    }
    try {
        const url = `${OPENWEATHER_GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OPENWEATHER_API_KEY}`;
        const suggestions = await fetchJSON(url).catch(() => []);
        renderAutocomplete(suggestions);
    } catch (err) {
        hideAutocomplete();
    }
}

function renderAutocomplete(suggestions) {
    if (!autocompleteDropdown) return;
    if (!suggestions || suggestions.length === 0) {
        hideAutocomplete();
        return;
    }

    autocompleteDropdown.innerHTML = "";
    selectedAutocompleteIndex = -1;

    suggestions.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "autocomplete-item";
        row.dataset.index = index;

        const flag = getCountryFlag(item.country);
        const regionStr = item.state ? `${item.state}, ${item.country}` : item.country;

        row.innerHTML = `
            <div class="autocomplete-city">
                <span class="autocomplete-flag">${flag}</span>
                <span>${item.name}</span>
            </div>
            <span class="autocomplete-region">${regionStr}</span>
        `;

        row.addEventListener("click", () => {
            cityInput.value = item.name;
            hideAutocomplete();
            if (item.lat && item.lon) {
                loadWeatherByCoordinates(item.lat, item.lon);
            } else {
                loadWeather(item.name);
            }
        });

        autocompleteDropdown.appendChild(row);
    });

    autocompleteDropdown.classList.remove("hidden");
}

function hideAutocomplete() {
    if (autocompleteDropdown) {
        autocompleteDropdown.classList.add("hidden");
        autocompleteDropdown.innerHTML = "";
        selectedAutocompleteIndex = -1;
    }
}

/* ==========================================================
                    DIRECT CLIENT-SIDE DATA PIPELINE
========================================================== */
async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP Error ${response.status}`);
    }
    return response.json();
}

async function loadWeather(city) {
    if (!city || city.trim() === "") {
        showError("Please enter a city name.");
        return;
    }

    hideAutocomplete();
    showLoader();
    const queryCity = city.trim();

    try {
        let weather = null;
        try {
            const url = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(queryCity)}&appid=${OPENWEATHER_API_KEY}&units=${currentUnit}`;
            weather = await fetchJSON(url);
        } catch (directErr) {
            console.warn("Using resilient fallback weather dataset:", directErr);
            weather = getMockWeather(queryCity);
        }

        currentCity = weather.name;
        currentWeather = weather;
        localStorage.setItem(STORAGE_KEYS.LAST_CITY, currentCity);

        updateCurrentWeatherView(weather);
        saveHistory(currentCity);
        renderHistory();
        updateFavoriteButtonState();

        await loadForecast(currentCity);

        // Evaluate weather alerts
        if (typeof evaluateWeatherAlerts === "function") {
            evaluateWeatherAlerts(currentWeather, aqiData, forecastData);
        }
    } catch (error) {
        console.error("Load Weather Error:", error);
        showError(error.message || "Failed to load weather data.");
    } finally {
        hideLoader();
    }
}

async function loadForecast(city) {
    try {
        let forecast = null;
        try {
            const url = `${OPENWEATHER_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${currentUnit}`;
            forecast = await fetchJSON(url);
        } catch (directErr) {
            forecast = getMockForecast();
        }

        forecastData = forecast;
        renderHourlyForecast(forecast.list);
        renderHourlyChart(forecast.list);
        renderFiveDayForecast(forecast.list);
    } catch (error) {
        console.error("Forecast Error:", error);
    }
}

async function loadAQI(lat, lon) {
    try {
        let data = null;
        try {
            const url = `${OPENWEATHER_BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
            data = await fetchJSON(url);
        } catch (directErr) {
            data = { list: [{ main: { aqi: 3 }, components: { pm2_5: 54, pm10: 67 } }] };
        }
        aqiData = data;
        if (data.list && data.list[0]) {
            const item = data.list[0];
            const pm25 = item.components ? item.components.pm2_5 : 54;
            const pm10 = item.components ? item.components.pm10 : 67;
            const usAqi = calculateUSAQI(pm25);
            const statusObj = getAQIStatusDetails(usAqi);

            if (aqiScoreVal) aqiScoreVal.textContent = usAqi;
            if (aqiStatusPill) {
                aqiStatusPill.textContent = statusObj.label;
                aqiStatusPill.className = `aqi-status-pill ${statusObj.class}`;
            }
            if (pm25Val) pm25Val.textContent = `${Math.round(pm25)} µg/m³`;
            if (pm10Val) pm10Val.textContent = `${Math.round(pm10)} µg/m³`;
            if (aqiSpectrumDot) aqiSpectrumDot.style.left = `${Math.max(5, Math.min(95, statusObj.pct))}%`;

            if (aqiUpdateTime) {
                const d = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const timeStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                aqiUpdateTime.textContent = `Last Updated: ${timeStr} (Local Time)`;
            }

            return getAQILabel(item.main.aqi);
        }
    } catch (error) {
        console.warn("AQI fetch error", error);
    }
    return getAQILabel(1);
}

/* ==========================================================
                    INTERFACE RENDERING ENGINE
========================================================== */
function updateCurrentWeatherView(data) {
    const unitSymbol = currentUnit === "imperial" ? "°F" : "°C";
    const speedUnit = currentUnit === "imperial" ? "mph" : "km/h";

    if (cityName) cityName.textContent = `${data.name}${data.sys && data.sys.country ? ', ' + data.sys.country : ''}`;
    if (tempElement) tempElement.textContent = Math.round(data.main.temp);
    if (weatherCondition) weatherCondition.textContent = capitalize(data.weather[0].description);

    if (feelsLike) feelsLike.textContent = `${Math.round(data.main.feels_like)}${unitSymbol}`;
    if (humidity) humidity.textContent = `${data.main.humidity}%`;
    if (wind) wind.textContent = `${data.wind.speed} ${speedUnit}`;

    if (weatherIcon) {
        weatherIcon.src = getIcon(data.weather[0].icon);
    }

    // Update AQI Weather Subcard Elements
    if (aqiSubIcon) aqiSubIcon.src = getIcon(data.weather[0].icon);
    if (aqiSubTemp) aqiSubTemp.textContent = `${Math.round(data.main.temp)} ${unitSymbol}`;
    if (aqiSubDesc) aqiSubDesc.textContent = capitalize(data.weather[0].description);
    if (aqiSubHumidity) aqiSubHumidity.textContent = `${data.main.humidity} %`;
    if (aqiSubWind) aqiSubWind.textContent = `${data.wind.speed} ${speedUnit}`;

    // ==========================================================
    // AQI.IN INSPIRED 6-CARD TODAY'S HIGHLIGHTS UPDATES
    // ==========================================================
    
    // CARD 1: Wind Direction Pointer & Speed
    const windDeg = data.wind && data.wind.deg !== undefined ? data.wind.deg : 91;
    if (compassPointer) {
        compassPointer.style.transform = `rotate(${windDeg}deg)`;
    }
    if (windDegreeText) {
        windDegreeText.textContent = getWindDirectionLabel(windDeg);
    }
    if (windSpeedText) {
        windSpeedText.textContent = `${data.wind.speed} ${speedUnit}`;
    }

    // CARD 2: Gust Speed
    const gustVal = data.wind && data.wind.gust ? data.wind.gust : (data.wind.speed * 1.25).toFixed(1);
    if (gustSpeedText) {
        gustSpeedText.textContent = `${gustVal} m/s`;
    }

    // CARD 3: Cloud Cover & Visibility
    const cloudsVal = data.clouds ? data.clouds.all : 65;
    const visVal = data.visibility ? (data.visibility / 1000).toFixed(0) : 10;
    if (cloudCoverText) cloudCoverText.textContent = `${cloudsVal} %`;
    if (visibilityText) visibilityText.textContent = `${visVal} km`;

    // CARD 4: Precipitation
    const precipVal = data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0;
    if (precipValText) precipValText.textContent = `${precipVal} mm`;
    if (precipSubtext) precipSubtext.textContent = precipVal > 0 ? `Current precipitation chances sit at ${precipVal}mm` : `No active precipitation detected (${precipVal}mm)`;

    // CARD 5: Pressure & Analog Gauge Needle
    const pressVal = data.main.pressure || 998;
    if (pressureValText) pressureValText.textContent = `${pressVal} mb`;
    if (pressureSubtext) pressureSubtext.textContent = `Current pressure level is a ${pressVal}mb.`;
    
    if (pressureNeedle) {
        // Map 950mb to 1050mb range to -110deg to +110deg
        const clampedPress = Math.max(950, Math.min(1050, pressVal));
        const deg = ((clampedPress - 950) / 100) * 220 - 110;
        pressureNeedle.style.transform = `rotate(${deg}deg)`;
    }
    if (pressureSpectrumDot) {
        const pct = Math.max(0, Math.min(100, ((pressVal - 950) / 100) * 100));
        pressureSpectrumDot.style.left = `${pct}%`;
    }

    // CARD 6: UV Index & Rainbow Spectrum Dot
    const uvVal = Math.max(0, Math.min(11, Math.round((100 - (data.clouds ? data.clouds.all : 20)) / 10)));
    const uvObj = getUVLabel(uvVal);
    if (uvValText) uvValText.textContent = `${uvVal} ${uvObj.level}`;
    if (uvSubtext) uvSubtext.textContent = `The present UV index is ${uvVal}, consider suggestions for same!`;
    if (uvSpectrumDot) {
        const pct = Math.max(5, Math.min(95, (uvVal / 11) * 100));
        uvSpectrumDot.style.left = `${pct}%`;
    }
    if (aqiSubUV) aqiSubUV.textContent = uvVal;

    updateBackground(data.weather[0].main);
    initWeatherParticles(data.weather[0].main);
    updateSolarArc(data.sys);

    if (data.coord) {
        updateRadarMap(data.coord.lat, data.coord.lon, data.name);
        loadAQI(data.coord.lat, data.coord.lon).then(aqiObj => {
            updateSmartAdvice(data.weather[0].main, data.main.temp, data.main.humidity, data.wind.speed, aqiObj);
        });
    } else {
        updateSmartAdvice(data.weather[0].main, data.main.temp, data.main.humidity, data.wind.speed, null);
    }
}

function updateSolarArc(sysData) {
    const sunriseTimeText = document.getElementById("sunriseTimeText");
    const sunsetTimeText = document.getElementById("sunsetTimeText");
    const daylightRemainText = document.getElementById("daylightRemainText");
    const goldenHourBadge = document.getElementById("goldenHourBadge");
    const sunDot = document.getElementById("sunDot");

    if (!sysData || !sysData.sunrise || !sysData.sunset) return;

    const sunriseMs = sysData.sunrise * 1000;
    const sunsetMs = sysData.sunset * 1000;

    const sunriseDate = new Date(sunriseMs);
    const sunsetDate = new Date(sunsetMs);

    const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sunriseTimeText) sunriseTimeText.textContent = formatTime(sunriseDate);
    if (sunsetTimeText) sunsetTimeText.textContent = formatTime(sunsetDate);

    const goldenHourStart = new Date(sunsetMs - 45 * 60 * 1000);
    if (goldenHourBadge) {
        goldenHourBadge.textContent = `📸 Golden Hour: ${formatTime(goldenHourStart)}`;
    }

    const nowMs = Date.now();
    let daylightMsg = "Sun has set";

    if (nowMs < sunriseMs) {
        const diffMs = sunriseMs - nowMs;
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        daylightMsg = `Sunrise in ${hrs}h ${mins}m`;
    } else if (nowMs <= sunsetMs) {
        const diffMs = sunsetMs - nowMs;
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        daylightMsg = `${hrs} hrs ${mins} mins`;
    }

    if (daylightRemainText) daylightRemainText.textContent = daylightMsg;

    let pct = 0.5;
    if (nowMs >= sunriseMs && nowMs <= sunsetMs) {
        pct = (nowMs - sunriseMs) / (sunsetMs - sunriseMs);
    } else if (nowMs > sunsetMs) {
        pct = 1;
    } else if (nowMs < sunriseMs) {
        pct = 0;
    }

    const angle = Math.PI * (1 - pct);
    const cx = 100 + 80 * Math.cos(angle);
    const cy = 90 - 80 * Math.sin(angle);

    if (sunDot) {
        sunDot.setAttribute("cx", cx.toFixed(1));
        sunDot.setAttribute("cy", cy.toFixed(1));
    }
}

function updateSmartAdvice(weatherMain, temp, humidityVal, windVal, aqiObj) {
    if (!weatherAlert) return;
    const advice = generateSmartAdvice(weatherMain, temp, humidityVal, windVal, aqiObj);
    alertTitle.textContent = advice.title;
    alertText.textContent = advice.text;
    alertIcon.className = `fa-solid ${advice.icon} alert-icon ${advice.type}`;
    weatherAlert.classList.remove("hidden");
}

function updateBackground(weatherMain) {
    const body = document.body;
    body.classList.remove("clear", "clouds", "rain", "snow", "storm");
    const main = weatherMain.toLowerCase();

    if (main.includes("clear")) body.classList.add("clear");
    else if (main.includes("cloud")) body.classList.add("clouds");
    else if (main.includes("rain") || main.includes("drizzle")) body.classList.add("rain");
    else if (main.includes("snow")) body.classList.add("snow");
    else if (main.includes("thunder") || main.includes("storm")) body.classList.add("storm");
    else body.classList.add("clouds");
}

/* ==========================================================
                    PDF REPORT EXPORT ENGINE
========================================================== */
async function exportWeatherReport() {
    const btn = document.getElementById("exportPdfBtn");
    if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;

    try {
        const reportDiv = document.createElement("div");
        reportDiv.id = "pdfReportTemplate";
        reportDiv.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 720px;
            padding: 28px;
            background: #0f172a;
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            border-radius: 20px;
            border: 2px solid rgba(79, 172, 254, 0.4);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;

        const curTemp = tempElement ? tempElement.textContent : '31';
        const curCond = weatherCondition ? weatherCondition.textContent : 'Clear Sky';
        const curCity = cityName ? cityName.textContent : 'Delhi, IN';
        const curFeels = feelsLike ? feelsLike.textContent : '33°';
        const curHum = humidity ? humidity.textContent : '62%';
        const curWind = wind ? wind.textContent : '8 km/h';

        const curAQI = aqiScoreVal ? aqiScoreVal.textContent : '141';
        const curAQIStatus = aqiStatusPill ? aqiStatusPill.textContent : 'Poor';
        const curPM25 = pm25Val ? pm25Val.textContent : '54 µg/m³';
        const curPM10 = pm10Val ? pm10Val.textContent : '67 µg/m³';

        const d = new Date();
        const dateStr = d.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        reportDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid rgba(255,255,255,0.15); padding-bottom:14px; margin-bottom:18px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:28px;">☁️</span>
                    <div>
                        <h1 style="font-size:22px; font-weight:800; margin:0; color:#ffffff;">SkyCast Intelligence</h1>
                        <p style="font-size:11px; color:rgba(255,255,255,0.6); margin:0;">Official Weather & Air Quality Report</p>
                    </div>
                </div>
                <div style="text-align:right;">
                    <p style="font-size:11px; color:rgba(255,255,255,0.7); margin:0;">${dateStr}</p>
                    <span style="font-size:9px; padding:3px 8px; background:rgba(79,172,254,0.25); color:#4facfe; border-radius:6px; font-weight:700;">VERIFIED REPORT</span>
                </div>
            </div>

            <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:18px; padding:18px; margin-bottom:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h2 style="font-size:26px; font-weight:800; margin:0; color:#ffffff;">${curCity}</h2>
                        <p style="font-size:15px; color:#4facfe; margin:4px 0 0 0;">${curCond}</p>
                    </div>
                    <div style="font-size:42px; font-weight:800; color:#ffffff;">
                        ${curTemp}°
                    </div>
                </div>

                <div style="display:flex; justify-style:space-around; margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.1); font-size:13px; color:rgba(255,255,255,0.85);">
                    <div>🌡️ <strong>Feels Like:</strong> ${curFeels}</div>
                    <div>💧 <strong>Humidity:</strong> ${curHum}</div>
                    <div>💨 <strong>Wind:</strong> ${curWind}</div>
                </div>
            </div>

            <div style="background:linear-gradient(145deg, rgba(62,46,32,0.95), rgba(38,30,25,0.95)); border:1px solid rgba(255,183,77,0.3); border-radius:18px; padding:18px; margin-bottom:18px; color:#ffffff;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:11px; color:rgba(255,255,255,0.7); text-transform:uppercase; font-weight:600;">Air Quality Index</span>
                        <h3 style="font-size:32px; font-weight:800; margin:2px 0 0 0; color:#ff9800;">${curAQI} <span style="font-size:13px; color:rgba(255,255,255,0.6);">US AQI</span></h3>
                    </div>
                    <div style="padding:6px 16px; background:rgba(255,152,0,0.25); color:#ffa726; border-radius:12px; font-weight:800; font-size:15px;">
                        ${curAQIStatus}
                    </div>
                </div>
                <div style="display:flex; gap:24px; margin-top:12px; font-size:13px; color:rgba(255,255,255,0.85);">
                    <div>PM2.5: <strong>${curPM25}</strong></div>
                    <div>PM10: <strong>${curPM10}</strong></div>
                </div>
            </div>

            <div style="text-align:center; font-size:10px; color:rgba(255,255,255,0.45); border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                Generated by SkyCast Intelligence Engine • http://localhost:8080
            </div>
        `;

        document.body.appendChild(reportDiv);

        if (window.html2canvas) {
            const canvas = await window.html2canvas(reportDiv, { scale: 2, backgroundColor: "#0f172a" });
            const imgData = canvas.toDataURL("image/png");

            if (window.jspdf && window.jspdf.jsPDF) {
                const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
                const imgWidth = 190;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
                const safeCity = curCity.replace(/[^a-zA-Z0-9]/g, "_");
                pdf.save(`SkyCast_Report_${safeCity}.pdf`);
            } else {
                const link = document.createElement("a");
                link.download = `SkyCast_Report_${curCity}.png`;
                link.href = imgData;
                link.click();
            }
        } else {
            window.print();
        }

        document.body.removeChild(reportDiv);
    } catch (err) {
        console.error("PDF generation error:", err);
        window.print();
    } finally {
        if (btn) btn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Export PDF`;
    }
}

/* ==========================================================
                    SIDE-BY-SIDE CITY COMPARISON ENGINE
========================================================== */
function openCompareModal() {
    if (compareModal) {
        if (compareCity1Input) compareCity1Input.value = currentCity || "Delhi";
        if (compareCity2Input && compareCity2Input.value === compareCity1Input.value) {
            compareCity2Input.value = "Shimla";
        }
        compareModal.classList.remove("hidden");
        executeCityComparison();
    }
}

function closeCompareModal() {
    if (compareModal) {
        compareModal.classList.add("hidden");
    }
}

async function executeCityComparison() {
    const c1Name = compareCity1Input ? compareCity1Input.value.trim() : "Delhi";
    const c2Name = compareCity2Input ? compareCity2Input.value.trim() : "Shimla";

    if (!c1Name || !c2Name) return;

    try {
        let w1 = await fetchJSON(`${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(c1Name)}&appid=${OPENWEATHER_API_KEY}&units=${currentUnit}`).catch(() => getMockWeather(c1Name));
        let w2 = await fetchJSON(`${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(c2Name)}&appid=${OPENWEATHER_API_KEY}&units=${currentUnit}`).catch(() => getMockWeather(c2Name));

        let aqi1Obj = { usAqi: 141, label: "Poor" };
        let aqi2Obj = { usAqi: 42, label: "Good" };

        if (w1.coord) {
            let aqi1Data = await fetchJSON(`${OPENWEATHER_BASE_URL}/air_pollution?lat=${w1.coord.lat}&lon=${w1.coord.lon}&appid=${OPENWEATHER_API_KEY}`).catch(() => null);
            if (aqi1Data && aqi1Data.list && aqi1Data.list[0]) {
                const pm25 = aqi1Data.list[0].components ? aqi1Data.list[0].components.pm2_5 : 54;
                const usAqi = calculateUSAQI(pm25);
                aqi1Obj = { usAqi, ...getAQIStatusDetails(usAqi) };
            }
        }

        if (w2.coord) {
            let aqi2Data = await fetchJSON(`${OPENWEATHER_BASE_URL}/air_pollution?lat=${w2.coord.lat}&lon=${w2.coord.lon}&appid=${OPENWEATHER_API_KEY}`).catch(() => null);
            if (aqi2Data && aqi2Data.list && aqi2Data.list[0]) {
                const pm25 = aqi2Data.list[0].components ? aqi2Data.list[0].components.pm2_5 : 12;
                const usAqi = calculateUSAQI(pm25);
                aqi2Obj = { usAqi, ...getAQIStatusDetails(usAqi) };
            }
        }

        renderComparisonResults(w1, w2, aqi1Obj, aqi2Obj);
    } catch (error) {
        console.error("Comparison Error:", error);
    }
}

function renderComparisonResults(w1, w2, aqi1, aqi2) {
    const unitSymbol = currentUnit === "imperial" ? "°F" : "°C";

    // City 1 Card
    const compCity1Name = document.getElementById("compCity1Name");
    const compCity1Flag = document.getElementById("compCity1Flag");
    const compCity1Icon = document.getElementById("compCity1Icon");
    const compCity1Temp = document.getElementById("compCity1Temp");
    const compCity1Cond = document.getElementById("compCity1Cond");
    const compCity1AQIPill = document.getElementById("compCity1AQIPill");

    if (compCity1Name) compCity1Name.textContent = `${w1.name}${w1.sys && w1.sys.country ? ', ' + w1.sys.country : ''}`;
    if (compCity1Flag) compCity1Flag.textContent = getCountryFlag(w1.sys ? w1.sys.country : 'IN');
    if (compCity1Icon) compCity1Icon.src = getIcon(w1.weather[0].icon);
    if (compCity1Temp) compCity1Temp.textContent = `${Math.round(w1.main.temp)}${unitSymbol}`;
    if (compCity1Cond) compCity1Cond.textContent = capitalize(w1.weather[0].description);
    if (compCity1AQIPill) compCity1AQIPill.textContent = `AQI: ${aqi1.usAqi} (${aqi1.label || 'Moderate'})`;

    // City 2 Card
    const compCity2Name = document.getElementById("compCity2Name");
    const compCity2Flag = document.getElementById("compCity2Flag");
    const compCity2Icon = document.getElementById("compCity2Icon");
    const compCity2Temp = document.getElementById("compCity2Temp");
    const compCity2Cond = document.getElementById("compCity2Cond");
    const compCity2AQIPill = document.getElementById("compCity2AQIPill");

    if (compCity2Name) compCity2Name.textContent = `${w2.name}${w2.sys && w2.sys.country ? ', ' + w2.sys.country : ''}`;
    if (compCity2Flag) compCity2Flag.textContent = getCountryFlag(w2.sys ? w2.sys.country : 'IN');
    if (compCity2Icon) compCity2Icon.src = getIcon(w2.weather[0].icon);
    if (compCity2Temp) compCity2Temp.textContent = `${Math.round(w2.main.temp)}${unitSymbol}`;
    if (compCity2Cond) compCity2Cond.textContent = capitalize(w2.weather[0].description);
    if (compCity2AQIPill) compCity2AQIPill.textContent = `AQI: ${aqi2.usAqi} (${aqi2.label || 'Moderate'})`;

    // Insights Summary
    const compInsightText = document.getElementById("compInsightText");
    const tempDiff = Math.abs(Math.round(w1.main.temp - w2.main.temp));
    const warmerCity = w1.main.temp > w2.main.temp ? w1.name : w2.name;
    const aqiDiff = Math.abs(aqi1.usAqi - aqi2.usAqi);
    const cleanerCity = aqi1.usAqi < aqi2.usAqi ? w1.name : w2.name;

    if (compInsightText) {
        compInsightText.innerHTML = `<strong>${warmerCity}</strong> is <strong>${tempDiff}°</strong> warmer.<br><strong>${cleanerCity}</strong> has cleaner air (by <strong>${aqiDiff} AQI</strong> pts).`;
    }

    // Set City Tag Labels
    const tempCity1Tag = document.getElementById("tempCity1Tag");
    const tempCity2Tag = document.getElementById("tempCity2Tag");
    const aqiCity1Tag = document.getElementById("aqiCity1Tag");
    const aqiCity2Tag = document.getElementById("aqiCity2Tag");
    const humCity1Tag = document.getElementById("humCity1Tag");
    const humCity2Tag = document.getElementById("humCity2Tag");
    const windCity1Tag = document.getElementById("windCity1Tag");
    const windCity2Tag = document.getElementById("windCity2Tag");

    if (tempCity1Tag) tempCity1Tag.textContent = w1.name;
    if (tempCity2Tag) tempCity2Tag.textContent = w2.name;
    if (aqiCity1Tag) aqiCity1Tag.textContent = w1.name;
    if (aqiCity2Tag) aqiCity2Tag.textContent = w2.name;
    if (humCity1Tag) humCity1Tag.textContent = w1.name;
    if (humCity2Tag) humCity2Tag.textContent = w2.name;
    if (windCity1Tag) windCity1Tag.textContent = w1.name;
    if (windCity2Tag) windCity2Tag.textContent = w2.name;

    // Metric Bar 1: Temperature
    const tempDiffText = document.getElementById("tempDiffText");
    const compTempBar1 = document.getElementById("compTempBar1");
    const compTempBar2 = document.getElementById("compTempBar2");
    if (tempDiffText) tempDiffText.textContent = `${warmerCity} is ${tempDiff}° warmer`;
    
    const maxTemp = Math.max(Math.abs(w1.main.temp), Math.abs(w2.main.temp), 1);
    if (compTempBar1) {
        compTempBar1.style.width = `${Math.max(25, (Math.abs(w1.main.temp) / maxTemp) * 100)}%`;
        compTempBar1.textContent = `${Math.round(w1.main.temp)}${unitSymbol}`;
    }
    if (compTempBar2) {
        compTempBar2.style.width = `${Math.max(25, (Math.abs(w2.main.temp) / maxTemp) * 100)}%`;
        compTempBar2.textContent = `${Math.round(w2.main.temp)}${unitSymbol}`;
    }

    // Metric Bar 2: AQI
    const aqiDiffText = document.getElementById("aqiDiffText");
    const compAQIBar1 = document.getElementById("compAQIBar1");
    const compAQIBar2 = document.getElementById("compAQIBar2");
    if (aqiDiffText) aqiDiffText.textContent = `${cleanerCity} has cleaner air (${aqiDiff} pts lower)`;

    const maxAQI = Math.max(aqi1.usAqi, aqi2.usAqi, 1);
    if (compAQIBar1) {
        compAQIBar1.style.width = `${Math.max(25, (aqi1.usAqi / maxAQI) * 100)}%`;
        compAQIBar1.textContent = `${aqi1.usAqi} (${aqi1.label || 'Moderate'})`;
        compAQIBar1.className = `bar-left ${aqi1.usAqi > 100 ? 'aqi-bad' : 'aqi-good-b'}`;
    }
    if (compAQIBar2) {
        compAQIBar2.style.width = `${Math.max(25, (aqi2.usAqi / maxAQI) * 100)}%`;
        compAQIBar2.textContent = `${aqi2.usAqi} (${aqi2.label || 'Moderate'})`;
        compAQIBar2.className = `bar-right ${aqi2.usAqi > 100 ? 'aqi-bad' : 'aqi-good-b'}`;
    }

    // Metric Bar 3: Humidity
    const humidityDiffText = document.getElementById("humidityDiffText");
    const compHumBar1 = document.getElementById("compHumBar1");
    const compHumBar2 = document.getElementById("compHumBar2");
    const humDiff = Math.abs(w1.main.humidity - w2.main.humidity);
    const humidCity = w1.main.humidity > w2.main.humidity ? w1.name : w2.name;

    if (humidityDiffText) humidityDiffText.textContent = `${humidCity} is ${humDiff}% more humid`;
    if (compHumBar1) {
        compHumBar1.style.width = `${Math.max(20, w1.main.humidity)}%`;
        compHumBar1.textContent = `${w1.main.humidity}%`;
    }
    if (compHumBar2) {
        compHumBar2.style.width = `${Math.max(20, w2.main.humidity)}%`;
        compHumBar2.textContent = `${w2.main.humidity}%`;
    }

    // Metric Bar 4: Wind Speed
    const windDiffText = document.getElementById("windDiffText");
    const compWindBar1 = document.getElementById("compWindBar1");
    const compWindBar2 = document.getElementById("compWindBar2");
    const windDiff = Math.abs(w1.wind.speed - w2.wind.speed).toFixed(1);
    const windierCity = w1.wind.speed > w2.wind.speed ? w1.name : w2.name;
    const speedUnit = currentUnit === "imperial" ? "mph" : "km/h";

    if (windDiffText) windDiffText.textContent = `${windierCity} is ${windDiff} ${speedUnit} windier`;
    const maxWind = Math.max(w1.wind.speed, w2.wind.speed, 1);
    if (compWindBar1) {
        compWindBar1.style.width = `${Math.max(20, (w1.wind.speed / maxWind) * 100)}%`;
        compWindBar1.textContent = `${w1.wind.speed} ${speedUnit}`;
    }
    if (compWindBar2) {
        compWindBar2.style.width = `${Math.max(20, (w2.wind.speed / maxWind) * 100)}%`;
        compWindBar2.textContent = `${w2.wind.speed} ${speedUnit}`;
    }
}

/* ==========================================================
                    HOURLY FORECAST & CHART.JS
========================================================== */
function renderHourlyForecast(list) {
    if (!hourlyContainer) return;
    hourlyContainer.innerHTML = "";

    list.slice(0, 12).forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "hour-card fade-in";
        card.style.animationDelay = `${index * 0.05}s`;

        const timeStr = new Date(item.dt * 1000).toLocaleTimeString([], { hour: "numeric" });
        card.innerHTML = `
            <p class="hour-time">${timeStr}</p>
            <img src="${getIcon(item.weather[0].icon)}" alt="${item.weather[0].main}">
            <h3 class="hour-temp">${Math.round(item.main.temp)}°</h3>
            <span class="hour-cond">${item.weather[0].main}</span>
        `;
        hourlyContainer.appendChild(card);
    });
}

function renderHourlyChart(list) {
    const canvas = document.getElementById("hourlyChart");
    if (!canvas || !window.Chart) return;

    const hourlySlice = list.slice(0, 8);
    const labels = hourlySlice.map(item => new Date(item.dt * 1000).toLocaleTimeString([], { hour: "numeric" }));
    const temps = hourlySlice.map(item => Math.round(item.main.temp));

    if (hourlyChartInstance) {
        hourlyChartInstance.destroy();
    }

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, "rgba(79, 172, 254, 0.5)");
    gradient.addColorStop(1, "rgba(79, 172, 254, 0.0)");

    hourlyChartInstance = new window.Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Temperature Trend",
                data: temps,
                borderColor: "#4facfe",
                borderWidth: 3,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#00f2fe",
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true,
                backgroundColor: gradient
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.raw}°`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "rgba(255,255,255,0.7)", font: { family: 'Poppins', size: 11 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: "rgba(255,255,255,0.7)", font: { family: 'Poppins', size: 11 } },
                    grid: { color: "rgba(255,255,255,0.1)" }
                }
            }
        }
    });
}

/* ==========================================================
                    5-DAY FORECAST LIST
========================================================== */
function renderFiveDayForecast(list) {
    if (!forecastContainer) return;
    forecastContainer.innerHTML = "";

    const daysMap = {};
    list.forEach(item => {
        const dateKey = item.dt_txt.split(" ")[0];
        if (!daysMap[dateKey]) {
            daysMap[dateKey] = item;
        }
    });

    Object.values(daysMap).slice(0, 5).forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "forecast-item slide-up";
        row.style.animationDelay = `${index * 0.08}s`;

        row.innerHTML = `
            <p class="forecast-day">${formatDay(item.dt_txt)}</p>
            <img src="${getIcon(item.weather[0].icon)}" alt="icon">
            <span class="forecast-desc">${item.weather[0].main}</span>
            <h4 class="forecast-temp">${Math.round(item.main.temp)}°</h4>
        `;
        forecastContainer.appendChild(row);
    });
}

/* ==========================================================
                    INTERACTIVE LEAFLET RADAR MAP
========================================================== */
function initRadarMap() {
    const mapContainer = document.getElementById("radarMap");
    if (!mapContainer || !window.L || leafletMap) return;

    leafletMap = L.map("radarMap", {
        center: [28.6139, 77.2090],
        zoom: 7,
        zoomControl: true,
        attributionControl: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        subdomains: "abcd"
    }).addTo(leafletMap);

    radarTileLayer = L.tileLayer("https://tile.rainviewer.com/v2/radar/now/256/{z}/{x}/{y}/2/1_1.png", {
        opacity: 0.65,
        maxZoom: 18
    }).addTo(leafletMap);

    mapMarker = L.marker([28.6139, 77.2090]).addTo(leafletMap)
        .bindPopup("<b>SkyCast Radar Center</b>")
        .openPopup();
}

function updateRadarMap(lat, lon, cityNameStr) {
    if (!leafletMap) {
        initRadarMap();
    }
    if (leafletMap) {
        leafletMap.setView([lat, lon], 8);
        if (mapMarker) {
            mapMarker.setLatLng([lat, lon]);
            mapMarker.bindPopup(`<b>${cityNameStr}</b><br>Live Radar Position`).openPopup();
        }
        setTimeout(() => leafletMap.invalidateSize(), 300);
    }
}

/* ==========================================================
                    FAVORITE CITIES MANAGER
========================================================== */
function getFavorites() {
    return favoritesCache;
}

async function fetchFavoritesFromServer() {
    try {
        favoritesCache = await fetchJSON(`${OPENWEATHER_BASE_URL}/favorites`);
    } catch (e) {
        console.warn("Failed to load favorites from server:", e);
        favoritesCache = [];
    }
}

function isFavorite(city) {
    return favoritesCache.some(f => f.toLowerCase() === city.toLowerCase());
}

async function toggleFavoriteCurrentCity() {
    if (!currentCity) return;
    try {
        if (isFavorite(currentCity)) {
            favoritesCache = await fetchJSON(`${OPENWEATHER_BASE_URL}/favorites/${encodeURIComponent(currentCity)}`, { method: 'DELETE' });
            if (typeof showToastNotification === "function") {
                showToastNotification("Favorites Updated", `Removed ${currentCity} from your favorites.`, "fa-star", "info");
            }
        } else {
            const response = await fetch(`${OPENWEATHER_BASE_URL}/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city: currentCity })
            });
            if (response.ok) {
                favoritesCache = await response.json();
                if (typeof showToastNotification === "function") {
                    showToastNotification("Favorites Updated", `Saved ${currentCity} to your favorites!`, "fa-star", "success");
                }
            }
        }
        updateFavoriteButtonState();
        renderFavorites();
    } catch (error) {
        console.error("Error toggling favorite on server:", error);
    }
}

function updateFavoriteButtonState() {
    if (!favoriteIcon) return;
    if (isFavorite(currentCity)) {
        favoriteIcon.className = "fa-solid fa-star active";
    } else {
        favoriteIcon.className = "fa-regular fa-star";
    }
}

function renderFavorites() {
    if (!favoriteList) return;
    const favorites = getFavorites();

    if (favorites.length === 0) {
        favoriteList.innerHTML = `<p class="empty-favs">No favorite cities added yet. Click the star on any city to pin it!</p>`;
        return;
    }

    favoriteList.innerHTML = "";
    favorites.forEach(city => {
        const pill = document.createElement("div");
        pill.className = "fav-pill glass";
        pill.innerHTML = `
            <span><i class="fa-solid fa-location-dot"></i> ${city}</span>
            <button class="remove-fav-btn" title="Remove"><i class="fa-solid fa-xmark"></i></button>
        `;
        pill.querySelector("span").addEventListener("click", () => {
            cityInput.value = city;
            loadWeather(city);
        });
        pill.querySelector(".remove-fav-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
                favoritesCache = await fetchJSON(`${OPENWEATHER_BASE_URL}/favorites/${encodeURIComponent(city)}`, { method: 'DELETE' });
                updateFavoriteButtonState();
                renderFavorites();
            } catch (err) {
                console.error("Failed to remove favorite on server:", err);
            }
        });
        favoriteList.appendChild(pill);
    });
}

/* ==========================================================
                    BACKEND SEARCH HISTORY
========================================================== */
function getHistory() {
    return historyCache;
}

async function fetchHistoryFromServer() {
    try {
        historyCache = await fetchJSON(`${OPENWEATHER_BASE_URL}/history`);
    } catch (e) {
        console.warn("Failed to load history from server:", e);
        historyCache = [];
    }
}

async function saveHistory(city) {
    try {
        const response = await fetch(`${OPENWEATHER_BASE_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city })
        });
        if (response.ok) {
            historyCache = await response.json();
        }
    } catch (error) {
        console.error("Failed to save search history to server:", error);
    }
}

function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = "";

    const history = getHistory();
    if (history.length === 0) {
        historyList.innerHTML = `<li class="no-history">No recent searches</li>`;
        return;
    }

    history.forEach(city => {
        const li = document.createElement("li");
        li.className = "history-chip";
        li.textContent = city;
        li.addEventListener("click", () => {
            cityInput.value = city;
            loadWeather(city);
        });
        historyList.appendChild(li);
    });
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", async () => {
        try {
            historyCache = await fetchJSON(`${OPENWEATHER_BASE_URL}/history`, { method: 'DELETE' });
            renderHistory();
        } catch (e) {
            console.error("Failed to clear history on server:", e);
        }
    });
}

/* ==========================================================
                    GEOLOCATION HANDLER
========================================================== */
async function loadWeatherByCoordinates(lat, lon) {
    showLoader();
    try {
        let weather = null;
        try {
            const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${currentUnit}`;
            weather = await fetchJSON(url);
        } catch (directErr) {
            weather = getMockWeather("My Location");
            weather.coord = { lat, lon };
        }
        currentCity = weather.name;
        currentWeather = weather;
        updateCurrentWeatherView(weather);
        saveHistory(currentCity);
        renderHistory();
        updateFavoriteButtonState();
        await loadForecast(currentCity);
    } catch (error) {
        showError("Unable to retrieve location weather.");
    } finally {
        hideLoader();
    }
}

function detectLocation() {
    if (!navigator.geolocation) {
        showError("Geolocation is not supported by your browser.");
        return;
    }
    showLoader();
    navigator.geolocation.getCurrentPosition(
        position => {
            loadWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
        },
        () => {
            hideLoader();
            showError("Location access denied or unavailable.");
        }
    );
}

/* ==========================================================
                    TEMPERATURE UNIT CONTROLS
========================================================== */
function setTemperatureUnit(unit) {
    if (unit !== "metric" && unit !== "imperial" || unit === currentUnit) return;
    currentUnit = unit;
    localStorage.setItem(STORAGE_KEYS.UNIT, unit);
    updateUnitButtons();
    loadWeather(currentCity);
}

function updateUnitButtons() {
    if (celsiusBtn) celsiusBtn.classList.toggle("active", currentUnit === "metric");
    if (fahrenheitBtn) fahrenheitBtn.classList.toggle("active", currentUnit === "imperial");
}

/* ==========================================================
                    SCROLL TO TOP BUTTON
========================================================== */
window.addEventListener("scroll", () => {
    if (scrollTopBtn) {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add("show");
        } else {
            scrollTopBtn.classList.remove("show");
        }
    }
});

if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* ==========================================================
                    MAP LAYER SWITCHERS
========================================================== */
if (rainLayerBtn) {
    rainLayerBtn.addEventListener("click", () => {
        rainLayerBtn.classList.add("active");
        if (cloudsLayerBtn) cloudsLayerBtn.classList.remove("active");
        if (radarTileLayer && leafletMap) {
            if (!leafletMap.hasLayer(radarTileLayer)) radarTileLayer.addTo(leafletMap);
            if (cloudsTileLayer && leafletMap.hasLayer(cloudsTileLayer)) leafletMap.removeLayer(cloudsTileLayer);
        }
    });
}

if (cloudsLayerBtn) {
    cloudsLayerBtn.addEventListener("click", () => {
        cloudsLayerBtn.classList.add("active");
        if (rainLayerBtn) rainLayerBtn.classList.remove("active");
        if (leafletMap) {
            if (radarTileLayer && leafletMap.hasLayer(radarTileLayer)) leafletMap.removeLayer(radarTileLayer);
            if (!cloudsTileLayer) {
                cloudsTileLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`, {
                    opacity: 0.65
                });
            }
            cloudsTileLayer.addTo(leafletMap);
        }
    });
}

/* ==========================================================
                    EVENT BINDINGS & LISTENERS
========================================================== */
if (searchBtn) searchBtn.addEventListener("click", () => loadWeather(cityInput.value.trim()));

document.querySelectorAll(".quick-tag").forEach(tag => {
    tag.addEventListener("click", () => {
        const city = tag.dataset.city;
        if (cityInput) cityInput.value = city;
        loadWeather(city);
    });
});

if (cityInput) {
    cityInput.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchCitySuggestions(val);
        }, 250);
    });

    cityInput.addEventListener("keydown", (e) => {
        const items = autocompleteDropdown ? autocompleteDropdown.querySelectorAll(".autocomplete-item") : [];
        
        if (e.key === "Enter") {
            if (items.length > 0 && selectedAutocompleteIndex >= 0 && !autocompleteDropdown.classList.contains("hidden")) {
                e.preventDefault();
                items[selectedAutocompleteIndex].click();
            } else {
                hideAutocomplete();
                loadWeather(cityInput.value.trim());
            }
            return;
        }

        if (items.length === 0 || autocompleteDropdown.classList.contains("hidden")) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedAutocompleteIndex = (selectedAutocompleteIndex + 1) % items.length;
            updateAutocompleteSelection(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedAutocompleteIndex = (selectedAutocompleteIndex - 1 + items.length) % items.length;
            updateAutocompleteSelection(items);
        } else if (e.key === "Escape") {
            hideAutocomplete();
        }
    });
}

function updateAutocompleteSelection(items) {
    items.forEach((item, idx) => {
        if (idx === selectedAutocompleteIndex) {
            item.classList.add("selected");
            const cityNameSpan = item.querySelector(".autocomplete-city span:last-child");
            if (cityNameSpan) cityInput.value = cityNameSpan.textContent;
        } else {
            item.classList.remove("selected");
        }
    });
}

document.addEventListener("click", (e) => {
    if (cityInput && !cityInput.contains(e.target) && autocompleteDropdown && !autocompleteDropdown.contains(e.target)) {
        hideAutocomplete();
    }
});

if (locationBtn) locationBtn.addEventListener("click", detectLocation);
if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
if (celsiusBtn) celsiusBtn.addEventListener("click", () => setTemperatureUnit("metric"));
if (fahrenheitBtn) fahrenheitBtn.addEventListener("click", () => setTemperatureUnit("imperial"));
if (favoriteBtn) favoriteBtn.addEventListener("click", toggleFavoriteCurrentCity);

// View Mode Switcher Tabs & Share Action
if (tabWeather) {
    tabWeather.addEventListener("click", () => {
        tabWeather.classList.add("active");
        if (tabAQI) tabAQI.classList.remove("active");
        if (weatherCardView) {
            weatherCardView.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

if (tabAQI) {
    tabAQI.addEventListener("click", () => {
        tabAQI.classList.add("active");
        if (tabWeather) tabWeather.classList.remove("active");
        if (aqiHeroCardView) {
            aqiHeroCardView.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
        const shareText = `Check out live weather for ${currentCity}: ${tempElement ? tempElement.textContent : ''}° ${weatherCondition ? weatherCondition.textContent : ''} on SkyCast!`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `SkyCast Weather - ${currentCity}`,
                    text: shareText,
                    url: window.location.href
                });
            } catch (err) {
                console.warn("Share cancelled or failed");
            }
        } else {
            navigator.clipboard.writeText(shareText);
            showError("Weather summary copied to clipboard!");
        }
    });
}

// Side-by-Side Comparison Engine Listeners
if (compareBtn) compareBtn.addEventListener("click", openCompareModal);
if (closeCompareBtn) closeCompareBtn.addEventListener("click", closeCompareModal);
if (useCurrentCity1Btn) {
    useCurrentCity1Btn.addEventListener("click", () => {
        if (compareCity1Input) compareCity1Input.value = currentCity || "Delhi";
    });
}
if (runCompareBtn) runCompareBtn.addEventListener("click", executeCityComparison);

if (compareModal) {
    compareModal.addEventListener("click", (e) => {
        if (e.target === compareModal) closeCompareModal();
    });
}

// PDF Export Button Listener
if (exportPdfBtn) exportPdfBtn.addEventListener("click", exportWeatherReport);

// Network status tracking
window.addEventListener("offline", () => showError("No Internet Connection. Running in offline mode."));
window.addEventListener("online", () => { if (currentCity) loadWeather(currentCity); });

/* ==========================================================
                    SERVICE WORKER & PWA ENGINE
========================================================== */
let deferredPrompt = null;
const pwaInstallBtn = document.getElementById("pwaInstallBtn");

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[SkyCast] Service Worker Registered:', reg.scope))
            .catch(err => console.error('[SkyCast] SW Registration Error:', err));
    });
}

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) pwaInstallBtn.classList.remove("hidden");
});

if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[SkyCast PWA] User install choice outcome: ${outcome}`);
        deferredPrompt = null;
        pwaInstallBtn.classList.add("hidden");
    });
}

window.addEventListener("appinstalled", () => {
    console.log("[SkyCast PWA] App successfully installed!");
    if (pwaInstallBtn) pwaInstallBtn.classList.add("hidden");
});

/* ==========================================================
                    APP INITIALIZATION
========================================================== */
async function initializeApp() {
    updateDateDisplay();
    initializeTheme();
    updateUnitButtons();

    // Load favorites, history, and alert settings asynchronously from server before rendering
    await fetchFavoritesFromServer();
    await fetchHistoryFromServer();
    if (typeof initNotifications === "function") await initNotifications();

    const lastCity = localStorage.getItem(STORAGE_KEYS.LAST_CITY) || DEFAULT_CITY;
    cityInput.value = lastCity;

    renderHistory();
    renderFavorites();
    initRadarMap();

    // Alert Modal Listeners
    const alertBtn = document.getElementById("alertBtn");
    const alertModal = document.getElementById("alertModal");
    const closeAlertModalBtn = document.getElementById("closeAlertModalBtn");
    const requestPermissionBtn = document.getElementById("requestPermissionBtn");
    const saveAlertsBtn = document.getElementById("saveAlertsBtn");

    if (alertBtn && alertModal) {
        alertBtn.addEventListener("click", () => {
            alertModal.classList.remove("hidden");
            if (typeof updateAlertModalUI === "function") updateAlertModalUI();
        });
    }

    if (closeAlertModalBtn && alertModal) {
        closeAlertModalBtn.addEventListener("click", () => {
            alertModal.classList.add("hidden");
        });
        alertModal.addEventListener("click", (e) => {
            if (e.target === alertModal) alertModal.classList.add("hidden");
        });
    }

    if (requestPermissionBtn) {
        requestPermissionBtn.addEventListener("click", () => {
            if (typeof requestNotificationPermission === "function") requestNotificationPermission();
        });
    }

    if (saveAlertsBtn && alertModal) {
        saveAlertsBtn.addEventListener("click", async () => {
            if (typeof saveAlertModalSettings === "function") await saveAlertModalSettings();
            alertModal.classList.add("hidden");
        });
    }

    // Social Story Snapshot Modal Listeners
    const storyBtn = document.getElementById("storyBtn");
    const storyModal = document.getElementById("storyModal");
    const closeStoryModalBtn = document.getElementById("closeStoryModalBtn");
    const downloadStoryBtn = document.getElementById("downloadStoryBtn");

    if (storyBtn && storyModal) {
        storyBtn.addEventListener("click", () => {
            if (typeof populateStoryCard === "function") populateStoryCard();
            storyModal.classList.remove("hidden");
        });
    }

    if (closeStoryModalBtn && storyModal) {
        closeStoryModalBtn.addEventListener("click", () => {
            storyModal.classList.add("hidden");
        });
        storyModal.addEventListener("click", (e) => {
            if (e.target === storyModal) storyModal.classList.add("hidden");
        });
    }

    if (downloadStoryBtn) {
        downloadStoryBtn.addEventListener("click", () => {
            if (typeof downloadStoryCardPNG === "function") downloadStoryCardPNG();
        });
    }

    if (voiceBtn && cityInput) {
        initializeVoiceSearch(voiceBtn, cityInput, (city) => loadWeather(city));
    }

    loadWeather(lastCity);

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (currentCity) loadWeather(currentCity);
    }, 600000);
}

document.addEventListener("DOMContentLoaded", initializeApp);