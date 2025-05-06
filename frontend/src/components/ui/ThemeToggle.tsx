
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThemeType } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeType; label: string; icon: JSX.Element }[] = [
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "cyberpunk-dark", label: "Cyberpunk", icon: <Moon className="h-4 w-4 text-pink-500" /> },
    { value: "midnight-dark", label: "Midnight", icon: <Moon className="h-4 w-4 text-blue-500" /> },
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "arctic-light", label: "Arctic", icon: <Sun className="h-4 w-4 text-blue-400" /> },
    { value: "sunset-light", label: "Sunset", icon: <Sun className="h-4 w-4 text-orange-400" /> },
    { value: "forest-light", label: "Forest", icon: <Sun className="h-4 w-4 text-green-500" /> },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Toggle theme"
        >
          {currentTheme.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {t.icon}
            <span>{t.label}</span>
            {theme === t.value && (
              <span className="ml-auto bg-primary w-1.5 h-1.5 rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
