"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeColors = {
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  bgSelected: string;
  primaryHsl: string;
};

export const THEMES: Record<string, ThemeColors> = {
  // Paleta 1: Azul Corporativo (Default)
  blue: { 
    name: "Azul Corporativo",
    colorPrimary: '#0284C7', 
    colorSecondary: '#38BDF8', 
    bgSelected: '#E0F2FE',
    primaryHsl: '201 96% 39%' 
  },
  // Paleta 2: Esmeralda
  emerald: { 
    name: "Esmeralda",
    colorPrimary: '#059669', 
    colorSecondary: '#34D399', 
    bgSelected: '#D1FAE5',
    primaryHsl: '161 94% 30%' 
  },
  // Paleta 3: Violeta Pro
  violet: { 
    name: "Violeta Pro",
    colorPrimary: '#7C3AED', 
    colorSecondary: '#A78BFA', 
    bgSelected: '#EDE9FE',
    primaryHsl: '263 70% 58%' 
  },
  // Paleta 4: Rosa Coral
  rose: { 
    name: "Rosa Coral",
    colorPrimary: '#E11D48', 
    colorSecondary: '#FB7185', 
    bgSelected: '#FFE4E6',
    primaryHsl: '347 77% 50%' 
  },
  // Paleta 5: Ámbar Energético
  amber: { 
    name: "Ámbar Energético",
    colorPrimary: '#D97706', 
    colorSecondary: '#FCD34D', 
    bgSelected: '#FEF3C7',
    primaryHsl: '32 95% 44%' 
  },
  // Paleta 6: Slate Oscuro Premium
  slate: { 
    name: "Slate Oscuro",
    colorPrimary: '#475569', 
    colorSecondary: '#94A3B8', 
    bgSelected: '#F1F5F9',
    primaryHsl: '215 25% 37%' 
  },
  // Paleta 7: Fucsia/Magenta
  fuchsia: { 
    name: "Fucsia",
    colorPrimary: '#C026D3', 
    colorSecondary: '#E879F9', 
    bgSelected: '#FDF4FF',
    primaryHsl: '295 72% 49%' 
  },
  // Paleta 8: Teal Institucional
  teal: { 
    name: "Teal Institucional",
    colorPrimary: '#0D9488', 
    colorSecondary: '#2DD4BF', 
    bgSelected: '#CCFBF1',
    primaryHsl: '175 55% 32%' 
  },
  // Paleta 9: Indigo Profundo
  indigo: { 
    name: "Índigo Profundo",
    colorPrimary: '#4338CA', 
    colorSecondary: '#818CF8', 
    bgSelected: '#EEF2FF',
    primaryHsl: '243 55% 51%' 
  },
  // Paleta 10: Naranja Vibrante
  orange: { 
    name: "Naranja Vibrante",
    colorPrimary: '#EA580C', 
    colorSecondary: '#FB923C', 
    bgSelected: '#FFF7ED',
    primaryHsl: '21 90% 48%' 
  },
};


type ThemeContextType = {
  theme: string;
  setTheme: (theme: string) => void;
  currentThemeConfig: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>("blue");
  
  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("crm-theme-preference");
    if (saved && THEMES[saved]) {
      setThemeState(saved);
    }
  }, []);

  // Update CSS Variables
  useEffect(() => {
    const config = THEMES[theme] || THEMES.blue;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', config.colorPrimary);
    root.style.setProperty('--color-secondary', config.colorSecondary);
    root.style.setProperty('--bg-selected', config.bgSelected);
    root.style.setProperty('--primary', config.primaryHsl);
    root.style.setProperty('--ring', config.primaryHsl);
  }, [theme]);

  const setTheme = (newTheme: string) => {
    if (THEMES[newTheme]) {
      setThemeState(newTheme);
      localStorage.setItem("crm-theme-preference", newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentThemeConfig: THEMES[theme] || THEMES.blue }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
