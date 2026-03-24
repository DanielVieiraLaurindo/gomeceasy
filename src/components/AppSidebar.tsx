import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut, LayoutDashboard, ChevronDown, Search, Star } from 'lucide-react';
import { GoPartsLogo } from './GoPartsLogo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { SIDEBAR_ITEMS, MASTER_SIDEBAR_GROUPS, ECOMMERCE_SETOR_LABELS, type SidebarItem } from '@/config/sidebarConfig';
import { SETOR_LABELS, type AppSetor } from '@/types';
import { Input } from '@/components/ui/input';

const FAVORITES_KEY = 'erp_sidebar_favorites';

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}
function saveFavorites(favs: string[]) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs)); }

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const { role, setor, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isMaster = role === 'master';

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const toggleFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const next = prev.includes(path) ? prev.filter(f => f !== path) : [...prev, path];
      saveFavorites(next);
      return next;
    });
    setContextMenu(null);
  }, []);

  const isActive = (path: string) => {
    if (path === location.pathname) return true;
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]);
  };

  // All users see all modules (SAP ERP-style — all modules available)
  const allItems = useMemo(() => {
    const items: SidebarItem[] = [];
    if (isMaster) {
      items.push({ path: '/master', label: 'Dashboard Master', icon: LayoutDashboard });
    }
    MASTER_SIDEBAR_GROUPS.forEach(g => {
      if (g.setores) g.setores.forEach(s => items.push(...(SIDEBAR_ITEMS[s] || [])));
      else if (g.setor) items.push(...(SIDEBAR_ITEMS[g.setor] || []));
    });
    // Deduplicate
    const seen = new Set<string>();
    return items.filter(i => { if (seen.has(i.path)) return false; seen.add(i.path); return true; });
  }, [isMaster]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const q = searchTerm.toLowerCase();
    return allItems.filter(i => i.label.toLowerCase().includes(q));
  }, [searchTerm, allItems]);

  const favoriteItems = useMemo(() => allItems.filter(i => favorites.includes(i.path)), [allItems, favorites]);

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  };

  const renderItem = (item: SidebarItem) => {
    const active = isActive(item.path);
    const isFav = favorites.includes(item.path);
    return (
      <motion.button
        key={item.path}
        onClick={() => { navigate(item.path); setSearchTerm(''); }}
        onContextMenu={e => handleContextMenu(e, item.path)}
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
              className="whitespace-nowrap overflow-hidden font-medium text-[13px] flex-1 text-left"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && isFav && <Star className="w-3 h-3 text-warning fill-warning shrink-0" />}
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
        onContextMenu={e => handleContextMenu(e, '/master')}
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
        const groupKey = group.setor || group.label;
        const isOpen = openGroups.includes(groupKey);
        
        if (group.isModule && group.setores) {
          const allGroupItems = group.setores.flatMap(s => SIDEBAR_ITEMS[s] || []);
          const hasActiveChild = allGroupItems.some(i => isActive(i.path));
          
          return (
            <div key={groupKey}>
              <button
                onClick={() => toggleGroup(groupKey)}
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
                    {group.setores.map(setorKey => {
                      const subItems = SIDEBAR_ITEMS[setorKey] || [];
                      const subLabel = ECOMMERCE_SETOR_LABELS[setorKey] || SETOR_LABELS[setorKey];
                      const subIsOpen = openGroups.includes(setorKey);
                      const subHasActive = subItems.some(i => isActive(i.path));

                      return (
                        <div key={setorKey}>
                          <button
                            onClick={() => toggleGroup(setorKey)}
                            className={cn(
                              'flex items-center w-full gap-2 px-6 py-1 text-[11px] font-semibold tracking-wide transition-colors',
                              subHasActive ? 'text-primary' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
                            )}
                          >
                            <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', subIsOpen && 'rotate-180')} />
                            {subLabel}
                          </button>
                          <AnimatePresence>
                            {subIsOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pl-2"
                              >
                                {subItems.map(renderItem)}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }
        
        const items = group.setor ? SIDEBAR_ITEMS[group.setor] || [] : [];
        const hasActiveChild = items.some(i => isActive(i.path));
        return (
          <div key={groupKey}>
            <button
              onClick={() => toggleGroup(groupKey)}
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

      {collapsed && MASTER_SIDEBAR_GROUPS.flatMap(g => {
        if (g.setores) return g.setores.flatMap(s => SIDEBAR_ITEMS[s] || []);
        return g.setor ? SIDEBAR_ITEMS[g.setor] || [] : [];
      })
        .filter((item, idx, arr) => arr.findIndex(i => i.path === item.path) === idx)
        .map(renderItem)
      }
    </div>
  );

  // All users now see all modules
  const currentSetor: AppSetor = setor || 'backoffice';

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0"
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <GoPartsLogo collapsed={collapsed} />
      </div>

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/40" />
            <Input
              placeholder="Buscar módulo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-sidebar-accent/10 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            />
          </div>
        </div>
      )}

      {/* Search results */}
      {!collapsed && searchTerm && (
        <div className="px-1 py-1 border-b border-sidebar-border max-h-60 overflow-y-auto">
          {searchResults.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/40 text-center py-3">Nenhum módulo encontrado</p>
          ) : searchResults.map(renderItem)}
        </div>
      )}

      {/* Favorites section */}
      {!collapsed && !searchTerm && favoriteItems.length > 0 && (
        <div className="px-1 py-1 border-b border-sidebar-border">
          <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 flex items-center gap-1">
            <Star className="w-3 h-3 fill-warning text-warning" /> Favoritos
          </p>
          {favoriteItems.map(renderItem)}
        </div>
      )}

      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {!searchTerm && renderMasterSidebar()}
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

      {/* Context menu for right-click favorites */}
      {contextMenu && (
        <div
          className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => toggleFavorite(contextMenu.path)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Star className={cn("w-4 h-4", favorites.includes(contextMenu.path) ? "fill-warning text-warning" : "text-muted-foreground")} />
            {favorites.includes(contextMenu.path) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
          </button>
        </div>
      )}
    </motion.aside>
  );
}
