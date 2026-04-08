import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SETOR_HOME_ROUTES } from '@/types';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { role, setor, profile, loading } = useAuth();

  // Wait for profile to load before deciding where to redirect
  if (loading || (!profile && role === null)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === 'master') return <Navigate to="/master" replace />;
  const home = setor ? SETOR_HOME_ROUTES[setor] : '/backoffice';
  return <Navigate to={home} replace />;
}
