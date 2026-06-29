import { OpsLogoutButton } from '@/app/ops/components/logout-button';

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-6">
      <h1 className="text-3xl font-bold">Hello Admin</h1>
      <OpsLogoutButton />
    </div>
  );
}
