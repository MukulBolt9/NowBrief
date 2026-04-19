// src/services/WeatherService.js
// Uses Open-Meteo (https://open-meteo.com) — 100% free, no API key, no signup.
// Reverse geocoding via Open-Meteo Geocoding API.

import axios from 'axios';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_URL      = 'https://geocoding-api.open-meteo.com/v1/reverse';

const WMO = {
  0:  { label: 'Clear sky',            icon: '☀️' },
  1:  { label: 'Mainly clear',         icon: '🌤' },
  2:  { label: 'Partly cloudy',        icon: '⛅' },
  3:  { label: 'Overcast',             icon: '☁️' },
  45: { label: 'Foggy',                icon: '🌫' },
  48: { label: 'Icy fog',              icon: '🌫' },
  51: { label: 'Light drizzle',        icon: '🌦' },
  53: { label: 'Drizzle',              icon: '🌦' },
  55: { label: 'Heavy drizzle',        icon: '🌧' },
  61: { label: 'Slight rain',          icon: '🌧' },
  63: { label: 'Rain',                 icon: '🌧' },
  65: { label: 'Heavy rain',           icon: '🌧' },
  71: { label: 'Slight snow',          icon: '❄️' },
  73: { label: 'Snow',                 icon: '❄️' },
  75: { label: 'Heavy snow',           icon: '❄️' },
  80: { label: 'Showers',              icon: '🌦' },
  81: { label: 'Heavy showers',        icon: '🌧' },
  95: { label: 'Thunderstorm',         icon: '⛈' },
  99: { label: 'Thunderstorm + hail',  icon: '⛈' },
};

function wmo(code) { return WMO[code] || { label: 'Unknown', icon: '🌤' }; }

class WeatherServiceClass {
  constructor() {
    this.cachedLocation = null;
    this.cachedCity     = null;
  }

  async _requestPermission() {
    if (Platform.OS !== 'android') return true;
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      { title: 'NowBrief', message: 'Needs location for local weather', buttonPositive: 'Allow' },
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }

  async _getLocation() {
    if (this.cachedLocation) return this.cachedLocation;
    await this._requestPermission();
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        pos => {
          this.cachedLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          resolve(this.cachedLocation);
        },
        () => resolve({ lat: 22.5726, lon: 88.3639 }),
        { enableHighAccuracy: false, timeout: 10000 },
      );
    });
  }

  async _reverseGeocode(lat, lon) {
    if (this.cachedCity) return this.cachedCity;
    try {
      const r = await axios.get(GEO_URL, { params: { latitude: lat, longitude: lon, count: 1 }, timeout: 5000 });
      const res = r.data?.results?.[0];
      this.cachedCity = res?.name || res?.admin1 || 'Your City';
      return this.cachedCity;
    } catch (_) { return 'Your City'; }
  }

  async getCurrentWeather() {
    const { lat, lon } = await this._getLocation();
    const city = await this._reverseGeocode(lat, lon);
    const res = await axios.get(FORECAST_URL, {
      params: {
        latitude: lat, longitude: lon,
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,visibility,uv_index',
        wind_speed_unit: 'kmh', timezone: 'auto',
      },
      timeout: 10000,
    });
    const c = res.data.current;
    const w = wmo(c.weather_code);
    return {
      city, temp: c.temperature_2m, feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m),
      visibility: c.visibility ? Math.round(c.visibility / 1000) : null,
      uv: c.uv_index ?? null, description: w.label, icon: w.icon,
      code: c.weather_code, lat, lon, updatedAt: new Date().toISOString(),
    };
  }

  async getForecast() {
    const { lat, lon } = await this._getLocation();
    const res = await axios.get(FORECAST_URL, {
      params: {
        latitude: lat, longitude: lon,
        hourly: 'temperature_2m,weather_code,precipitation_probability',
        forecast_days: 1, wind_speed_unit: 'kmh', timezone: 'auto',
      },
      timeout: 10000,
    });
    const { time, temperature_2m, weather_code, precipitation_probability } = res.data.hourly;
    return time.slice(0, 8).map((t, i) => ({
      time: t, temp: Math.round(temperature_2m[i]),
      icon: wmo(weather_code[i]).icon, label: wmo(weather_code[i]).label,
      precipPct: precipitation_probability[i],
    }));
  }

  getWeatherSummary(w) {
    if (!w) return 'Weather unavailable.';
    return `Currently ${Math.round(w.temp)}°C in ${w.city} — ${w.description}. Feels like ${Math.round(w.feelsLike)}°C. Humidity ${w.humidity}%, wind ${w.wind} km/h.`;
  }
}

export const WeatherService = new WeatherServiceClass();
