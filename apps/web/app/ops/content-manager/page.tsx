import { ComingSoon } from '@/components/ComingSoon';
import { RoleGate } from '../components/RoleGate';

export default function ContentManagerDashboard() {
  return <RoleGate role="CONTENT_MANAGER"><ComingSoon /></RoleGate>;
}