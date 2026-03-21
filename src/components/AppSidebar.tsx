import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { GoPartsLogo } from './GoPartsLogo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { SIDEBAR_ITEMS, MASTER_SIDEBAR_GROUPS, type SidebarItem } from '@/config/sidebarConfig';
import { SETOR_LABELS, type AppSetor } from '@/types';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const { role, setor, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isMaster = role === 'master';

  const isActive = (path: string) => {
    if (path === location.pathname) return true;
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]);
  };

  const renderItem = (item: SidebarItem) => {
    const active = isActive(item.path);
    return (
      <motion.button
        key={item.path}
        onClick={() => navigate(item.path)}
        whileHover={{ x: 4 }}
        className={cn(
          'relative flex items-center w-full gap-3 px-4 py-2 text-sm transition-colors',
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
        <item.icon className="w-4 h-4 shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap overflow-hidden font-medium text-[13px]"
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
      </motion.button>
    );
  };

  const renderMasterSidebar = () => (
    <div className="space-y-1">
      <motion.button
        onClick={() => navigate('/master')}
        whileHover={{ x: 4 }}
        className={cn(
          'relative flex items-center w-full gap-3 px-4 py-2.5 text-sm transition-colors',
          'hover:bg-sidebar-accent/10',
          isActive('/master')
            ? 'text-primary bg-[hsl(25_95%_55%/0.15)]'
            : 'text-sidebar-foreground'
        )}
      >
        {isActive('/master') && (
          <motion.div layoutId="activeIndicator" className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r" />
        )}
        <LayoutDashboard className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="font-medium text-[13px]">Dashboard Master</span>}
      </motion.button>

      {!collapsed && MASTER_SIDEBAR_GROUPS.map(group => {
        const isOpen = openGroups.includes(group.setor);
        const items = SIDEBAR_ITEMS[group.setor] || [];
        const hasActiveChild = items.some(i => isActive(i.path));
        return (
          <div key={group.setor}>
            <button
              onClick={() => toggleGroup(group.setor)}
              className={cn(
                'flex items-center w-full gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
                hasActiveChild ? 'text-primary' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
              )}
            >
              <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
              {group.label}
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {items.map(renderItem)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {collapsed && MASTER_SIDEBAR_GROUPS.flatMap(g => SIDEBAR_ITEMS[g.setor] || [])
        .filter((item, idx, arr) => arr.findIndex(i => i.path === item.path) === idx)
        .map(renderItem)
      }
    </div>
  );

  const currentSetor: AppSetor = setor || 'backoffice';
  const items = SIDEBAR_ITEMS[currentSetor] || SIDEBAR_ITEMS.backoffice;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0"
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <GoPartsLogo collapsed={collapsed} />
      </div>

      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {isMaster ? renderMasterSidebar() : items.map(renderItem)}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="text-xs text-sidebar-foreground/60 mb-2 px-1 truncate">
            <span>{profile.nome}</span>
            <span className="block text-[10px] opacity-60">{SETOR_LABELS[currentSetor] || currentSetor}</span>
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
