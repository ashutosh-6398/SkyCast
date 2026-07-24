// js/theme.js - Global Theme Manager

const THEME_KEY = "skycast_theme";

/**
 * Initializes the theme based on local storage or defaults to light mode.
 */
function initializeTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(saved);
}

/**
 * Applies the specified theme class directly to the document body.
 */
function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
}

/**
 * Toggles the current theme and commits the state to localStorage.
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    const currentTheme = isDark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, currentTheme);
}