"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PieChart, { PieSlice, slicesFromCounts } from "@/components/PieChart";
import { useRequireAuth } from "@/lib/auth";
import { api, Employee, Department, LeaveRequest, AttendanceSummary } from "@/lib/api";

export default function DashboardPage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      api.getEmployees(),
      api.getDepartments(),
      api.getLeaveRequests(),
      api.getAttendanceSummary(),
    ])
      .then(([e, d, l, a]) => {
        setEmployees(e);
        setDepartments(d);
        setLeaves(l);
        setAttendance(a);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authenticated]);

  if (authLoading || loading) return <div className="loading">Loading dashboard…</div>;
  if (error) return <div className="alert error">{error}</div>;

  const deptPie: PieSlice[] = slicesFromCounts(
    departments.map((d) => [d.name, employees.filter((e) => e.department?.id === d.id).length] as [string, number])
  );

  const leavePie: PieSlice[] = slicesFromCounts(
    (["PENDING", "APPROVED", "REJECTED"] as const).map(
      (s) => [s, leaves.filter((l) => l.status === s).length] as [string, number]
    ),
    { PENDING: "#8a6116", APPROVED: "#1a7f4f", REJECTED: "#c2374b" }
  );

  const attendancePie: PieSlice[] = attendance
    ? slicesFromCounts(
        (["PRESENT", "ABSENT", "ON_LEAVE"] as const).map((s) => [
          s,
          s === "PRESENT"
            ? attendance.present
            : s === "ABSENT"
            ? attendance.absent
            : attendance.onLeave,
        ] as [string, number]),
        { PRESENT: "#1a7f4f", ABSENT: "#c2374b", ON_LEAVE: "#8a6116" }
      )
    : [];

  const active = employees.filter((e) => e.status === "ACTIVE").length;
  const onLeave = employees.filter((e) => e.status === "ON_LEAVE").length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">Overview of your organization</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat">
          <div className="value">{employees.length}</div>
          <div className="label">Total employees</div>
        </div>
        <div className="card stat">
          <div className="value">{active}</div>
          <div className="label">Active</div>
        </div>
        <div className="card stat">
          <div className="value">{onLeave}</div>
          <div className="label">On leave</div>
        </div>
        <div className="card stat">
          <div className="value">{departments.length}</div>
          <div className="label">Departments</div>
        </div>
        <div className="card stat">
          <div className="value">{leaves.filter((l) => l.status === "PENDING").length}</div>
          <div className="label">Pending leave requests</div>
        </div>
      </div>

      <h2 className="section-title">Charts</h2>
      <div className="pie-grid">
        <PieChart
          title="Employees by department"
          data={deptPie}
          subtitle="Distribution across departments"
        />
        <PieChart
          title="Leave requests"
          data={leavePie}
          subtitle="All-time leave requests by status"
        />
        <PieChart
          title="Attendance today"
          data={attendancePie}
          subtitle="Present / absent / on leave"
        />
      </div>

      <div className="page-header">
        <h2 className="section-title">Pending leave requests</h2>
        <Link className="btn small" href="/leave">
          Review requests
        </Link>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves
              .filter((l) => l.status === "PENDING")
              .map((l) => (
                <tr key={l.id}>
                  <td className="cell-strong">
                    {l.employee.firstName} {l.employee.lastName}
                  </td>
                  <td>{l.type}</td>
                  <td className="cell-muted">
                    {l.startDate} → {l.endDate}
                  </td>
                  <td>
                    <span className={`badge ${l.status}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            {leaves.filter((l) => l.status === "PENDING").length === 0 && (
              <tr>
                <td colSpan={4} className="cell-muted">
                  No pending leave requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
