export function ActiveCoursesTable() {
  const courses = [
    { name: "MERN Stack", progress: 65, due: "June 15", status: "On Track" },
    { name: "Python for Data Science", progress: 42, due: "July 10", status: "At Risk" },
    { name: "AWS Cloud Practitioner", progress: 18, due: "Aug 20", status: "Behind" },
  ];
  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Active Courses</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-gray-500">
            <th className="px-4 py-2 text-left font-medium">Course</th>
            <th className="px-4 py-2 text-left font-medium">Progress</th>
            <th className="px-4 py-2 text-left font-medium">Due Date</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.name} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{c.progress}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{c.due}</td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    c.status === "On Track"
                      ? "bg-green-50 text-green-700"
                      : c.status === "At Risk"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
