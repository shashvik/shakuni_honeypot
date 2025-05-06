
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  BellRing,
  Settings,
  Shield,
  Database,
  CloudFog, // Import a suitable icon
  Webhook, // Import Webhook icon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: React.ElementType;
  title: string;
  to: string;
  isActive: boolean;
  collapsed: boolean;
}

function NavItem({ icon: Icon, title, to, isActive, collapsed }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("h-5 w-5", isActive && "text-cyber-primary")} />
      {!collapsed && <span>{title}</span>}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      title: "Dashboard",
      icon: BarChart2,
      to: "/dashboard",
    },
    {
      title: "Deploy Deception",
      icon: FolderOpen,
      to: "/deploy",
    },
    {
      title: "Cloud Alerts",
      icon: CloudFog,
      to: "/cloud-alerts",
    },
    {
      title: "Generic Alerts",
      icon: BellRing,
      to: "/generic-alerts",
    },
    {
      title: "View Assets",
      icon: Database,
      to: "/assets",
    },
    {
      title: "Custom Deceptions",
      icon: Webhook,
      to: "/custom-deceptions",
    },
    {
      title: "Settings",
      icon: Settings,
      to: "/settings",
    },
  ];

  return (
    <aside
      className={cn(
        "bg-sidebar h-screen flex flex-col border-r border-border transition-all",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyber-primary" />
            <h1 className="text-lg font-bold">Shakuni</h1>
          </div>
        )}
        {collapsed && <Shield className="h-6 w-6 text-cyber-primary mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              title={item.title}
              to={item.to}
              isActive={location.pathname === item.to}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border flex justify-center">
        <ThemeToggle />
      </div>
    </aside>
  );
}
