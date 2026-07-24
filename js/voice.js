// js/voice.js - Global Voice Search Service

/**
 * Initializes the Speech Recognition service for voice search.
 * @param {HTMLButtonElement} button - The trigger microphone button.
 * @param {HTMLInputElement} input - The input element where the text will be placed.
 * @param {Function} callback - The search execution callback function.
 */
function initializeVoiceSearch(button, input, callback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        button.style.display = "none";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    let isListening = false;

    button.addEventListener("click", () => {
        if (isListening) {
            recognition.stop();
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            console.error("Speech recognition start failed:", error);
        }
    });

    recognition.onstart = () => {
        isListening = true;
        button.classList.add("listening");
    };

    recognition.onend = () => {
        isListening = false;
        button.classList.remove("listening");
    };

    recognition.onresult = (event) => {
        const city = event.results[0][0].transcript.replace(/\./g, "");
        if (input) input.value = city;
        if (callback) callback(city);
    };

    recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        isListening = false;
        button.classList.remove("listening");
    };
}