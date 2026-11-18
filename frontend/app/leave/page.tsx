"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import BarChart, { Bar } from "@/components/BarChart";
import {
  api,
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  HttpError,
} from "@/lib/api";

const TYPES: LeaveType[] = ["VACATION", "SICK", "UNPAID", "PARENTAL", "OTHER"];
const STATUS_FILTERS: (LeaveStatus | "")[] = ["", "PENDING", "APPROVED", "REJECTED"];

export default function LeavePage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<HttpError | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    type: "VACATION" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
  });

  const load = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [leaves, emps] = await Promise.all([
        api.getLeaveRequests({ status: statusFilter || undefined }),
        api.getEmployees({ status: "ACTIVE" }),
      ]);
      setRequests(leaves);
      setEmployees(emps);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, authenticated]);

  useEffect(() => {
    load();
  }, [load]);

  // Compare leave volume across the last 8 weeks (by targeted start date)
  const weeklyBars: Bar[] = useMemo(() => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7)); // start of current week
    const bars: Bar[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - 7 * i);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const value = requests.filter((r) => {
        const d = new Date(`${r.startDate}T00:00:00`);
        return d >= start && d <= end;
      }).length;
      bars.push({
        label: i === 0 ? "This week" : start.toISOString().slice(5, 10),
        value,
      });
    }
    return bars;
  }, [requests]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      await api.createLeaveRequest({
        employee: { id: Number(form.employeeId) },
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      setShowForm(false);
      setNotice("Leave request submitted (status: PENDING).");
      await load();
    } catch (err) {
      setFormError(err as HttpError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDecision(id: number, decision: "APPROVED" | "REJECTED") {
    setError(null);
    try {
      await api.decideLeave(id, decision);
      setNotice(`Request #${id} ${decision.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm(`Cancel leave request #${id}?`)) return;
    setError(null);
    try {
      await api.cancelLeave(id);
      setNotice(`Request #${id} cancelled.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openCreate() {
    setForm({
      employeeId: isAdmin
        ? (employees[0] ? String(employees[0].id) : "")
        : user?.employeeId != null
        ? String(user.employeeId)
        : "",
      type: "VACATION",
      startDate: "",
      endDate: "",
      reason: "",
    });
    setFormError(null);
    setShowForm(true);
  }

  if (authLoading) return <div className="loading">Checking session…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leave Requests</h1>
          <div className="subtitle">{requests.length} request(s)</div>
        </div>
        <button className="btn primary" onClick={openCreate} disabled={employees.length === 0}>
          + New request
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="toolbar">
        <span className="cell-muted">Status:</span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`btn small ${statusFilter === s ? "primary" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="pie-grid">
        <BarChart
          title="Leave applications per week"
          data={weeklyBars}
          subtitle="Last 8 weeks, by requested start date"
        />
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">No leave requests found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((l) => (
                <tr key={l.id}>
                  <td className="cell-strong">
                    {l.employee.firstName} {l.employee.lastName}
                    <span className="cell-muted" style={{ fontWeight: 400 }}>
                      {" "}
                      · {l.employee.email}
                    </span>
                  </td>
                  <td>{l.type}</td>
                  <td className="cell-muted">
                    {l.startDate} → {l.endDate}
                  </td>
                  <td className="cell-muted">{l.reason ?? "—"}</td>
                  <td>
                    <span className={`badge ${l.status}`}>{l.status}</span>
                  </td>
                  <td>
                    <div className="cell-actions">
                      {l.status === "PENDING" && (
                        <>
                          {isAdmin && (
                            <>
                              <button
                                className="btn small approve"
                                onClick={() => handleDecision(l.id, "APPROVED")}
                              >
                                Approve
                              </button>
                              <button
                                className="btn small danger"
                                onClick={() => handleDecision(l.id, "REJECTED")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button className="btn small" onClick={() => handleCancel(l.id)}>
                            Cancel
                          </button>
                        </>
                      )}
                      {l.status !== "PENDING" && <span className="cell-muted">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New leave request</h2>
            </div>
            {formError && <div className="alert error">{formError.message}</div>}
            <div className="form-grid">
              <div className="field full">
                <label>Employee *</label>
                <select
                  className="input"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                >
                  {isAdmin && <option value="">— Select —</option>}
                  {employees
                    .filter((emp) => isAdmin || emp.id === user?.employeeId)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label>Type *</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Reason</label>
                <input
                  className="input"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Start date *</label>
                <input
                  className="input"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>End date *</label>
                <input
                  className="input"
                  type="date"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
