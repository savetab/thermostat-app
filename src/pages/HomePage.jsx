import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ModeButton from '../components/ModeButton';
import TemperatureControl from '../components/TemperatureControl';
import { getThermostatData, setMode, setConsigneConfort } from '../api';

const getTempExtIcon = (temp) => {
  if (temp === null || temp === undefined) return '🌤️';
  if (temp < 0) return '🌨️';
  if (temp < 5) return '❄️';
  if (temp < 12) return '⛅';
  if (temp < 20) return '🌤️';
  return '☀️';
};

const HomePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionMode, setConnectionMode] = useState('local');
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (!isSendingRef.current) loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const result = await getThermostatData();
      if (!isSendingRef.current) {
        setData(result);
        setConnectionMode(result.connectionMode || 'local');
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (newMode) => {
    isSendingRef.current = true;
    setIsSending(true);
    setData(prev => ({ ...prev, mode: newMode }));
    try {
      await setMode(newMode);
      await loadData();
    } catch (err) {
      setError('Erreur changement de mode');
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleConsigneConfortChange = async (newTemp) => {
    isSendingRef.current = true;
    setIsSending(true);
    setData(prev => ({ ...prev, tempConfort: newTemp }));
    try {
      await setConsigneConfort(newTemp);
      console.log('✅ Consigne CONFORT envoyée:', newTemp);
    } catch (err) {
      setError('Erreur modification consigne CONFORT');
    } finally {
      // Attendre 5 secondes pour laisser SinricPro propager le changement
      setTimeout(() => {
        isSendingRef.current = false;
        setIsSending(false);
        loadData();
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const tempExt = data?.tempExterieure;
  const hasExt = tempExt !== null && tempExt !== undefined && tempExt > -50;
  const isConfortMode = data?.mode === 'CONFORT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏠</span>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              Thermostat Salon
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isSending && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
              />
            )}
            <div className={`w-2 h-2 rounded-full ${connectionMode === 'local' ? 'bg-green-500' : connectionMode === 'distant' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {connectionMode === 'local' ? '⚡ Local' : connectionMode === 'distant' ? '🌐 Distant' : 'Hors-ligne'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Températures */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Intérieur</div>
            <div className="text-5xl font-bold text-gray-800 dark:text-white mb-1">
              {data?.tempActuelle?.toFixed(1) || '--'}°
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              💧 {data?.humidite?.toFixed(0) || '--'}%
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 shadow-xl text-white"
          >
            <div className="text-sm opacity-80 mb-1">Extérieur</div>
            <div className="text-4xl font-bold mb-1">
              {getTempExtIcon(tempExt)}
            </div>
            <div className="text-2xl font-semibold">
              {hasExt ? `${tempExt.toFixed(1)}°` : '--°'}
            </div>
          </motion.div>
        </div>

        {/* Modes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">MODE</h2>
          <div className="grid grid-cols-2 gap-3">
            <ModeButton mode="CONFORT" icon="🔥" isActive={data?.mode === 'CONFORT'} onClick={() => handleModeChange('CONFORT')} color="confort" />
            <ModeButton mode="ECO" icon="🌿" isActive={data?.mode === 'ECO'} onClick={() => handleModeChange('ECO')} color="eco" />
            <ModeButton mode="ARRÊT" icon="⭕" isActive={data?.mode === 'ARRET'} onClick={() => handleModeChange('ARRET')} color="arret" />
          </div>
        </div>

        {/* Consignes */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl ${!isConfortMode ? 'opacity-60' : ''}`}>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">CONSIGNE</h2>
          <TemperatureControl
            label="CONFORT"
            icon="🔥"
            value={data?.tempConfort || 20}
            onChange={handleConsigneConfortChange}
            color="confort"
            min={10}
            max={30}
            disabled={!isConfortMode}
          />
          {!isConfortMode && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                ℹ️ Passez en mode CONFORT pour modifier la consigne
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
