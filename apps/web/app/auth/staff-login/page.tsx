import { BrandPanel } from "@/app/auth/components/staff-login/brand-panel";
import { RoleSelector } from "@/app/auth/components/staff-login/role-selector";
import { StaffLoginForm } from "@/app/auth/components/staff-login/login-form";

export default function StaffLoginPage() {
  return (
    <div className="staff-login-page" style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ flex: 1, maxWidth: 440, padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <RoleSelector />
        <StaffLoginForm />
      </div>
      <div style={{ flex: 1, background: "linear-gradient(135deg, #071428, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BrandPanel />
      </div>
    </div>
  );
}
