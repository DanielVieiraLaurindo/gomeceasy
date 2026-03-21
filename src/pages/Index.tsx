import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SETOR_HOME_ROUTES } from '@/types';

export default function Index() {
  const { role, setor } = useAuth();
  if (role === 'master') return <Navigate to="/master" replace />;
  const home = setor ? SETOR_HOME_ROUTES[setor] : '/backoffice';
  return <Navigate to={home} replace />;
}
