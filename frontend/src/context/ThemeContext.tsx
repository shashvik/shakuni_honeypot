
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "dark" | "light" | "cyberpunk-dark" | "midnight-dark" | "arctic-light" | "sunset-light" | "forest-light";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme") as ThemeType | null;
    // Use saved theme if available, otherwise default to dark
    return savedTheme || "dark";
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem("theme", theme);
    
    // Update DOM
    const root = window.document.documentElement;
    
    // First, remove all theme classes
    root.classList.remove("dark", "light", "cyberpunk-dark", "midnight-dark", "arctic-light", "sunset-light", "forest-light");
    
    // Add the selected theme
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
