"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { api, Department, Employee, HttpError, Role, UserDto } from "@/lib/api";

export default function UsersPage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { user: me, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<HttpError | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER" as Role,
    employeeId: "",
  });

  const load = useCallback(async () => {
    if (!authenticated || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [u, e, d] = await Promise.all([api.getUsers(), api.getEmployees(), api.getDepartments()]);
      setUsers(u);
      setEmployees(e);
      setDepartments(d);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authenticated, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  if (authLoading) return <div className="loading">Checking session…</div>;
  if (!isAdmin) return <div className="alert error">Only admins can manage user accounts.</div>;

  const employeeById = new Map(employees.map((e) => [e.id, e]));

  async function handleCreate() {
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.createUser({
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        employeeId: form.employeeId ? Number(form.employeeId) : undefined,
      });
      setShowForm(false);
      setForm({ username: "", email: "", password: "", role: "USER", employeeId: "" });
      setNotice(
        `Account "${created.username}" created — they can now sign in with the password you set.`
      );
      await load();
    } catch (err) {
      setFormError(err as HttpError);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(u: UserDto, role: Role) {
    setError(null);
    try {
      await api.updateUserRole(u.id, role);
      setNotice(`${u.username} is now ${role}.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(u: UserDto) {
    if (!confirm(`Delete the account "${u.username}"?`)) return;
    setError(null);
    try {
      await api.deleteUser(u.id);
      setNotice(`Account "${u.username}" deleted.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>User Accounts</h1>
          <div className="subtitle">
            Create logins for employees — an account is what lets someone sign in
          </div>
        </div>
        <button className="btn primary" onClick={() => { setShowForm(true); setFormError(null); }}>
          + Create account
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Linked employee</th>
                <th>Role</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.username}</td>
                  <td className="cell-muted">{u.email}</td>
                  <td>{u.employeeName ?? "—"}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: "4px 8px", fontSize: 12.5 }}
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? "You cannot change your own role" : ""}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>
                    <div className="cell-actions">
                      <button
                        className="btn small danger"
                        onClick={() => handleDelete(u)}
                        disabled={u.id === me?.id}
                        title={u.id === me?.id ? "You cannot delete your own account" : ""}
                      >
                        Delete
                      </button>
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
              <h2>Create user account</h2>
            </div>
            {formError && <div className="alert error">{formError.message}</div>}
            <div className="form-grid">
              <div className="field">
                <label>Username *</label>
                <input
                  className="input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Password * (min 6 chars)</label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Email *</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  <option value="USER">USER — requests leave, does assigned work</option>
                  <option value="ADMIN">ADMIN — full management access</option>
                </select>
              </div>
              <div className="field">
                <label>Link to employee</label>
                <select
                  className="input"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                >
                  <option value="">— None —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ·{" "}
                      {departments.find((d) => d.id === emp.department?.id)?.name ?? "no dept"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field full cell-muted" style={{ fontSize: 12.5 }}>
                Linking to an employee is what lets a USER request leave and see their own
                work and profile data.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating…" : "Create account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
