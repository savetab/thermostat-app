import React from 'react';
import { motion } from 'framer-motion';

const ModeButton = ({ mode, icon, isActive, onClick, color }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative overflow-hidden
        w-full h-24 rounded-2xl
        flex flex-col items-center justify-center
        font-semibold text-lg
        transition-all duration-300
        ${isActive 
          ? 'bg-orange-500 text-white shadow-xl' 
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md'
        }
      `}
      style={{
        backgroundColor: isActive ? (
          color === 'confort' ? '#F59E0B' :
          color === 'eco' ? '#10B981' :
          color === 'horsgel' ? '#3B82F6' : '#6B7280'
        ) : undefined,
      }}
    >
      <span className="text-4xl mb-1">{icon}</span>
      <span className="text-sm tracking-wide">{mode}</span>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"
        />
      )}
    </motion.button>
  );
};

export default ModeButton;