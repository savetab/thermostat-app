import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRadiateurs, setRadiateurForcedMode } from '../api';

const RadiateursPage = () => {
  const [radiateurs, setRadiateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRadiateurs();
    const interval = setInterval(loadRadiateurs, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRadiateurs = async () => {
    try {
      const data = await getRadiateurs();
      setRadiateurs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForcedMode = async (radiateurId, currentForced) => {
    try {
      await setRadiateurForcedMode(radiateurId, !currentForced);
      await loadRadiateurs();
    } catch (err) {
      console.error('Erreur modification radiateur');
    }
  };

  const getModeIcon = (mode) => {
    const icons = { 'CONFORT': '🔥', 'ECO': '🌿', 'HORS_GEL': '❄️', 'ARRET': '⭕' };
    return icons[mode] || '❓';
  };

  const getModeColor = (mode) => {
    const colors = {
      'CONFORT': 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
      'ECO': 'text-green-500 bg-green-100 dark:bg-green-900/30',
      'HORS_GEL': 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
      'ARRET': 'text-gray-500 bg-gray-100 dark:bg-gray-700'
    };
    return colors[mode] || 'text-gray-500 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📍</span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Radiateurs
            </h1>
            <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {radiateurs.length} zone{radiateurs.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {radiateurs.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📍</span>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Aucun radiateur
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Appairez des radiateurs depuis le thermostat principal
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {radiateurs.map((radiateur, index) => (
              <motion.div
                key={radiateur.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl">
                      🔥
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {radiateur.name || `Zone ${radiateur.id}`}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {radiateur.id}
                      </p>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    radiateur.active 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {radiateur.active ? '✓ Actif' : '✗ Inactif'}
                  </div>
                </div>

                {radiateur.active && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Mode actuel
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getModeColor(radiateur.mode)} font-semibold`}>
                      <span className="text-2xl">{getModeIcon(radiateur.mode)}</span>
                      <span>{radiateur.mode}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white">
                      Mode forcé ARRÊT
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {radiateur.forcedMode === 4 ? 'Radiateur désactivé' : 'Suit le mode général'}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleForcedMode(radiateur.id, radiateur.forcedMode === 4)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ${
                      radiateur.forcedMode === 4 ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                      radiateur.forcedMode === 4 ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {radiateur.active && radiateur.mode !== 'ARRET' && radiateur.forcedMode !== 4 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 flex items-center gap-2 text-orange-500"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-3 h-3 bg-orange-500 rounded-full"
                    />
                    <span className="text-sm font-medium">En chauffe</span>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            💡 <strong>Astuce :</strong> Utilisez le mode forcé ARRÊT pour couper temporairement un radiateur sans affecter les autres zones.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RadiateursPage;