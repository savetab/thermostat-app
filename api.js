import axios from 'axios';

// ========== CONFIGURATION ==========
const getConfig = () => {
  return {
    thermostatIP: localStorage.getItem('thermostatIP') || '',
    sinricAppKey: localStorage.getItem('sinricAppKey') || '',
    sinricAppSecret: localStorage.getItem('sinricAppSecret') || '',
    sinricDeviceId: localStorage.getItem('sinricDeviceId') || '',
  };
};

export const saveConfig = (config) => {
  localStorage.setItem('thermostatIP', config.thermostatIP);
  localStorage.setItem('sinricAppKey', config.sinricAppKey);
  localStorage.setItem('sinricAppSecret', config.sinricAppSecret);
  localStorage.setItem('sinricDeviceId', config.sinricDeviceId);
};

// ========== TEST CONNEXION LOCALE ==========
let isLocalAvailable = false;
let lastLocalCheck = 0;
const LOCAL_CHECK_INTERVAL = 10000;

const testLocalConnection = async (ip) => {
  if (!ip) return false;
  const now = Date.now();
  if (now - lastLocalCheck < LOCAL_CHECK_INTERVAL && lastLocalCheck > 0) {
    return isLocalAvailable;
  }
  try {
    const response = await axios.get(`http://${ip}/api/status`, { timeout: 2000 });
    isLocalAvailable = response.status === 200;
    lastLocalCheck = now;
    return isLocalAvailable;
  } catch (error) {
    isLocalAvailable = false;
    lastLocalCheck = now;
    return false;
  }
};

// ========== ÉTAT LOCAL CACHE ==========
let pendingState = null;
let pendingTimeout = null;

const setPendingState = (newState) => {
  pendingState = { ...pendingState, ...newState };
  if (pendingTimeout) clearTimeout(pendingTimeout);
  pendingTimeout = setTimeout(() => { pendingState = null; }, 5000);
};

// ========== GET ÉTAT THERMOSTAT ==========
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
      } catch (error) {
        console.log('Erreur lecture locale:', error.message);
      }
    }
  }
  const fallback = { tempActuelle: 21.5, humidite: 45, tempConfort: 20, tempEco: 17, mode: 'CONFORT', connectionMode: 'distant' };
  if (pendingState) return { ...fallback, ...pendingState };
  return fallback;
};

// ========== SET MODE ==========
export const setMode = async (mode) => {
  const config = getConfig();
  const modeMap = { 'CONFORT': 0, 'ECO': 1, 'HORS_GEL': 2, 'ARRET': 3 };
  setPendingState({ mode: mode });
  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.post(`http://${config.thermostatIP}/api/mode`, JSON.stringify({ mode: modeMap[mode] }), { headers: { 'Content-Type': 'application/json' }, timeout: 3000 });
      return;
    } catch (error) { console.log('Erreur mode local:', error.message); }
  }
};

// ========== SET CONSIGNE CONFORT ==========
export const setConsigneConfort = async (temperature) => {
  const config = getConfig();
  setPendingState({ tempConfort: temperature });
  if (config.thermostatIP && isLocalAvailable) {
    try {
      // Utilise GET avec value= (compatible interface web ESP32)
      await axios.get(
        `http://${config.thermostatIP}/api/temp/confort?value=${parseFloat(temperature.toFixed(1))}`,
        { timeout: 3000 }
      );
      return;
    } catch (error) { console.log('Erreur consigne CONFORT:', error.message); }
  }
};

// ========== SET CONSIGNE ECO ==========
export const setConsigneEco = async (temperature) => {
  const config = getConfig();
  setPendingState({ tempEco: temperature });
  if (config.thermostatIP && isLocalAvailable) {
    try {
      // Utilise GET avec value= (compatible interface web ESP32)
      await axios.get(
        `http://${config.thermostatIP}/api/temp/eco?value=${parseFloat(temperature.toFixed(1))}`,
        { timeout: 3000 }
      );
      return;
    } catch (error) { console.log('Erreur consigne ECO:', error.message); }
  }
};

// ========== GET RADIATEURS ==========
export const getRadiateurs = async () => {
  const config = getConfig();
  if (config.thermostatIP && isLocalAvailable) {
    try {
      const response = await axios.get(`http://${config.thermostatIP}/api/zones`, { timeout: 3000 });
      return response.data.zones || [];
    } catch (error) { console.log('Erreur zones:', error.message); }
  }
  return [];
};

// ========== SET RADIATEUR FORCED MODE ==========
export const setRadiateurForcedMode = async (radiateurId, forced) => {
  const config = getConfig();
  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.post(`http://${config.thermostatIP}/api/zones/update`, JSON.stringify({ id: radiateurId, forcedMode: forced ? 4 : 0 }), { headers: { 'Content-Type': 'application/json' }, timeout: 3000 });
    } catch (error) { console.log('Erreur mode forcé:', error.message); }
  }
};
// Température extérieure maintenant fournie par l'ESP32 via /api/status
