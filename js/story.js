// js/story.js - Weather Story & Social Snapshot Generator Engine

/**
 * Populates the 9:16 Social Story Card modal with live city weather metrics.
 */
function populateStoryCard() {
    if (!window.currentWeather) return;

    const weather = window.currentWeather;
    const city = weather.name || "SkyCast Weather";
    const country = weather.sys && weather.sys.country ? weather.sys.country : "";
    const fullCity = country ? `${city}, ${country}` : city;
    const temp = Math.round(weather.main ? weather.main.temp : 0);
    const unitSymbol = window.currentUnit === "imperial" ? "°F" : "°C";
    const speedUnit = window.currentUnit === "imperial" ? "mph" : "km/h";
    const condition = weather.weather && weather.weather[0] ? weather.weather[0].main : "Clear";
    const conditionDesc = weather.weather && weather.weather[0] ? weather.weather[0].description : "Clear Sky";
    const iconCode = weather.weather && weather.weather[0] ? weather.weather[0].icon : "01d";
    
    const humidity = weather.main ? weather.main.humidity : 0;
    const feelsLike = Math.round(weather.main ? weather.main.feels_like : temp);
    const windSpeed = weather.wind ? Math.round(weather.wind.speed * (window.currentUnit === "imperial" ? 1 : 3.6)) : 0;

    // Date String
    const d = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStr = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

    // Update Story Card Elements
    const storyCity = document.getElementById("storyCityName");
    const storyDate = document.getElementById("storyDateBadge");
    const storyTemp = document.getElementById("storyTempVal");
    const storyCond = document.getElementById("storyConditionText");
    const storyIcon = document.getElementById("storyWeatherIcon");
    const storyFeels = document.getElementById("storyFeelsLikeVal");
    const storyHumidity = document.getElementById("storyHumidityVal");
    const storyWind = document.getElementById("storyWindVal");
    const storyAQIPill = document.getElementById("storyAQIPill");
    const storySunBadge = document.getElementById("storySunBadge");
    const storyCard = document.getElementById("storyCard");

    if (storyCity) storyCity.textContent = fullCity;
    if (storyDate) storyDate.textContent = dateStr;
    if (storyTemp) storyTemp.textContent = `${temp}${unitSymbol}`;
    if (storyCond) storyCond.textContent = conditionDesc.charAt(0).toUpperCase() + conditionDesc.slice(1);
    
    if (storyIcon) {
        storyIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        storyIcon.alt = condition;
    }

    if (storyFeels) storyFeels.textContent = `${feelsLike}${unitSymbol}`;
    if (storyHumidity) storyHumidity.textContent = `${humidity}%`;
    if (storyWind) storyWind.textContent = `${windSpeed} ${speedUnit}`;

    // AQI Badge
    if (storyAQIPill) {
        const pm25 = window.currentPM25 || 15;
        let aqiLabel = "Good";
        let aqiBg = "rgba(76, 175, 80, 0.85)";

        if (pm25 > 150) { aqiLabel = "Hazardous"; aqiBg = "rgba(156, 39, 176, 0.9)"; }
        else if (pm25 > 55) { aqiLabel = "Unhealthy"; aqiBg = "rgba(244, 67, 54, 0.9)"; }
        else if (pm25 > 35) { aqiLabel = "Moderate"; aqiBg = "rgba(255, 152, 0, 0.9)"; }

        storyAQIPill.textContent = `AQI • ${aqiLabel}`;
        storyAQIPill.style.background = aqiBg;
    }

    // Sunset / Sunrise Badge
    if (storySunBadge && weather.sys) {
        const sunsetDate = new Date(weather.sys.sunset * 1000);
        const hours = String(sunsetDate.getHours()).padStart(2, '0');
        const mins = String(sunsetDate.getMinutes()).padStart(2, '0');
        storySunBadge.textContent = `🌇 Sunset: ${hours}:${mins}`;
    }

    // Dynamic Theme Backdrop for Story Card
    if (storyCard) {
        const condLower = condition.toLowerCase();
        const isNight = iconCode.includes("n");

        if (isNight) {
            storyCard.style.background = "linear-gradient(165deg, #0b1329 0%, #1e293b 50%, #0f172a 100%)";
        } else if (condLower.includes("rain") || condLower.includes("drizzle")) {
            storyCard.style.background = "linear-gradient(165deg, #1e3a8a 0%, #3b82f6 50%, #1d4ed8 100%)";
        } else if (condLower.includes("thunderstorm")) {
            storyCard.style.background = "linear-gradient(165deg, #2e1065 0%, #581c87 50%, #0f172a 100%)";
        } else if (condLower.includes("snow")) {
            storyCard.style.background = "linear-gradient(165deg, #0284c7 0%, #38bdf8 50%, #e0f2fe 100%)";
        } else {
            // Sunrise Gold & Sunlit Day
            storyCard.style.background = "linear-gradient(165deg, #f59e0b 0%, #fb7185 45%, #818cf8 100%)";
        }
    }
}

/**
 * Renders the story card element to a high-resolution PNG image and triggers download.
 */
async function downloadStoryCardPNG() {
    const storyCard = document.getElementById("storyCard");
    const downloadBtn = document.getElementById("downloadStoryBtn");

    if (!storyCard) return;

    try {
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rendering...`;
        }

        // Use html2canvas to render the 9:16 story card
        const canvas = await html2canvas(storyCard, {
            scale: 2.5, // Crisp retina density output
            useCORS: true,
            allowTaint: true,
            backgroundColor: null
        });

        const city = window.currentWeather ? window.currentWeather.name : "City";
        const link = document.createElement("a");
        link.download = `SkyCast-Story-${city.replace(/\s+/g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        if (typeof showToastNotification === "function") {
            showToastNotification("Story Card Exported!", "Saved high-res PNG snapshot to your downloads.", "fa-image", "success");
        }
    } catch (err) {
        console.error("Story Export Error:", err);
        if (typeof showToastNotification === "function") {
            showToastNotification("Export Error", "Failed to render social story snapshot.", "fa-triangle-exclamation", "danger");
        }
    } finally {
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `<i class="fa-solid fa-download"></i> Download PNG`;
        }
    }
}
