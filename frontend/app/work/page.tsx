"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import {
  api,
  HttpError,
  WorkDto,
  WorkFileInfo,
  WorkStatus,
  UserDto,
} from "@/lib/api";

const STATUS_BADGE: Record<WorkStatus, string> = {
  PENDING: "PENDING",
  IN_PROGRESS: "ON_LEAVE",
  COMPLETED: "APPROVED",
};

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="progress-row">
      <div className="progress-bar">
        <div className="fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-num">{percent}%</span>
    </div>
  );
}

export default function WorkPage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { user, isAdmin } = useAuth();
  const [work, setWork] = useState<WorkDto[]>([]);
  const [files, setFiles] = useState<Record<number, WorkFileInfo[]>>({});
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // create form (admin)
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<HttpError | null>(null);
  const [createForm, setCreateForm] = useState({ title: "", description: "", assignedToUserId: "", dueDate: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api.getWork();
      setWork(list);
      setUsers(isAdmin ? await api.getUsers() : []);
      const fileMap: Record<number, WorkFileInfo[]> = {};
      for (const w of list) {
        fileMap[w.id] = await api.getWorkFiles(w.id);
      }
      setFiles(fileMap);
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
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  async function handleCreate() {
    setSaving(true);
    setCreateError(null);
    if (!createForm.assignedToUserId) {
      setCreateError(new HttpError(400, "Select a user to assign this work to."));
      setSaving(false);
      return;
    }
    try {
      await api.createWork({
        title: createForm.title,
        description: createForm.description || undefined,
        assignedToUserId: Number(createForm.assignedToUserId),
        dueDate: createForm.dueDate || undefined,
      });
      setShowCreate(false);
      setCreateForm({ title: "", description: "", assignedToUserId: "", dueDate: "" });
      setNotice("Work assigned.");
      await load();
    } catch (err) {
      setCreateError(err as HttpError);
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(id: number, body: { status?: WorkStatus; progressPercent?: number }) {
    setError(null);
    try {
      await api.updateWorkProgress(id, body);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpload(id: number, file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await api.uploadWorkFile(id, file);
      setNotice(`File "${file.name}" uploaded.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this work assignment?")) return;
    setError(null);
    try {
      await api.deleteWork(id);
      setNotice("Work assignment deleted.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (authLoading) return <div className="loading">Checking session…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{isAdmin ? "Work Assignments" : "My Work"}</h1>
          <div className="subtitle">
            {isAdmin
              ? "Assign work, monitor progress and review uploads"
              : "Progress your assigned work and upload your results"}
          </div>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={() => { setShowCreate(true); setCreateError(null); }}>
            + Assign work
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : work.length === 0 ? (
        <div className="card empty-state">
          {isAdmin ? "No work assigned yet." : "No work assigned to you yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {work.map((w) => (
            <div key={w.id} className="card" style={{ padding: "18px 20px" }}>
              <div className="page-header" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{w.title}</div>
                  {w.description && <div className="cell-muted" style={{ fontSize: 13, marginTop: 4 }}>{w.description}</div>}
                  <div className="cell-muted" style={{ fontSize: 13, marginTop: 6 }}>
                    Assigned to <b>{w.assignedToEmployeeName}</b> ({w.assignedToUsername}) by {w.assignedByUsername}
                    {w.dueDate && <> · due {w.dueDate}</>}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[w.status]}`}>{w.status}</span>
              </div>

              <ProgressBar percent={w.progressPercent} />

              {/* --- User progress controls (assignee or admin) --- */}
              <div className="toolbar" style={{ marginTop: 14, marginBottom: 8 }}>
                {(isAdmin || w.assignedToUserId === user?.id) && (
                  <>
                    <span className="cell-muted">Mark progress:</span>
                    <button
                      className="btn small"
                      disabled={w.status === "PENDING"}
                      onClick={() => updateProgress(w.id, { status: "PENDING" })}
                    >
                      Pending
                    </button>
                    <button
                      className="btn small"
                      disabled={w.status === "IN_PROGRESS"}
                      onClick={() => updateProgress(w.id, { status: "IN_PROGRESS" })}
                    >
                      In progress
                    </button>
                    <button
                      className="btn small approve"
                      disabled={w.status === "COMPLETED"}
                      onClick={() => updateProgress(w.id, { status: "COMPLETED" })}
                    >
                      Completed
                    </button>
                    <input
                      type="number"
                      className="input"
                      style={{ width: 90 }}
                      min={0}
                      max={100}
                      defaultValue={w.progressPercent}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== w.progressPercent && v >= 0 && v <= 100) {
                          updateProgress(w.id, { progressPercent: v });
                        }
                      }}
                    />
                    <label className="btn small">
                      Upload file
                      <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) => handleUpload(w.id, e.target.files?.[0])}
                      />
                    </label>
                  </>
                )}
                {isAdmin && (
                  <button className="btn small danger" onClick={() => handleDelete(w.id)}>
                    Delete
                  </button>
                )}
              </div>

              {/* --- Uploaded files --- */}
              {(files[w.id] ?? []).length > 0 && (
                <div style={{ fontSize: 13 }}>
                  {(files[w.id] ?? []).map((f) => (
                    <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "4px 0" }}>
                      <a href={api.downloadUrl(f.id)} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                        📄 {f.originalName}
                      </a>
                      <span className="cell-muted">
                        {Math.round(f.sizeBytes / 1024) || "<1"} KB · {f.uploadedBy} · {f.uploadedAt.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign work</h2>
            </div>
            {createError && <div className="alert error">{createError.message}</div>}
            <div className="form-grid">
              <div className="field full">
                <label>Title *</label>
                <input
                  className="input"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>
              <div className="field full">
                <label>Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Assign to *</label>
                <select
                  className="input"
                  value={createForm.assignedToUserId}
                  onChange={(e) => setCreateForm({ ...createForm, assignedToUserId: e.target.value })}
                >
                  <option value="">— Select user —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role}){u.employeeName ? ` — ${u.employeeName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Due date</label>
                <input
                  className="input"
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
