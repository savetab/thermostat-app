import axios from 'axios';

// Charger config depuis URL si présente, sinon depuis localStorage
const loadConfigFromURL = () => {
  const params = new URLSearchParams(window.location.search);
  const config = {};
  
  if (params.has('ip')) config.thermostatIP = params.get('ip');
  if (params.has('key')) config.sinricAppKey = params.get('key');
  if (params.has('device')) config.sinricDeviceId = params.get('device');
  
  // Sauvegarder en localStorage si config trouvée dans URL
  if (Object.keys(config).length > 0) {
    Object.entries(config).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

// Charger au démarrage
loadConfigFromURL();

const getConfig = () => ({
  thermostatIP: localStorage.getItem('thermostatIP') || '',
  sinricAppKey: localStorage.getItem('sinricAppKey') || '',
  sinricAppSecret: localStorage.getItem('sinricAppSecret') || '',
  sinricDeviceId: localStorage.getItem('sinricDeviceId') || '',
});

export const saveConfig = (config) => {
  localStorage.setItem('thermostatIP', config.thermostatIP);
  localStorage.setItem('sinricAppKey', config.sinricAppKey);
  localStorage.setItem('sinricAppSecret', config.sinricAppSecret);
  localStorage.setItem('sinricDeviceId', config.sinricDeviceId);
};

// Générer URL de partage
export const getShareURL = () => {
  const config = getConfig();
  if (!config.sinricAppKey || !config.sinricDeviceId) return null;
  
  const baseURL = window.location.origin;
  const params = new URLSearchParams({
    ip: config.thermostatIP,
    key: config.sinricAppKey,
    device: config.sinricDeviceId
  });
  
  return `${baseURL}?${params.toString()}`;
};

// ========== MÉTÉO VIA GÉOLOCALISATION GPS ==========
let cachedWeather = null;
let lastWeatherFetch = 0;
const WEATHER_CACHE_DURATION = 600000; // 10 minutes

const getWeatherFromGPS = async () => {
  const now = Date.now();
  if (cachedWeather && (now - lastWeatherFetch) < WEATHER_CACHE_DURATION) {
    return cachedWeather;
  }

  try {
    // Étape 1 : Demander la position GPS du navigateur
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { 
          enableHighAccuracy: false, // false = plus rapide, suffisant pour météo
          timeout: 10000,
          maximumAge: 600000 // Cache 10 min
        }
      );
    });

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    
    console.log('📍 Position GPS:', lat.toFixed(4), lon.toFixed(4));

    // Étape 2 : Récupérer la météo
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { timeout: 5000 }
    );

    const temp = weatherResponse.data.current_weather?.temperature;
    if (temp !== undefined) {
      cachedWeather = parseFloat(temp);
      lastWeatherFetch = now;
      console.log('🌤️ Température extérieure:', cachedWeather, '°C');
      return cachedWeather;
    }
  } catch (err) {
    console.warn('❌ Erreur géolocalisation GPS, fallback IP:', err.message);
    
    // Fallback : géolocalisation IP si GPS échoue
    try {
      const geoResponse = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
      if (!geoResponse.data.latitude) return null;

      const { latitude: lat, longitude: lon } = geoResponse.data;
      console.log('📍 Position IP (fallback):', geoResponse.data.city);

      const weatherResponse = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        { timeout: 5000 }
      );

      const temp = weatherResponse.data.current_weather?.temperature;
      if (temp !== undefined) {
        cachedWeather = parseFloat(temp);
        lastWeatherFetch = now;
        console.log('🌤️ Température extérieure (IP):', cachedWeather, '°C');
        return cachedWeather;
      }
    } catch (fallbackErr) {
      console.warn('❌ Fallback IP échoué:', fallbackErr.message);
    }
  }

  return null;
};

let isLocalAvailable = false;
let lastLocalCheck = 0;
const LOCAL_CHECK_INTERVAL = 10000;

const testLocalConnection = async (ip) => {
  if (!ip) return false;
  const now = Date.now();
  if (now - lastLocalCheck < LOCAL_CHECK_INTERVAL && lastLocalCheck > 0) return isLocalAvailable;
  
  try {
    const response = await axios.get(`http://${ip}/api/status`, { timeout: 800 });
    isLocalAvailable = response.status === 200;
    lastLocalCheck = now;
    console.log('✅ Connexion locale ESP32 OK');
    return true;
  } catch {
    isLocalAvailable = false;
    lastLocalCheck = now;
    console.log('⚠️ Pas de connexion locale, passage à SinricPro');
    return false;
  }
};

let pendingState = null;
let pendingTimeout = null;
const setPendingState = (newState) => {
  pendingState = { ...pendingState, ...newState };
  if (pendingTimeout) clearTimeout(pendingTimeout);
  pendingTimeout = setTimeout(() => { pendingState = null; }, 30000); // 30 secondes
};

const PROXY = '/api/sinric?path=';
let sinricToken = null;
let sinricTokenExpiry = 0;

const getSinricToken = async () => {
  const config = getConfig();
  if (!config.sinricAppKey) {
    console.warn('❌ Pas de clé API SinricPro configurée');
    return null;
  }
  if (sinricToken && Date.now() < sinricTokenExpiry) return sinricToken;
  
  try {
    console.log('🔑 Demande token SinricPro...');
    const response = await axios.post(
      `${PROXY}auth`, 
      {}, 
      { headers: { 'x-sinric-api-key': config.sinricAppKey }, timeout: 15000 }
    );
    if (response.data.success) {
      sinricToken = response.data.accessToken;
      sinricTokenExpiry = Date.now() + (response.data.expiresIn * 1000) - 60000;
      console.log('✅ Token SinricPro obtenu');
      return sinricToken;
    }
  } catch (err) {
    console.error('❌ Erreur token SinricPro:', err.message);
  }
  return null;
};

const getSinricState = async () => {
  const config = getConfig();
  if (!config.sinricDeviceId) {
    console.warn('❌ Pas de Device ID configuré');
    return null;
  }
  
  const token = await getSinricToken();
  if (!token) return null;
  
  try {
    console.log('📡 Lecture données SinricPro...');
    const response = await axios.get(
      `${PROXY}devices/${config.sinricDeviceId}`, 
      { headers: { 'Authorization': `Bearer ${token}` }, timeout: 15000 }
    );
    
    if (response.data.success) {
      const device = response.data.device || (response.data.devices && response.data.devices[0]);
      if (!device) {
        console.error('❌ Device non trouvé dans la réponse');
        return null;
      }

      const sinricMode = device.thermostatMode || 'HEAT';
      const modeMap = { 'HEAT': 'CONFORT', 'ECO': 'ECO', 'OFF': 'ARRET' };
      
      console.log('✅ Données SinricPro:', device.temperature, '°C,', sinricMode);
      
      // Récupérer la météo en parallèle
      const tempExt = await getWeatherFromGPS();
      
      return {
        tempActuelle: parseFloat(device.temperature) || null,
        humidite: parseFloat(device.humidity) || null,
        tempConfort: parseFloat(device.targetTemperature) || 20,
        tempEco: 17,
        tempExterieure: tempExt,
        mode: modeMap[sinricMode] || 'CONFORT',
        connectionMode: 'distant',
      };
    }
  } catch (err) {
    console.error('❌ Erreur lecture SinricPro:', err.message);
  }
  return null;
};

export const getThermostatData = async () => {
  const config = getConfig();
  
  if (config.thermostatIP) {
    const isLocal = await testLocalConnection(config.thermostatIP);
    if (isLocal) {
      try {
        const response = await axios.get(`http://${config.thermostatIP}/api/status`, { timeout: 3000 });
        const data = {
          tempActuelle: parseFloat(response.data.temperature) || 21.5,
          humidite: parseFloat(response.data.humidity) || 45,
          tempConfort: parseFloat(response.data.tempConfort) || 20,
          tempEco: parseFloat(response.data.tempEco) || 17,
          tempExterieure: parseFloat(response.data.tempExterieure) || null,
          mode: response.data.mode || 'CONFORT',
          connectionMode: 'local',
        };
        if (pendingState) return { ...data, ...pendingState, connectionMode: 'local' };
        return data;
      } catch (err) {
        console.warn('❌ Erreur lecture locale:', err.message);
        isLocalAvailable = false;
      }
    }
  }
  
  const sinricData = await getSinricState();
  if (sinricData) {
    if (pendingState) return { ...sinricData, ...pendingState, connectionMode: 'distant' };
    return sinricData;
  }
  
  console.warn('⚠️ Aucune source de données disponible');
  const fallback = {
    tempActuelle: null,
    humidite: null,
    tempConfort: 20,
    tempEco: 17,
    tempExterieure: null,
    mode: 'CONFORT',
    connectionMode: 'hors-ligne',
  };
  if (pendingState) return { ...fallback, ...pendingState };
  return fallback;
};

export const setMode = async (mode) => {
  const config = getConfig();
  const modeMap = { 'CONFORT': 0, 'ECO': 1, 'ARRET': 3 };
  const sinricModeMap = { 'CONFORT': 'HEAT', 'ECO': 'ECO', 'ARRET': 'OFF' };
  setPendingState({ mode });

  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.post(
        `http://${config.thermostatIP}/api/mode`, 
        JSON.stringify({ mode: modeMap[mode] }), 
        { headers: { 'Content-Type': 'application/json' }, timeout: 3000 }
      );
      console.log('✅ Mode changé en local');
      return true;
    } catch (err) { 
      console.warn('❌ Erreur mode local:', err.message); 
    }
  }

  try {
    const token = await getSinricToken();
    if (token) {
      await axios.post(
        `${PROXY}devices/${config.sinricDeviceId}/action`, 
        { 
          type: 'request',
          action: 'setThermostatMode', 
          value: JSON.stringify({ thermostatMode: sinricModeMap[mode] }) 
        }, 
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      console.log('✅ Mode changé via SinricPro');
      return true;
    }
  } catch (err) { 
    console.error('❌ Erreur mode SinricPro:', err.message); 
  }
  return false;
};

export const setConsigneConfort = async (temperature) => {
  const config = getConfig();
  setPendingState({ tempConfort: temperature });

  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.get(
        `http://${config.thermostatIP}/api/temp/confort?value=${parseFloat(temperature.toFixed(1))}`, 
        { timeout: 3000 }
      );
      console.log('✅ Consigne CONFORT changée en local');
      return true;
    } catch (err) { 
      console.warn('❌ Erreur consigne CONFORT local:', err.message); 
    }
  }

  try {
    const token = await getSinricToken();
    if (token) {
      await axios.post(
        `${PROXY}devices/${config.sinricDeviceId}/action`, 
        { 
          type: 'request',
          action: 'targetTemperature',
          value: JSON.stringify({ temperature: parseFloat(temperature) }) 
        }, 
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      console.log('✅ Consigne CONFORT changée via SinricPro');
      return true;
    }
  } catch (err) { 
    console.error('❌ Erreur consigne SinricPro:', err.message); 
  }
  return false;
};
