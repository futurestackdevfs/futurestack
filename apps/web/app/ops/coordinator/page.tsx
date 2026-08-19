import { ComingSoon } from '@/components/ComingSoon';
import { RoleGate } from '../components/RoleGate';

export default function CoordinatorDashboard() {
  return <RoleGate role="COORDINATOR"><ComingSoon /></RoleGate>;
}