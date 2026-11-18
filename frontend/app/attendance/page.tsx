"use client";

import { useCallback, useEffect, useState } from "react";
import PieChart, { PieSlice, slicesFromCounts } from "@/components/PieChart";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { api, AttendanceRow, AttendanceSummary, AttendanceStatus } from "@/lib/api";

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "ON_LEAVE"];

const COLOR: Record<AttendanceStatus, string> = {
  PRESENT: "#1a7f4f",
  ABSENT: "#c2374b",
  ON_LEAVE: "#8a6116",
};

export default function AttendancePage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { isAdmin } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [r, s] = await Promise.all([api.getAttendanceRows(date), api.getAttendanceSummary(date)]);
      setRows(r);
      setSummary(s);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authenticated, date]);

  useEffect(() => {
    if (!isAdmin) return; // summary only loads via dashboard for users
    load();
  }, [load, isAdmin]);

  if (authLoading) return <div className="loading">Checking session…</div>;
  if (!isAdmin) return <div className="alert error">Only admins can manage attendance.</div>;

  const pie: PieSlice[] = summary
    ? slicesFromCounts(
        (["PRESENT", "ABSENT", "ON_LEAVE"] as const).map((s) => [
          s,
          s === "PRESENT" ? summary.present : s === "ABSENT" ? summary.absent : summary.onLeave,
        ] as [string, number]),
        COLOR
      )
    : [];

  async function mark(employeeId: number, status: AttendanceStatus) {
    setError(null);
    try {
      await api.markAttendance(employeeId, status, date);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <div className="subtitle">Mark employees present / absent / on leave for a day</div>
        </div>
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="pie-grid">
        <PieChart title="Attendance summary" data={pie} subtitle={date} />
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Mark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td className="cell-strong">{r.employeeName}</td>
                  <td className="cell-muted">{r.departmentName ?? "—"}</td>
                  <td>
                    <span className="badge" style={{ background: `${COLOR[r.status]}22`, color: COLOR[r.status] }}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div className="cell-actions">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          className={`btn small${r.status === s ? " approve" : ""}`}
                          onClick={() => mark(r.employeeId, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
