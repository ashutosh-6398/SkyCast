# 🌤️ SkyCast — Premium Weather Intelligence System

SkyCast is a high-performance, responsive weather forecasting web application and PWA featuring real-time atmospheric tracking, interactive metrics comparison, ambient environmental soundscapes, smart push notifications, and customizable social share snapshots.

Built using a secure Node.js Express API proxy backend and integrated with **Supabase Cloud (PostgreSQL)** for high-reliability data persistence.

---

## ✨ Features

* **⚡ Real-Time Weather & AQI**: High-fidelity dashboard displaying current weather data, 5-day/3-hour forecasts, and detailed Air Quality Index statistics.
* **📱 Universal Responsive Design & PWA**: Seamlessly responsive layout that auto-adapts to mobile, tablets, laptops, and 4K screens. Easily installable as a Progressive Web App (PWA) with full offline support.
* **☁️ Supabase Cloud Backend**: All search history, favorites list, and alert settings are stored persistently in a cloud-hosted Supabase PostgreSQL database.
* **📸 Weather Story & Social Snapshot**: Render custom, beautiful 9:16 Instagram-ready weather story graphics of your city with ambient background art, AQI pills, and temperature gauges. Download as high-res PNG in one click.
* **🔔 Web Push Alerts & Notification Manager**: Receive real-time browser alerts and toasts for sudden weather events (Incoming Rain, Extreme UV Spikes, High Winds, or Severe Thunderstorms) with custom category toggle settings.
* **🎧 Ambient Soundscapes**: Weather-responsive voice-over audio and dynamic background audio loops matching active weather states.
* **🛡️ Secure Proxy Caching**: Keeps API keys safe on the server and caches requests for 10 minutes to minimize external API costs.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+), `html2canvas`
* **Backend:** Node.js, Express.js
* **Database:** Supabase (Cloud PostgreSQL)
* **APIs:** OpenWeatherMap API (Weather, Forecast, Air Pollution, Geocoding)
* **PWA:** Service Workers, Web Manifest

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) installed.

### 2. Setup Database (Supabase)
1. Register/Login at **[supabase.com](https://supabase.com)** and create a new project.
2. Go to the **SQL Editor** in your Supabase dashboard and run this script to create the tables:
   ```sql
   -- Favorites table
   CREATE TABLE favorites (
     id SERIAL PRIMARY KEY,
     city TEXT NOT NULL UNIQUE,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   -- Search history table
   CREATE TABLE history (
     id SERIAL PRIMARY KEY,
     city TEXT NOT NULL,
     searched_at TIMESTAMPTZ DEFAULT now()
   );

   -- Alert settings table
   CREATE TABLE alert_settings (
     id INTEGER PRIMARY KEY DEFAULT 1,
     rain BOOLEAN DEFAULT true,
     storm BOOLEAN DEFAULT true,
     uv BOOLEAN DEFAULT true,
     aqi BOOLEAN DEFAULT true,
     wind BOOLEAN DEFAULT true,
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- Insert default settings row
   INSERT INTO alert_settings (id) VALUES (1);

   -- Enable Row Level Security (RLS) and allow public read/write access
   ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
   ALTER TABLE history ENABLE ROW LEVEL SECURITY;
   ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow all on favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all on history" ON history FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all on alert_settings" ON alert_settings FOR ALL USING (true) WITH CHECK (true);
   ```

### 3. Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/ashutosh-6398/SkyCast.git
   cd SkyCast
   ```
2. Install project dependencies:
   ```bash
   npm install
   ```

### 4. Configure Environment Variables
Create a file named `.env` in the root folder and add your credentials:
```env
PORT=8080
OPENWEATHER_API_KEY=your_openweather_api_key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_public_key
```

### 5. Running the Application
Start the backend server:
```bash
npm start
```
The application will be live at **`http://localhost:8080`**.

---

## 📂 Project Structure

```
├── assets/                  # Icons and images
├── css/
│   ├── style.css            # Layout and theme configurations
│   ├── card.css             # Highlight cards and modals
│   ├── responsive.css       # Mobile & tablet design overrides
│   └── animation.css        # Interactive UI animations
├── js/
│   ├── app.js               # Main weather orchestration
│   ├── helpers.js           # Shared utility tools
│   ├── notifications.js     # Real-time alerts and PWA settings
│   ├── story.js             # 9:16 Social Canvas Generator
│   ├── theme.js             # Theme control logic (Day/Night)
│   └── voice.js             # Audio soundscapes controller
├── db.js                    # Supabase integration layer
├── server.js                # Express Server and proxy controller
├── sw.js                    # PWA Service worker
├── manifest.json            # PWA web manifest
└── README.md
```

---

## 👨‍💻 Created By

* **Ashutosh Pal**
  * GitHub: [@ashutosh-6398](https://github.com/ashutosh-6398)
  * LinkedIn: [Ashutosh Pal](https://www.linkedin.com/feed/)
  * Email: palashutosh6398@gmail.com
