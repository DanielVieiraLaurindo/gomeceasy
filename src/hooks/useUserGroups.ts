import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the list of access group names the current user belongs to,
 * plus the allowed actions from those groups.
 */
export function useUserGroups() {
  const { user, role } = useAuth();
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setGroupNames([]);
      setAllowedActions([]);
      setLoading(false);
      return;
    }

    if (role === 'master') {
      setGroupNames(['master']);
      setAllowedActions(['criar', 'editar', 'excluir', 'exportar', 'autorizar']);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const { data: userGroups } = await (supabase as any)
          .from('user_access_groups')
          .select('group_id')
          .eq('user_id', user.id);

        if (!userGroups || userGroups.length === 0) {
          setGroupNames([]);
          setAllowedActions([]);
          setLoading(false);
          return;
        }

        const groupIds = userGroups.map((g: any) => g.group_id);
        const { data: groups } = await (supabase as any)
          .from('access_groups')
          .select('nome, acoes_permitidas')
          .in('id', groupIds);

        if (groups) {
          const names = groups.map((g: any) => g.nome?.toLowerCase?.() || '');
          const actions: string[] = [];
          groups.forEach((g: any) => {
            if (Array.isArray(g.acoes_permitidas)) {
              actions.push(...g.acoes_permitidas);
            }
          });
          setGroupNames(names);
          setAllowedActions([...new Set(actions)]);
        }
      } catch {
        setGroupNames([]);
        setAllowedActions([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user?.id, role]);

  const isMaster = role === 'master';
  const isInGroup = (name: string) => isMaster || groupNames.some(g => g.includes(name.toLowerCase()));
  const canAction = (action: string) => isMaster || allowedActions.includes(action);

  return { groupNames, allowedActions, loading, isMaster, isInGroup, canAction };
}
