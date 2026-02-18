import axios from 'axios';

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
    return true;
  } catch {
    isLocalAvailable = false;
    lastLocalCheck = now;
    return false;
  }
};

let pendingState = null;
let pendingTimeout = null;
const setPendingState = (newState) => {
  pendingState = { ...pendingState, ...newState };
  if (pendingTimeout) clearTimeout(pendingTimeout);
  pendingTimeout = setTimeout(() => { pendingState = null; }, 5000);
};

// PROXY CORS public pour contourner les restrictions
const CORS_PROXY = 'https://corsproxy.io/?';
let sinricToken = null;
let sinricTokenExpiry = 0;

const getSinricToken = async () => {
  const config = getConfig();
  if (!config.sinricAppKey) return null;
  if (sinricToken && Date.now() < sinricTokenExpiry) return sinricToken;
  
  try {
    const response = await axios.post(
      `${CORS_PROXY}https://api.sinric.pro/api/v1/auth`,
      {},
      { headers: { 'x-sinric-api-key': config.sinricAppKey }, timeout: 15000 }
    );
    if (response.data.success) {
      sinricToken = response.data.accessToken;
      sinricTokenExpiry = Date.now() + (response.data.expiresIn * 1000) - 60000;
      return sinricToken;
    }
  } catch (err) {
    console.error('Erreur token SinricPro:', err.message);
  }
  return null;
};

const getSinricState = async () => {
  const config = getConfig();
  if (!config.sinricDeviceId) return null;
  
  const token = await getSinricToken();
  if (!token) return null;
  
  try {
    const response = await axios.get(
      `${CORS_PROXY}https://api.sinric.pro/api/v1/devices/${config.sinricDeviceId}`,
      { headers: { 'Authorization': `Bearer ${token}` }, timeout: 15000 }
    );
    
    if (response.data.success) {
      const device = response.data.device || (response.data.devices && response.data.devices[0]);
      if (!device) return null;

      const sinricMode = device.thermostatMode || 'HEAT';
      const modeMap = { 'HEAT': 'CONFORT', 'ECO': 'ECO', 'COOL': 'HORS_GEL', 'OFF': 'ARRET' };
      
      return {
        tempActuelle: parseFloat(device.temperature) || null,
        humidite: parseFloat(device.humidity) || null,
        tempConfort: parseFloat(device.targetTemperature) || 20,
        tempEco: 17,
        tempExterieure: null,
        mode: modeMap[sinricMode] || 'CONFORT',
        connectionMode: 'distant',
      };
    }
  } catch (err) {
    console.error('Erreur lecture SinricPro:', err.message);
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
        isLocalAvailable = false;
      }
    }
  }
  
  const sinricData = await getSinricState();
  if (sinricData) {
    if (pendingState) return { ...sinricData, ...pendingState, connectionMode: 'distant' };
    return sinricData;
  }
  
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
  const modeMap = { 'CONFORT': 0, 'ECO': 1, 'HORS_GEL': 2, 'ARRET': 3 };
  const sinricModeMap = { 'CONFORT': 'HEAT', 'ECO': 'ECO', 'HORS_GEL': 'COOL', 'ARRET': 'OFF' };
  setPendingState({ mode });

  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.post(`http://${config.thermostatIP}/api/mode`, JSON.stringify({ mode: modeMap[mode] }), { headers: { 'Content-Type': 'application/json' }, timeout: 3000 });
      return true;
    } catch (err) {}
  }

  try {
    const token = await getSinricToken();
    if (token) {
      await axios.post(
        `${CORS_PROXY}https://api.sinric.pro/api/v1/devices/${config.sinricDeviceId}/action`,
        { action: 'setThermostatMode', value: { thermostatMode: sinricModeMap[mode] } },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      return true;
    }
  } catch (err) {}
  return false;
};

export const setConsigneConfort = async (temperature) => {
  const config = getConfig();
  setPendingState({ tempConfort: temperature });

  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.get(`http://${config.thermostatIP}/api/temp/confort?value=${parseFloat(temperature.toFixed(1))}`, { timeout: 3000 });
      return true;
    } catch (err) {}
  }

  try {
    const token = await getSinricToken();
    if (token) {
      await axios.post(
        `${CORS_PROXY}https://api.sinric.pro/api/v1/devices/${config.sinricDeviceId}/action`,
        { action: 'setTargetTemperature', value: { temperature: parseFloat(temperature) } },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      return true;
    }
  } catch (err) {}
  return false;
};

export const setConsigneEco = async (temperature) => {
  const config = getConfig();
  setPendingState({ tempEco: temperature });

  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.get(`http://${config.thermostatIP}/api/temp/eco?value=${parseFloat(temperature.toFixed(1))}`, { timeout: 3000 });
      return true;
    } catch (err) {}
  }
  return false;
};

export const getRadiateurs = async () => {
  const config = getConfig();
  if (config.thermostatIP && isLocalAvailable) {
    try {
      const response = await axios.get(`http://${config.thermostatIP}/api/zones`, { timeout: 3000 });
      return response.data.zones || [];
    } catch (err) {}
  }
  return [];
};

export const setRadiateurForcedMode = async (radiateurId, forced) => {
  const config = getConfig();
  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.post(`http://${config.thermostatIP}/api/zones/update`, JSON.stringify({ id: radiateurId, forcedMode: forced ? 4 : 0 }), { headers: { 'Content-Type': 'application/json' }, timeout: 3000 });
      return true;
    } catch (err) {}
  }
  return false;
};
