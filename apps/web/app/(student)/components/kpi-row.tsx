export function KpiRow() {
  const kpis = [
    { label: "Courses Enrolled", value: "8", change: "+2 this month" },
    { label: "Hours Spent", value: "186", change: "+12 this week" },
    { label: "Completion Rate", value: "87%", change: "+5% vs last month" },
    { label: "Avg Score", value: "92%", change: "Top 10%" },
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">{k.label}</p>
          <p className="text-2xl font-bold mt-1">{k.value}</p>
          <p className="text-xs text-green-600 mt-1">{k.change}</p>
        </div>
      ))}
    </div>
  );
}
