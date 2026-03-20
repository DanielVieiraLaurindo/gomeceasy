import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { GoPartsLogo } from './GoPartsLogo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types';
import { SIDEBAR_ITEMS } from '@/config/sidebarConfig';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentRole: AppRole = role || 'backoffice';
  const items = SIDEBAR_ITEMS[currentRole] || SIDEBAR_ITEMS.backoffice;

  const isActive = (path: string) => {
    if (path === location.pathname) return true;
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0"
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <GoPartsLogo collapsed={collapsed} />
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex items-center w-full gap-3 px-4 py-2.5 text-sm transition-colors',
                'hover:bg-sidebar-accent/10',
                active
                  ? 'text-primary bg-[hsl(25_95%_55%/0.15)]'
                  : 'text-sidebar-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="ml-auto text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="text-xs text-sidebar-foreground/60 mb-2 px-1 truncate">
            {profile.nome}
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-destructive rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 hover:text-primary transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
