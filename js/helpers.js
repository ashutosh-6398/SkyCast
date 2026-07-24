// js/helpers.js - Global Helper Utilities & AQI Calculations

/**
 * Calculates US EPA AQI index score (0-500) from PM2.5 concentration (ug/m3).
 */
function calculateUSAQI(pm25) {
    if (pm25 === undefined || pm25 === null || isNaN(pm25)) return 42;
    const val = parseFloat(pm25);
    if (val <= 12.0) return Math.round((50 / 12.0) * val);
    if (val <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (val - 12.1) + 51);
    if (val <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (val - 35.5) + 101);
    if (val <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (val - 55.5) + 151);
    if (val <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (val - 150.5) + 201);
    return Math.round(((500 - 301) / (500.0 - 250.5)) * (val - 250.5) + 301);
}

/**
 * Returns text label, color pill class, and spectrum percentage for US AQI score.
 */
function getAQIStatusDetails(usAqi) {
    const score = parseInt(usAqi) || 0;
    if (score <= 50) return { label: "Good", class: "aqi-good-pill", pct: (score / 50) * 16.6 };
    if (score <= 100) return { label: "Moderate", class: "aqi-fair-pill", pct: 16.6 + ((score - 50) / 50) * 16.6 };
    if (score <= 150) return { label: "Poor", class: "aqi-poor-pill", pct: 33.2 + ((score - 100) / 50) * 16.6 };
    if (score <= 200) return { label: "Unhealthy", class: "aqi-poor-pill", pct: 49.8 + ((score - 150) / 50) * 16.6 };
    if (score <= 300) return { label: "Severe", class: "aqi-hazardous-pill", pct: 66.4 + ((score - 200) / 100) * 16.6 };
    return { label: "Hazardous", class: "aqi-hazardous-pill", pct: 83 + Math.min(17, ((score - 300) / 200) * 17) };
}

/**
 * Converts wind degrees (0 - 360) into cardinal direction label (e.g. NW, SSE).
 */
function getWindDirectionLabel(deg) {
    if (deg === undefined || deg === null || isNaN(deg)) return "N/A";
    const val = Math.round(deg / 22.5);
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const cardinal = directions[(val % 16)];
    return `${cardinal} (${Math.round(deg)}°)`;
}

/**
 * Converts a 2-letter ISO country code into a regional indicator emoji flag.
 */
function getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "🌐";
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

/**
 * Capitalizes the first letter of every word in a string.
 */
function capitalize(text) {
    if (!text) return "";
    return text
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * Generates the OpenWeatherMap icon URL structure.
 */
function getIcon(icon) {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

/**
 * Formats a UNIX timestamp into a clean 2-digit HH:MM format.
 */
function formatTime(unix, timezoneOffset = 0) {
    if (!unix) return "--:--";
    const localDate = new Date((unix + timezoneOffset) * 1000);
    return localDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC"
    });
}

/**
 * Formats a date string into a full Weekday name.
 */
function formatDay(date) {
    if (!date) return "";
    const safeDate = typeof date === "string" ? date.replace(/ /g, "T") : date;
    return new Date(safeDate).toLocaleDateString("en-US", {
        weekday: "long"
    });
}

/**
 * Converts AQI level index (1-5) into a human readable description and status tag.
 */
function getAQILabel(aqiIndex) {
    switch (parseInt(aqiIndex)) {
        case 1: return { text: "1 (Good)", class: "aqi-good", advice: "Air quality is ideal for outdoor activities." };
        case 2: return { text: "2 (Fair)", class: "aqi-fair", advice: "Air quality is acceptable." };
        case 3: return { text: "3 (Moderate)", class: "aqi-moderate", advice: "Sensitive individuals should limit prolonged outdoor exertion." };
        case 4: return { text: "4 (Poor)", class: "aqi-poor", advice: "Air pollution level is high. Wearing a mask is advised." };
        case 5: return { text: "5 (Very Poor)", class: "aqi-hazardous", advice: "Hazardous air condition. Avoid outdoor activities." };
        default: return { text: `${aqiIndex} (Moderate)`, class: "aqi-moderate", advice: "Stay informed on air conditions." };
    }
}

/**
 * Converts UV Index into risk level and advice.
 */
function getUVLabel(uvIndex) {
    const val = parseFloat(uvIndex);
    if (isNaN(val)) return { text: "N/A", level: "Low" };
    if (val <= 2) return { text: `${val} (Low)`, level: "Low", advice: "Minimal sun exposure hazard." };
    if (val <= 5) return { text: `${val} (Moderate)`, level: "Moderate", advice: "Wear sunscreen if outdoors for extended periods." };
    if (val <= 7) return { text: `${val} (High)`, level: "High", advice: "Wear sunglasses and SPF 30+ sunscreen." };
    if (val <= 10) return { text: `${val} (Very High)`, level: "Very High", advice: "Seek shade during peak afternoon hours." };
    return { text: `${val} (Extreme)`, level: "Extreme", advice: "Avoid unshaded sun exposure." };
}

/**
 * Generates smart weather alert banner advice based on weather state.
 */
function generateSmartAdvice(weatherMain, temp, humidity, windSpeed, aqiObj) {
    const mainLower = weatherMain.toLowerCase();

    if (mainLower.includes("thunderstorm") || mainLower.includes("squall") || mainLower.includes("tornado")) {
        return {
            title: "Severe Weather Warning",
            text: "Thunderstorm active in your area. Stay indoors away from windows.",
            icon: "fa-triangle-exclamation",
            type: "warning"
        };
    }
    if (mainLower.includes("rain") || mainLower.includes("drizzle")) {
        return {
            title: "Precipitation Notice",
            text: "Wet conditions expected. Don't forget your umbrella and raincoat!",
            icon: "fa-umbrella",
            type: "info"
        };
    }
    if (mainLower.includes("snow")) {
        return {
            title: "Freezing Weather",
            text: "Snowfall detected. Drive cautiously and wear warm insulated layers.",
            icon: "fa-snowflake",
            type: "info"
        };
    }
    if (temp > 35) {
        return {
            title: "Heat Advisory",
            text: "High temperature alert! Stay hydrated and avoid direct sun.",
            icon: "fa-temperature-full",
            type: "warning"
        };
    }
    if (aqiObj && aqiObj.text.includes("Poor")) {
        return {
            title: "Air Quality Alert",
            text: aqiObj.advice,
            icon: "fa-mask-face",
            type: "warning"
        };
    }

    return {
        title: "Weather Outlook",
        text: `Optimal outdoor conditions. Humidity at ${humidity}% with ${windSpeed} km/h wind.`,
        icon: "fa-circle-check",
        type: "success"
    };
}