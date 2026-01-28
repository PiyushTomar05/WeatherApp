import React, { useEffect, useRef, useState } from "react";
import "./Weather.css";
import searchIcon from "../assets/search.png";
import clearIcon from "../assets/clear.png";
import cloudIcon from "../assets/cloud.png";
import drizzleIcon from "../assets/drizzle.png";
import rainIcon from "../assets/rain.png";
import snowIcon from "../assets/snow.png";
import windIcon from "../assets/wind.png";
import humidityIcon from "../assets/humidity.png";

const Weather = () => {
  const [city, setCity] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [aqiData, setAqiData] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("metric");

  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
    search("New York");
  }, []);

  const allIcons = {
    "01d": clearIcon, "01n": clearIcon,
    "02d": cloudIcon, "02n": cloudIcon,
    "03d": cloudIcon, "03n": cloudIcon,
    "04d": drizzleIcon, "04n": drizzleIcon,
    "09d": rainIcon, "09n": rainIcon,
    "10d": rainIcon, "10n": rainIcon,
    "13d": snowIcon, "13n": snowIcon,
    "50d": cloudIcon, "50n": cloudIcon,
  };

  const aqiLabels = {
    1: { label: "Good", color: "#4caf50" },
    2: { label: "Fair", color: "#8bc34a" },
    3: { label: "Moderate", color: "#ffc107" },
    4: { label: "Poor", color: "#ff9800" },
    5: { label: "Very Poor", color: "#f44336" },
  };

  const getBackgroundClass = (iconCode) => {
    if (!iconCode) return "default-bg";
    if (iconCode.startsWith("01")) return "clear-bg";
    if (iconCode.startsWith("02") || iconCode.startsWith("03")) return "cloud-bg";
    if (iconCode.startsWith("04")) return "drizzle-bg";
    if (iconCode.startsWith("09") || iconCode.startsWith("10")) return "rain-bg";
    if (iconCode.startsWith("13")) return "snow-bg";
    if (iconCode.startsWith("50")) return "mist-bg";
    return "default-bg";
  };

  const addToHistory = (name) => {
    let newHistory = [name, ...recentSearches.filter(item => item !== name)].slice(0, 3);
    setRecentSearches(newHistory);
    localStorage.setItem("recentSearches", JSON.stringify(newHistory));
  };

  const formatTime = (timestamp, timezoneOffset) => {
    const date = new Date((timestamp + timezoneOffset + new Date().getTimezoneOffset() * 60) * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchData = async (queryType, queryValue) => {
    setLoading(true);
    setError(null);
    // Don't clear weatherData to prevent layout jump if possible, or clear if you prefer
    // setWeatherData(null); // Optional: keep old data visible while loading new? 
    // Let's clear to show loader properly
    setWeatherData(null);
    setForecastData([]);
    setAqiData(null);

    try {
      let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?units=${unit}&appid=${import.meta.env.VITE_APP_ID}`;
      if (queryType === "city") weatherUrl += `&q=${queryValue}`;
      else if (queryType === "coords") weatherUrl += `&lat=${queryValue.lat}&lon=${queryValue.lon}`;

      const res = await fetch(weatherUrl);
      const data = await res.json();

      if (data.cod !== 200) {
        throw new Error(data.message || "City not found.");
      }

      const icon = allIcons[data.weather[0].icon] || clearIcon;
      const bgClass = getBackgroundClass(data.weather[0].icon);
      const timezoneDate = new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (data.timezone * 1000);
      const localTimeStr = new Date(timezoneDate).toLocaleTimeString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

      setWeatherData({
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        temperature: Math.floor(data.main.temp),
        tempMin: Math.floor(data.main.temp_min),
        tempMax: Math.floor(data.main.temp_max),
        feelsLike: Math.floor(data.main.feels_like),
        pressure: data.main.pressure,
        visibility: (data.visibility / 1000).toFixed(1),
        location: data.name,
        country: data.sys.country,
        description: data.weather[0].description,
        sunrise: formatTime(data.sys.sunrise, data.timezone),
        sunset: formatTime(data.sys.sunset, data.timezone),
        localTime: localTimeStr,
        lat: data.coord.lat,
        lon: data.coord.lon,
        icon: icon,
        bgClass: bgClass,
      });

      if (queryType === "city") addToHistory(data.name);

      const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${import.meta.env.VITE_APP_ID}`;
      const aqiRes = await fetch(aqiUrl);
      const aqiJson = await aqiRes.json();
      if (aqiJson.list && aqiJson.list.length > 0) {
        setAqiData(aqiJson.list[0].main.aqi);
      }

      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${data.coord.lat}&lon=${data.coord.lon}&units=${unit}&appid=${import.meta.env.VITE_APP_ID}`;
      const forecastRes = await fetch(forecastUrl);
      const forecastJson = await forecastRes.json();
      const dailyData = forecastJson.list.filter(reading => reading.dt_txt.includes("12:00:00"));
      setForecastData(dailyData);

    } catch (err) {
      console.error(err);
      setError(err.message === "Failed to fetch" ? "Network error" : err.message);
    } finally {
      setLoading(false);
    }
  };

  const search = (cityName) => {
    if (!cityName) return;
    setCity(cityName);
    fetchData("city", cityName);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition((position) => {
        fetchData("coords", { lat: position.coords.latitude, lon: position.coords.longitude });
      }, () => {
        setError("Location permission denied.");
        setLoading(false);
      });
    } else {
      setError("Geolocation not supported by this browser.");
    }
  };

  useEffect(() => {
    if (weatherData) {
      const query = weatherData.location;
      fetchData("city", query);
    }
  }, [unit]);

  const toggleUnit = () => {
    setUnit(prev => prev === "metric" ? "imperial" : "metric");
  };

  return (
    <div className={`weather-container ${weatherData ? weatherData.bgClass : "default-bg"}`}>
      <div className="weather-card">

        {/* Top Bar: Search & Toggle */}
        <div className="top-bar">
          <div className="search-bar">
            <button className="geo-btn" onClick={getLocation} title="Current Location">
              <span className="material-symbol">📍</span>
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search(city)}
            />
            <div className="search-icon-wrapper" onClick={() => search(city)}>
              <img src={searchIcon} alt="Search" />
            </div>
          </div>

          <button className="unit-toggle" onClick={toggleUnit}>
            {unit === "metric" ? "°C" : "°F"}
          </button>
        </div>

        {/* Recent History Chips */}
        {recentSearches.length > 0 && (
          <div className="recent-history">
            {recentSearches.map((item, index) => (
              <span key={index} onClick={() => { setCity(item); search(item); }}>{item}</span>
            ))}
          </div>
        )}

        {loading && <div className="loader">Refreshing...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && weatherData && (
          <div className="weather-content">

            {/* LEFT SIDE: Main Info */}
            <div className="main-info">
              {aqiData && (
                <div className="aqi-badge" style={{ backgroundColor: aqiLabels[aqiData].color }}>
                  AQI: {aqiLabels[aqiData].label}
                </div>
              )}

              <img src={weatherData.icon} alt="" className="weather-icon" />
              <p className="temperature">{weatherData.temperature}°</p>
              <div className="location-group">
                <p className="location">{weatherData.location}, {weatherData.country}</p>
                <p className="local-time">{weatherData.localTime}</p>
                <p className="description">{weatherData.description}</p>
              </div>

              <div className="min-max">
                <span>H: {weatherData.tempMax}°</span>
                <span>L: {weatherData.tempMin}°</span>
              </div>
            </div>

            {/* RIGHT SIDE: Details & Forecast */}
            <div className="right-panel">
              <div className="weather-data">
                <div className="data-row">
                  <div className="col">
                    <img src={humidityIcon} alt="humidity" />
                    <div>
                      <p>{weatherData.humidity}%</p>
                      <span>Humidity</span>
                    </div>
                  </div>
                  <div className="col">
                    <img src={windIcon} alt="wind" />
                    <div>
                      <p>{weatherData.windSpeed} {unit === 'metric' ? 'm/s' : 'mph'}</p>
                      <span>Wind</span>
                    </div>
                  </div>
                </div>

                <div className="data-row">
                  <div className="col">
                    <span className="material-symbol">🌡️</span>
                    <div>
                      <p>{weatherData.feelsLike}°</p>
                      <span>Feels Like</span>
                    </div>
                  </div>
                  <div className="col">
                    <span className="material-symbol">👁️</span>
                    <div>
                      <p>{weatherData.visibility} km</p>
                      <span>Visibility</span>
                    </div>
                  </div>
                </div>

                <div className="data-row">
                  <div className="col">
                    <span className="material-symbol">🌅</span>
                    <div>
                      <p>{weatherData.sunrise}</p>
                      <span>Sunrise</span>
                    </div>
                  </div>
                  <div className="col">
                    <span className="material-symbol">🌇</span>
                    <div>
                      <p>{weatherData.sunset}</p>
                      <span>Sunset</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forecast section squeezed into right panel */}
              <div className="forecast-section">
                <h3>5-Day Forecast</h3>
                <div className="forecast-list">
                  {forecastData.map((item, index) => {
                    const date = new Date(item.dt * 1000);
                    const dayName = date.toLocaleDateString("en-US", { weekday: 'short' });
                    const code = item.weather[0].icon;
                    const temp = Math.floor(item.main.temp);
                    return (
                      <div key={index} className="forecast-item">
                        <p>{dayName}</p>
                        <img src={allIcons[code] || clearIcon} alt="" />
                        <p>{temp}°</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div> {/* End Right Panel */}

          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;
