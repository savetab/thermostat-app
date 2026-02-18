import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { saveConfig } from '../api';

const ConfigPage = () => {
  const [config, setConfig] = useState({
    thermostatIP: '',
    sinricAppKey: '',
    sinricAppSecret: '',
    sinricDeviceId: '',
  });
  const [saved, setSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setConfig({
      thermostatIP: localStorage.getItem('thermostatIP') || '',
      sinricAppKey: localStorage.getItem('sinricAppKey') || '',
      sinricAppSecret: localStorage.getItem('sinricAppSecret') || '',
      sinricDeviceId: localStorage.getItem('sinricDeviceId') || '',
    });

    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Configuration
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span>🏠</span>
            Connexion locale
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adresse IP du thermostat
            </label>
            <input
              type="text"
              value={config.thermostatIP}
              onChange={(e) => setConfig({ ...config, thermostatIP: e.target.value })}
              placeholder="192.168.1.100"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Utilisée pour la connexion rapide locale
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span>🌐</span>
            SinricPro (accès distant)
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                APP KEY
              </label>
              <input
                type="text"
                value={config.sinricAppKey}
                onChange={(e) => setConfig({ ...config, sinricAppKey: e.target.value })}
                placeholder="aaaa-bbbb-cccc-dddd"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:border-blue-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                APP SECRET
              </label>
              <input
                type="password"
                value={config.sinricAppSecret}
                onChange={(e) => setConfig({ ...config, sinricAppSecret: e.target.value })}
                placeholder="xxxx-yyyy-zzzz-wwww"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:border-blue-500 outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                DEVICE ID
              </label>
              <input
                type="text"
                value={config.sinricDeviceId}
                onChange={(e) => setConfig({ ...config, sinricDeviceId: e.target.value })}
                placeholder="64abc123def456..."
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:border-blue-500 outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 Ces identifiants permettent l'accès distant via SinricPro quand vous n'êtes pas chez vous
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <span>🎨</span>
            Apparence
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">
                Mode sombre
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {darkMode ? 'Activé' : 'Désactivé'}
              </div>
            </div>
            
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ${
                darkMode ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 flex items-center justify-center ${
                darkMode ? 'translate-x-7' : 'translate-x-1'
              }`}>
                {darkMode ? '🌙' : '☀️'}
              </span>
            </button>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-shadow"
        >
          {saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </motion.button>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Thermostat App v1.0</p>
          <p className="text-xs mt-1">Connexion hybride locale/distante</p>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;