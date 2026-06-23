export function RoleSelector() {
  const roles = [
    { id: "admin", label: "Admin", icon: "⚙️", desc: "Full system access" },
    { id: "teacher", label: "Teacher", icon: "👨‍🏫", desc: "Manage courses & students" },
    { id: "coordinator", label: "Coordinator", icon: "📋", desc: "Operations & scheduling" },
    { id: "sales", label: "Sales", icon: "📈", desc: "CRM & enrollments" },
  ];

  return (
    <div className="role-selector">
      <h3>Select Role</h3>
      <div className="role-grid">
        {roles.map((r) => (
          <button key={r.id} className="role-card">
            <span className="role-icon">{r.icon}</span>
            <span className="role-label">{r.label}</span>
            <span className="role-desc">{r.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
