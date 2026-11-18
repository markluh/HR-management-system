"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import {
  api,
  Department,
  Employee,
  EmployeeStatus,
  HttpError,
} from "@/lib/api";

const STATUSES: (EmployeeStatus | "")[] = ["", "ACTIVE", "ON_LEAVE", "TERMINATED"];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  salary: string;
  hireDate: string;
  status: EmployeeStatus;
  departmentId: string;
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  salary: "",
  hireDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
  departmentId: "",
};

export default function EmployeesPage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<HttpError | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [e, d] = await Promise.all([
        api.getEmployees({
          q: search.trim() || undefined,
          departmentId: deptFilter ? Number(deptFilter) : undefined,
          status: statusFilter || undefined,
        }),
        api.getDepartments(),
      ]);
      setEmployees(e);
      setDepartments(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, statusFilter, authenticated]);

  // Debounced reload on filter change
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const deptName = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(e: Employee) {
    setEditingId(e.id);
    setForm({
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone ?? "",
      jobTitle: e.jobTitle ?? "",
      salary: e.salary != null ? String(e.salary) : "",
      hireDate: e.hireDate,
      status: e.status,
      departmentId: e.department?.id ? String(e.department.id) : "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    const payload: Partial<Employee> = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || null,
      jobTitle: form.jobTitle || null,
      salary: form.salary ? Number(form.salary) : null,
      hireDate: form.hireDate,
      status: form.status,
      department: form.departmentId ? { id: Number(form.departmentId), name: "" } : null,
    };
    try {
      if (editingId == null) {
        await api.createEmployee(payload);
        setNotice("Employee created.");
      } else {
        await api.updateEmployee(editingId, payload);
        setNotice("Employee updated.");
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err as HttpError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: Employee) {
    if (!confirm(`Delete ${e.firstName} ${e.lastName}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.deleteEmployee(e.id);
      setNotice("Employee deleted.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  if (authLoading) return <div className="loading">Checking session…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <div className="subtitle">{employees.length} employee(s)</div>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={openCreate}>
            + Add employee
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="toolbar">
        <input
          className="input"
          style={{ width: 240 }}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="empty-state">No employees match the current filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Job title</th>
                <th>Department</th>
                <th>Salary</th>
                <th>Hired</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="cell-strong">
                    {e.firstName} {e.lastName}
                  </td>
                  <td className="cell-muted">{e.email}</td>
                  <td>{e.jobTitle ?? "—"}</td>
                  <td>{e.department ? deptName.get(e.department.id) ?? e.department.name : "—"}</td>
                  <td>{e.salary != null ? `KSh ${Number(e.salary).toLocaleString()}` : "—"}</td>
                  <td className="cell-muted">{e.hireDate}</td>
                  <td>
                    <span className={`badge ${e.status}`}>{e.status}</span>
                  </td>
                  <td>
                    <div className="cell-actions">
                      {isAdmin && (
                        <>
                          <button className="btn small" onClick={() => openEdit(e)}>
                            Edit
                          </button>
                          <button className="btn small danger" onClick={() => handleDelete(e)}>
                            Delete
                          </button>
                        </>
                      )}
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
              <h2>{editingId == null ? "Add employee" : "Edit employee"}</h2>
            </div>
            {formError && <div className="alert error">{formError.message}</div>}
            <div className="form-grid">
              <div className="field">
                <label>First name *</label>
                <input
                  className="input"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                {formError?.fieldErrors?.firstName && (
                  <div className="field-error">{formError.fieldErrors.firstName}</div>
                )}
              </div>
              <div className="field">
                <label>Last name *</label>
                <input
                  className="input"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
                {formError?.fieldErrors?.lastName && (
                  <div className="field-error">{formError.fieldErrors.lastName}</div>
                )}
              </div>
              <div className="field full">
                <label>Email *</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {formError?.fieldErrors?.email && (
                  <div className="field-error">{formError.fieldErrors.email}</div>
                )}
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Job title</label>
                <input
                  className="input"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Salary</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Hire date *</label>
                <input
                  className="input"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeStatus })}
                >
                  {(["ACTIVE", "ON_LEAVE", "TERMINATED"] as EmployeeStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Department</label>
                <select
                  className="input"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
