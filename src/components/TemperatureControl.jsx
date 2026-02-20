import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const TemperatureControl = ({ 
  label, 
  icon, 
  value, 
  onChange, 
  color,
  min = 5,
  max = 30,
  step = 0.5 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isChanging, setIsChanging] = useState(false);
  const holdTimeoutRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Envoyer la valeur avec debounce pour le slider
  const debouncedOnChange = (newValue) => {
    setLocalValue(newValue);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      onChange(newValue);
    }, 800);
  };

  const handleSingleIncrement = () => {
    const newValue = Math.min(localValue + step, max);
    if (newValue !== localValue) {
      setLocalValue(newValue);
      onChange(newValue);
      setIsChanging(true);
      setTimeout(() => setIsChanging(false), 300);
    }
  };

  const handleSingleDecrement = () => {
    const newValue = Math.max(localValue - step, min);
    if (newValue !== localValue) {
      setLocalValue(newValue);
      onChange(newValue);
      setIsChanging(true);
      setTimeout(() => setIsChanging(false), 300);
    }
  };

  const startIncrementHold = () => {
    // Premier increment immédiat
    handleSingleIncrement();
    
    // Attendre 600ms avant de démarrer l'auto-increment
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setLocalValue(prev => {
          const newValue = Math.min(prev + step, max);
          if (newValue !== prev) {
            onChange(newValue);
            return newValue;
          }
          return prev;
        });
      }, 200);
    }, 600);
  };

  const startDecrementHold = () => {
    // Premier decrement immédiat
    handleSingleDecrement();
    
    // Attendre 600ms avant de démarrer l'auto-decrement
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setLocalValue(prev => {
          const newValue = Math.max(prev - step, min);
          if (newValue !== prev) {
            onChange(newValue);
            return newValue;
          }
          return prev;
        });
      }, 200);
    }, 600);
  };

  const stopHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const buttonColor = 
    color === 'confort' ? '#F59E0B' :
    color === 'eco' ? '#10B981' : '#3B82F6';

  return (
    <div className="mb-6">
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-2">{icon}</span>
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onMouseDown={startDecrementHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startDecrementHold}
          onTouchEnd={stopHold}
          className="w-16 h-16 rounded-xl font-bold text-2xl text-white shadow-lg active:shadow-inner transition-all duration-150 flex items-center justify-center"
          style={{ backgroundColor: buttonColor }}
        >
          −
        </motion.button>

        <motion.div
          animate={{ scale: isChanging ? 1.05 : 1 }}
          className="flex-1 h-16 rounded-xl bg-white dark:bg-gray-800 border-2 flex items-center justify-center shadow-md"
          style={{ borderColor: buttonColor }}
        >
          <motion.span
            key={localValue}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-bold text-gray-800 dark:text-white"
          >
            {localValue.toFixed(1)}°C
          </motion.span>
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onMouseDown={startIncrementHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startIncrementHold}
          onTouchEnd={stopHold}
          className="w-16 h-16 rounded-xl font-bold text-2xl text-white shadow-lg active:shadow-inner transition-all duration-150 flex items-center justify-center"
          style={{ backgroundColor: buttonColor }}
        >
          +
        </motion.button>
      </div>

      <div className="mt-4 px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={(e) => debouncedOnChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${buttonColor} 0%, ${buttonColor} ${((localValue - min) / (max - min)) * 100}%, #e5e7eb ${((localValue - min) / (max - min)) * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {label === 'CONFORT' && (
          <>
            {[18, 19, 20, 21, 22].map(temp => (
              <PresetButton key={temp} value={temp} current={localValue} onChange={(val) => { setLocalValue(val); onChange(val); }} />
            ))}
          </>
        )}
        {label === 'ECO' && (
          <>
            {[15, 16, 17, 18].map(temp => (
              <PresetButton key={temp} value={temp} current={localValue} onChange={(val) => { setLocalValue(val); onChange(val); }} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const PresetButton = ({ value, current, onChange }) => (
  <button
    onClick={() => onChange(value)}
    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-150 ${
      Math.abs(current - value) < 0.3
        ? 'bg-blue-500 text-white shadow-md' 
        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
    }`}
  >
    {value}°C
  </button>
);

export default TemperatureControl;
