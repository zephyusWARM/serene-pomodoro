import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS as DEFAULTS, normalizeSettings } from '../utils/persistence';


const STORAGE_KEY = 'serene-settings';

const useSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return normalizeSettings(saved ? JSON.parse(saved) : null);
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => normalizeSettings({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
};

export default useSettings;
