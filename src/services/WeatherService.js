// src/services/WeatherService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const WMO={0:{desc:'Clear sky',emoji:'\u2600\ufe0f',bg:'#E65100'},1:{desc:'Mainly clear',emoji:'\U0001f324',bg:'#F59E0B'},2:{desc:'Partly cloudy',emoji:'\u26c5',bg:'#64748B'},3:{desc:'Overcast',emoji:'\u2601\ufe0f',bg:'#475569'},45:{desc:'Foggy',emoji:'\U0001f32b',bg:'#6B7280'},51:{desc:'Light drizzle',emoji:'\U0001f326',bg:'#3B82F6'},61:{desc:'Light rain',emoji:'\U0001f327',bg:'#2563EB'},63:{desc:'Moderate rain',emoji:'\U0001f327',bg:'#1D4ED8'},65:{desc:'Heavy rain',emoji:'\u26c8',bg:'#1E3A5F'},71:{desc:'Light snow',emoji:'\U0001f328',bg:'#93C5FD'},80:{desc:'Rain showers',emoji:'\U0001f326',bg:'#3B82F6'},95:{desc:'Thunderstorm',emoji:'\u26c8',bg:'#111827'},99:{desc:'Storm+hail',emoji:'\u26c8',bg:'#0F172A'}};
let CFG={lat:22.2967,lon:87.0788,city:'Salboni',country:'India'};
export class WeatherService{
  static setLocation(lat,lon,city='',country=''){CFG={lat,lon,city,country};}
  static getLocation(){return CFG;}
  static async loadSavedLocation(){try{const s=await AsyncStorage.getItem('nb_location');if(s){const l=JSON.parse(s);if(l.lat&&l.lon)CFG=l;}}catch(_){}}
  static async saveLocation(loc){try{await AsyncStorage.setItem('nb_location',JSON.stringify(loc));}catch(_){}}
  static async fetch(){
    await this.loadSavedLocation();
    const {lat,lon}=CFG;
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code,is_day,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,uv_index_max&timezone=auto&forecast_days=7`;
    const {data}=await axios.get(url,{timeout:10000});
    return this.parse(data);
  }
  static parse(data){
    const c=data.current,wmo=WMO[c.weather_code]||{desc:'Unknown',emoji:'\U0001f321',bg:'#374151'};
    const nowH=new Date().getHours(),todayStr=new Date().toISOString().split('T')[0];
    const hourly=data.hourly.time.map((t,i)=>({time:t,hour:parseInt(t.split('T')[1]),temp:Math.round(data.hourly.temperature_2m[i]),rainProb:data.hourly.precipitation_probability[i],wmoCode:data.hourly.weather_code[i],emoji:(WMO[data.hourly.weather_code[i]]||wmo).emoji})).filter(h=>h.time.startsWith(todayStr)&&h.hour>=nowH).slice(0,12);
    const forecast=data.daily.time.map((day,i)=>({date:day,dayName:new Date(day+'T12:00:00').toLocaleDateString('en',{weekday:'short'}),wmoCode:data.daily.weather_code[i],emoji:(WMO[data.daily.weather_code[i]]||wmo).emoji,desc:(WMO[data.daily.weather_code[i]]||wmo).desc,maxTemp:Math.round(data.daily.temperature_2m_max[i]),minTemp:Math.round(data.daily.temperature_2m_min[i]),sunrise:data.daily.sunrise[i]?.split('T')[1]||'--',sunset:data.daily.sunset[i]?.split('T')[1]||'--',rain:data.daily.precipitation_sum[i],uvIndex:data.daily.uv_index_max?.[i]??0}));
    return{temp:Math.round(c.temperature_2m),feelsLike:Math.round(c.apparent_temperature),humidity:c.relative_humidity_2m,windSpeed:Math.round(c.wind_speed_10m),windDir:c.wind_direction_10m,precipitation:c.precipitation,pressure:Math.round(c.surface_pressure),weatherCode:c.weather_code,description:wmo.desc,emoji:wmo.emoji,bgColor:wmo.bg,isDay:c.is_day===1,rainWarning:hourly.slice(0,3).some(h=>h.rainProb>60),hourly,forecast,city:CFG.city,country:CFG.country,lat:CFG.lat,lon:CFG.lon,updatedAt:new Date().toISOString(),icon:wmo.emoji,wind:Math.round(c.wind_speed_10m),rainChance:hourly[0]?.rainProb??0};
  }
}
