import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className="theme-switch" title="Ganti Tema Light/Dark">
      <input
        type="checkbox"
        checked={theme === 'dark'}
        onChange={toggleTheme}
      />
      <span className="theme-slider">
        <span className="slider-icon">{theme === 'light' ? '☀️' : '🌙'}</span>
      </span>
    </label>
  );
};

export default ThemeToggle;