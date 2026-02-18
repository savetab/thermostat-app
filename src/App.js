import React, { useState } from 'react';
import HomePage from './pages/HomePage';
import RadiateursPage from './pages/RadiateursPage';
import ConfigPage from './pages/ConfigPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'radiateurs':
        return <RadiateursPage />;
      case 'config':
        return <ConfigPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="App">
      {renderPage()}
      
      {/* Navigation bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setCurrentPage('home')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                currentPage === 'home' 
                  ? 'text-blue-500' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-2xl mb-1">🏠</span>
              <span className="text-xs font-medium">Accueil</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('radiateurs')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                currentPage === 'radiateurs' 
                  ? 'text-blue-500' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-2xl mb-1">📍</span>
              <span className="text-xs font-medium">Radiateurs</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('config')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                currentPage === 'config' 
                  ? 'text-blue-500' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-2xl mb-1">⚙️</span>
              <span className="text-xs font-medium">Config</span>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Spacer pour la navbar */}
      <div className="h-16"></div>
    </div>
  );
}

export default App;