import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SIDEBAR_ITEMS } from '@/config/sidebarConfig';
import type { AppSetor } from '@/types';

/**
 * Returns the set of paths the current user is allowed to see.
 * - Master/admin: all paths
 * - Regular user: own sector paths + extra paths from access_groups.menus_permitidos
 */
export function useUserPermissions() {
  const { user, role, setor } = useAuth();
  const [extraPaths, setExtraPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setExtraPaths([]);
      setLoading(false);
      return;
    }

    // Master sees everything
    if (role === 'master') {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Get user's access groups
        const { data: userGroups } = await supabase
          .from('user_access_groups')
          .select('group_id')
          .eq('user_id', user.id);

        if (!userGroups || userGroups.length === 0) {
          setExtraPaths([]);
          setLoading(false);
          return;
        }

        const groupIds = userGroups.map(g => g.group_id);
        const { data: groups } = await supabase
          .from('access_groups')
          .select('menus_permitidos')
          .in('id', groupIds);

        if (groups) {
          const allPaths: string[] = [];
          groups.forEach(g => {
            const menus = g.menus_permitidos;
            if (Array.isArray(menus)) {
              allPaths.push(...(menus as string[]));
            }
          });
          setExtraPaths([...new Set(allPaths)]);
        }
      } catch {
        setExtraPaths([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id, role]);

  /**
   * Compute allowed paths for sidebar filtering.
   * Returns null if master (show all), otherwise a Set of allowed paths.
   */
  const allowedPaths = (): Set<string> | null => {
    if (role === 'master') return null; // null = show all

    const paths = new Set<string>();

    // Add own sector paths
    if (setor && SIDEBAR_ITEMS[setor]) {
      SIDEBAR_ITEMS[setor].forEach(item => paths.add(item.path));
    }

    // Add extra paths from access groups
    extraPaths.forEach(p => paths.add(p));

    // Always allow settings/profile
    paths.add('/configuracoes');
    paths.add('/perfil');

    return paths;
  };

  /**
   * Check if a specific path is allowed for the current user
   */
  const isPathAllowed = (path: string): boolean => {
    const allowed = allowedPaths();
    if (!allowed) return true; // master
    return allowed.has(path);
  };

  /**
   * Get the setores that have at least one visible item
   */
  const visibleSetores = (): Set<AppSetor> => {
    if (role === 'master') {
      return new Set(Object.keys(SIDEBAR_ITEMS) as AppSetor[]);
    }

    const setores = new Set<AppSetor>();
    const allowed = allowedPaths();
    if (!allowed) return new Set(Object.keys(SIDEBAR_ITEMS) as AppSetor[]);

    (Object.entries(SIDEBAR_ITEMS) as [AppSetor, any][]).forEach(([s, items]) => {
      if (items.some((item: any) => allowed.has(item.path))) {
        setores.add(s);
      }
    });

    return setores;
  };

  return { allowedPaths, isPathAllowed, visibleSetores, loading, extraPaths };
}
