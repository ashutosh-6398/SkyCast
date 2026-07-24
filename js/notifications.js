// js/notifications.js - Web Push Notifications & Severe Weather Alert Manager

let alertSettings = {
    rain: true,
    storm: true,
    uv: true,
    aqi: true,
    wind: true
};

let lastTriggeredAlerts = {};

/**
 * Initializes alert settings from backend server and sets up permission handlers.
 */
async function initNotifications() {
    try {
        const baseUrl = (window.location.protocol === 'file:' || window.location.port !== '8080') ? 'http://localhost:8080/api' : '/api';
        const fetched = await fetch(`${baseUrl}/alerts`).then(res => res.ok ? res.json() : null).catch(() => null);
        if (fetched) {
            alertSettings = { ...alertSettings, ...fetched };
        }
    } catch (e) {
        console.warn("[SkyCast Alerts] Failed to fetch alert settings from server:", e);
    }
    updateAlertModalUI();
}

/**
 * Requests native browser Notification permission.
 */
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showToastNotification("Alert System", "Browser does not support desktop notifications. Falling back to in-app banners.", "fa-triangle-exclamation", "warning");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            showToastNotification("Notifications Enabled", "You will now receive severe weather alerts!", "fa-bell", "success");
            sendPushNotification("SkyCast Alerts Active", {
                body: "Severe weather and precipitation alerts are now live.",
                icon: "assets/icons/weather-icon.svg"
            });
            return true;
        }
    }
    
    showToastNotification("Notifications Disabled", "Using in-app toast banners for weather warnings.", "fa-bell-slash", "info");
    return false;
}

/**
 * Evaluates live weather data against configured alert thresholds.
 */
function evaluateWeatherAlerts(weather, aqi, forecast) {
    if (!weather) return;

    const city = weather.name || "Current Location";
    const condMain = (weather.weather && weather.weather[0]) ? weather.weather[0].main.toLowerCase() : "";
    const condDesc = (weather.weather && weather.weather[0]) ? weather.weather[0].description : "";
    const temp = Math.round(weather.main ? weather.main.temp : 0);
    const gust = weather.wind ? Math.round((weather.wind.gust || weather.wind.speed) * 3.6) : 0; // km/h

    const now = Date.now();
    const COOLDOWN = 15 * 60 * 1000; // 15 minutes alert cooldown per category

    // 1. Rain & Drizzle Warning
    if (alertSettings.rain && (condMain.includes("rain") || condMain.includes("drizzle"))) {
        const key = `rain_${city}`;
        if (!lastTriggeredAlerts[key] || (now - lastTriggeredAlerts[key] > COOLDOWN)) {
            triggerAlert(
                `🌧️ Rain Notice — ${city}`,
                `${weather.weather[0].main} (${condDesc}) expected. Pack an umbrella!`,
                "fa-cloud-showers-heavy",
                "info"
            );
            lastTriggeredAlerts[key] = now;
        }
    }

    // 2. Severe Thunderstorm Alert
    if (alertSettings.storm && (condMain.includes("thunderstorm") || condMain.includes("squall") || condMain.includes("tornado"))) {
        const key = `storm_${city}`;
        if (!lastTriggeredAlerts[key] || (now - lastTriggeredAlerts[key] > COOLDOWN)) {
            triggerAlert(
                `⚡ Severe Storm Warning — ${city}`,
                `Thunderstorm detected nearby. Stay indoors and seek shelter!`,
                "fa-bolt-lightning",
                "danger"
            );
            lastTriggeredAlerts[key] = now;
        }
    }

    // 3. High Wind & Gust Warning (>= 40 km/h)
    if (alertSettings.wind && gust >= 40) {
        const key = `wind_${city}`;
        if (!lastTriggeredAlerts[key] || (now - lastTriggeredAlerts[key] > COOLDOWN)) {
            triggerAlert(
                `💨 High Wind Warning — ${city}`,
                `Strong wind gusts reaching ${gust} km/h recorded. Secure outdoor items.`,
                "fa-wind",
                "warning"
            );
            lastTriggeredAlerts[key] = now;
        }
    }

    // 4. High UV Spike Warning (UV >= 8)
    if (alertSettings.uv && window.currentUVIndex && window.currentUVIndex >= 8) {
        const key = `uv_${city}`;
        if (!lastTriggeredAlerts[key] || (now - lastTriggeredAlerts[key] > COOLDOWN)) {
            triggerAlert(
                `☀️ Extreme UV Spike — ${city}`,
                `UV Index is very high (${window.currentUVIndex}). Wear SPF 50+ sunscreen and sunglasses.`,
                "fa-sun",
                "warning"
            );
            lastTriggeredAlerts[key] = now;
        }
    }

    // 5. Severe AQI Pollution Alert (US AQI >= 151 / Level 4+)
    if (alertSettings.aqi && aqi && aqi.list && aqi.list[0]) {
        const item = aqi.list[0];
        const pm25 = item.components ? item.components.pm2_5 : 0;
        const usAqi = calculateUSAQI ? calculateUSAQI(pm25) : item.main.aqi * 40;
        if (usAqi >= 150) {
            const key = `aqi_${city}`;
            if (!lastTriggeredAlerts[key] || (now - lastTriggeredAlerts[key] > COOLDOWN)) {
                triggerAlert(
                    `😷 Unhealthy Air Quality — ${city}`,
                    `AQI reached ${usAqi} (Unhealthy). Wear an N95 mask outdoors.`,
                    "fa-smog",
                    "danger"
                );
                lastTriggeredAlerts[key] = now;
            }
        }
    }
}

/**
 * Triggers both native system Push Notification (if permitted) and In-App Banner.
 */
function triggerAlert(title, message, iconClass, type) {
    if ("Notification" in window && Notification.permission === "granted") {
        sendPushNotification(title, {
            body: message,
            icon: "assets/icons/weather-icon.svg"
        });
    }
    showToastNotification(title, message, iconClass, type);
}

/**
 * Sends a native system Push Notification.
 */
function sendPushNotification(title, options) {
    try {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, options);
        }
    } catch (e) {
        console.warn("[SkyCast Push Error]", e);
    }
}

/**
 * Renders a floating in-app Notification Banner Toast.
 */
function showToastNotification(title, message, iconClass = "fa-bell", type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `notification-toast toast-${type} glass fade-in`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.style.animation = "slideOut 0.4s ease forwards";
        setTimeout(() => toast.remove(), 400);
    });

    container.appendChild(toast);

    // Auto dismiss after 7 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = "slideOut 0.4s ease forwards";
            setTimeout(() => toast.remove(), 400);
        }
    }, 7000);
}

/**
 * Synchronizes alert modal checkboxes with stored alertSettings object.
 */
function updateAlertModalUI() {
    const rainToggle = document.getElementById("alertRainToggle");
    const stormToggle = document.getElementById("alertStormToggle");
    const uvToggle = document.getElementById("alertUVToggle");
    const aqiToggle = document.getElementById("alertAQIToggle");
    const windToggle = document.getElementById("alertWindToggle");

    if (rainToggle) rainToggle.checked = !!alertSettings.rain;
    if (stormToggle) stormToggle.checked = !!alertSettings.storm;
    if (uvToggle) uvToggle.checked = !!alertSettings.uv;
    if (aqiToggle) aqiToggle.checked = !!alertSettings.aqi;
    if (windToggle) windToggle.checked = !!alertSettings.wind;
}

/**
 * Saves updated alert modal checkboxes to local state and server database.
 */
async function saveAlertModalSettings() {
    const rainToggle = document.getElementById("alertRainToggle");
    const stormToggle = document.getElementById("alertStormToggle");
    const uvToggle = document.getElementById("alertUVToggle");
    const aqiToggle = document.getElementById("alertAQIToggle");
    const windToggle = document.getElementById("alertWindToggle");

    alertSettings = {
        rain: rainToggle ? rainToggle.checked : true,
        storm: stormToggle ? stormToggle.checked : true,
        uv: uvToggle ? uvToggle.checked : true,
        aqi: aqiToggle ? aqiToggle.checked : true,
        wind: windToggle ? windToggle.checked : true
    };

    try {
        const baseUrl = (window.location.protocol === 'file:' || window.location.port !== '8080') ? 'http://localhost:8080/api' : '/api';
        await fetch(`${baseUrl}/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertSettings)
        });
    } catch (e) {
        console.warn("Failed to persist alert settings to server:", e);
    }

    showToastNotification("Settings Saved", "Weather Alert preferences updated successfully.", "fa-check", "success");
}
