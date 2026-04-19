// src/services/WeatherService.js
// Real weather data from OpenWeatherMap (free tier)
// Get your key at: https://openweathermap.org/api

import axios from 'axios';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

// ⚠️  Replace with your own free key from openweathermap.org
const OWM_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
const BASE_URL    = 'https://api.openweathermap.org/data/2.5';

const WEATHER_ICONS = {
  '01d':'☀️','01n':'🌙','02d':'⛅','02n':'⛅',
  '03d':'☁️','03n':'☁️','04d':'☁️','04n':'☁️',
  '09d':'🌧','09n':'🌧','10d':'🌦','10n':'🌦',
  '11d':'⛈','11n':'⛈','13d':'❄️','13n':'❄️','50d':'🌫','50n':'🌫',
};

class WeatherService {
  constructor() {
    this.cachedLocation = null;
  }

  async _getLocation() {
    if (this.cachedLocation) return this.cachedLocation;

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Now Brief needs location', message: 'For live local weather', buttonPositive: 'Allow' },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        // Fall back to Kolkata
        return { latitude: 22.5726, longitude: 88.3639 };
      }
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        pos => {
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          this.cachedLocation = loc;
          resolve(loc);
        },
        () => resolve({ latitude: 22.5726, longitude: 88.3639 }), // Kolkata fallback
        { enableHighAccuracy: false, timeout: 10000 },
      );
    });
  }

  async getCurrentWeather() {
    const loc = await this._getLocation();
    const res  = await axios.get(`${BASE_URL}/weather`, {
      params: {
        lat:   loc.latitude,
        lon:   loc.longitude,
        appid: OWM_API_KEY,
        units: 'metric',
      },
      timeout: 8000,
    });

    const d = res.data;
    return {
      city:        d.name,
      country:     d.sys.country,
      temp:        d.main.temp,
      feelsLike:   d.main.feels_like,
      humidity:    d.main.humidity,
      description: d.weather[0].description,
      icon:        WEATHER_ICONS[d.weather[0].icon] || '🌤',
      wind:        Math.round(d.wind.speed * 3.6), // m/s → km/h
      visibility:  d.visibility ? Math.round(d.visibility / 1000) : null,
      uv:          null, // requires One Call API
      code:        d.weather[0].id,
      lat:         loc.latitude,
      lon:         loc.longitude,
      updatedAt:   new Date().toISOString(),
    };
  }

  async getForecast() {
    const loc = await this._getLocation();
    const res  = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat:   loc.latitude,
        lon:   loc.longitude,
        appid: OWM_API_KEY,
        units: 'metric',
        cnt:   8, // next 24h in 3h steps
      },
      timeout: 8000,
    });

    return res.data.list.map(item => ({
      time:        item.dt_txt,
      temp:        Math.round(item.main.temp),
      description: item.weather[0].description,
      icon:        WEATHER_ICONS[item.weather[0].icon] || '🌤',
      humidity:    item.main.humidity,
      wind:        Math.round(item.wind.speed * 3.6),
    }));
  }

  getWeatherSummary(weather) {
    if (!weather) return 'Weather data unavailable.';
    const { city, temp, feelsLike, description, humidity, wind } = weather;
    return (
      `Currently ${Math.round(temp)}°C in ${city} with ${description}. ` +
      `Feels like ${Math.round(feelsLike)}°C. Humidity at ${humidity}% and wind at ${wind} km/h.`
    );
  }
}

export const WeatherService = new WeatherService();
