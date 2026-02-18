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
    // Timeout TRÈS court pour détecter rapidement si on est à distance
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
  pendingTimeout = setTimeout(() => { pendingState = null; }, 5000);
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
      const modeMap = { 'HEAT': 'CONFORT', 'ECO': 'ECO', 'COOL': 'HORS_GEL', 'OFF': 'ARRET' };
      
      console.log('✅ Données SinricPro:', device.temperature, '°C,', sinricMode);
      
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
    console.error('❌ Erreur lecture SinricPro:', err.message);
  }
  return null;
};

export const getThermostatData = async () => {
  const config = getConfig();
  
  // PRIORITÉ 1 : Test connexion locale (timeout court)
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
  
  // PRIORITÉ 2 : SinricPro distant
  const sinricData = await getSinricState();
  if (sinricData) {
    if (pendingState) return { ...sinricData, ...pendingState, connectionMode: 'distant' };
    return sinricData;
  }
  
  // FALLBACK
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
  const modeMap = { 'CONFORT': 0, 'ECO': 1, 'HORS_GEL': 2, 'ARRET': 3 };
  const sinricModeMap = { 'CONFORT': 'HEAT', 'ECO': 'ECO', 'HORS_GEL': 'COOL', 'ARRET': 'OFF' };
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
        { action: 'setThermostatMode', value: { thermostatMode: sinricModeMap[mode] } }, 
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
        { action: 'setTargetTemperature', value: { temperature: parseFloat(temperature) } }, 
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

export const setConsigneEco = async (temperature) => {
  const config = getConfig();
  setPendingState({ tempEco: temperature });

  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.get(
        `http://${config.thermostatIP}/api/temp/eco?value=${parseFloat(temperature.toFixed(1))}`, 
        { timeout: 3000 }
      );
      console.log('✅ Consigne ECO changée');
      return true;
    } catch (err) { 
      console.warn('❌ Erreur consigne ECO:', err.message); 
    }
  }
  return false;
};

export const getRadiateurs = async () => {
  const config = getConfig();
  if (config.thermostatIP && isLocalAvailable) {
    try {
      const response = await axios.get(`http://${config.thermostatIP}/api/zones`, { timeout: 3000 });
      return response.data.zones || [];
    } catch (err) { 
      console.warn('❌ Erreur zones:', err.message); 
    }
  }
  return [];
};

export const setRadiateurForcedMode = async (radiateurId, forced) => {
  const config = getConfig();
  if (config.thermostatIP && isLocalAvailable) {
    try {
      await axios.post(
        `http://${config.thermostatIP}/api/zones/update`, 
        JSON.stringify({ id: radiateurId, forcedMode: forced ? 4 : 0 }), 
        { headers: { 'Content-Type': 'application/json' }, timeout: 3000 }
      );
      return true;
    } catch (err) { 
      console.warn('❌ Erreur mode forcé:', err.message); 
    }
  }
  return false;
};
