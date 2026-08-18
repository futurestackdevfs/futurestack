import { ComingSoon } from '@/components/ComingSoon';
import { RoleGate } from '../components/RoleGate';

export default function SupportDashboard() {
  return <RoleGate role="SUPPORT"><ComingSoon /></RoleGate>;
}