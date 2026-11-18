"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import BarChart, { Bar } from "@/components/BarChart";
import { api, Department, HttpError } from "@/lib/api";

interface FormState {
  name: string;
  location: string;
}

const emptyForm: FormState = { name: "", location: "" };

export default function DepartmentsPage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { isAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [headcounts, setHeadcounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      const list = await api.getDepartments();
      setDepartments(list);
      const entries = await Promise.all(
        list.map(async (d) => {
          try {
            return [d.id, await api.headcount(d.id)] as const;
          } catch {
            return [d.id, 0] as const;
          }
        })
      );
      setHeadcounts(Object.fromEntries(entries));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading) return <div className="loading">Checking session…</div>;

  // Compare departments by active headcount
  const deptBars: Bar[] = useMemo(
    () =>
      departments.map((d) => ({
        label: d.name,
        value: headcounts[d.id] ?? 0,
      })),
    [departments, headcounts]
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(d: Department) {
    setEditingId(d.id);
    setForm({ name: d.name, location: d.location ?? "" });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editingId == null) {
        await api.createDepartment({ name: form.name, location: form.location || null });
        setNotice("Department created.");
      } else {
        await api.updateDepartment(editingId, { name: form.name, location: form.location || null });
        setNotice("Department updated.");
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err as HttpError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: Department) {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    setError(null);
    try {
      await api.deleteDepartment(d.id);
      setNotice("Department deleted.");
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <div className="subtitle">{departments.length} department(s)</div>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={openCreate}>
            + Add department
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="dept-layout">
        <BarChart
          title="Departments compared"
          data={deptBars}
          subtitle="Active headcount per department"
        />
        <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : departments.length === 0 ? (
          <div className="empty-state">No departments yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Active headcount</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="cell-strong">{d.name}</td>
                  <td className="cell-muted">{d.location ?? "—"}</td>
                  <td>{headcounts[d.id] ?? 0}</td>
                  <td>
                    <div className="cell-actions">
                      {isAdmin && (
                        <>
                          <button className="btn small" onClick={() => openEdit(d)}>
                            Edit
                          </button>
                          <button className="btn small danger" onClick={() => handleDelete(d)}>
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
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId == null ? "Add department" : "Edit department"}</h2>
            </div>
            {formError && <div className="alert error">{formError.message}</div>}
            <div className="form-grid">
              <div className="field">
                <label>Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {formError?.fieldErrors?.name && (
                  <div className="field-error">{formError.fieldErrors.name}</div>
                )}
              </div>
              <div className="field">
                <label>Location</label>
                <input
                  className="input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
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
