"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import {
  api,
  ApplicationFileInfo,
  applications as applicationsApi,
  ApplicationStatus,
  JobApplicationDto,
} from "@/lib/api";

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  INTERVIEW_SCHEDULED: "PENDING",
  IN_REVIEW: "ON_LEAVE",
  HIRED: "APPROVED",
  REJECTED: "REJECTED",
};

const CATEGORY_LABEL: Record<ApplicationFileInfo["category"], string> = {
  CV: "CV",
  CERTIFICATE: "Certificate",
  OTHER: "Document",
};

export default function ApplicationsPage() {
  const { authenticated, loading: authLoading } = useRequireAuth();
  const { isAdmin } = useAuth();
  const [list, setList] = useState<JobApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobApplicationDto | null>(null);

  const load = useCallback(async () => {
    if (!authenticated || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      setList(await applicationsApi.list());
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

  if (authLoading) return <div className="loading">Checking session…</div>;
  if (!isAdmin) return <div className="alert error">Only admins can review job applications.</div>;

  async function setStatus(id: number, status: ApplicationStatus) {
    setError(null);
    try {
      await applicationsApi.updateStatus(id, status);
      setNotice(`Application #${id} marked ${status.replace("_", " ").toLowerCase()}.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function fmt(date: string) {
    return new Date(date).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Job Applications</h1>
          <div className="subtitle">
            {list.length} application(s) — interviews are scheduled automatically at submission
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            No applications yet. Candidates can apply from the “Apply for a job” page — no account needed.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Position</th>
                <th>Documents</th>
                <th>Interview (auto-scheduled)</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-strong">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelected(a);
                        }}
                        style={{ color: "var(--primary)" }}
                      >
                        {a.fullName}
                      </a>
                    </div>
                    <div className="cell-muted" style={{ fontSize: 12 }}>
                      {a.email}
                      {a.phone ? ` · ${a.phone}` : ""}
                    </div>
                  </td>
                  <td>{a.position}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {a.files.map((f) => (
                        <a
                          key={f.id}
                          href={applicationsApi.fileDownloadUrl(f.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="badge"
                          style={{ background: "rgba(102, 252, 241, 0.12)", color: "#66fcf1" }}
                          title={`${f.originalName} · ${Math.max(1, Math.round(f.sizeBytes / 1024))} KB`}
                        >
                          {CATEGORY_LABEL[f.category]} 📄
                        </a>
                      ))}
                      {a.files.length === 0 && <span className="cell-muted">—</span>}
                    </div>
                  </td>
                  <td className="cell-muted">{fmt(a.interviewDateTime)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[a.status]}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn small approve" onClick={() => setStatus(a.id, "HIRED")}>
                        Hire
                      </button>
                      <button className="btn small" onClick={() => setStatus(a.id, "IN_REVIEW")}>
                        Review
                      </button>
                      <button className="btn small danger" onClick={() => setStatus(a.id, "REJECTED")}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.fullName}</h2>
              <div className="cell-muted" style={{ marginTop: 4, paddingBottom: 8 }}>
                Applying for <b>{selected.position}</b> · applied{" "}
                {selected.appliedAt.slice(0, 10)}
              </div>
            </div>
            <div style={{ padding: "0 20px 8px" }}>
              <div style={{ marginBottom: 8 }}>
                <span className={`badge ${STATUS_BADGE[selected.status]}`}>
                  {selected.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Interview:</b> {fmt(selected.interviewDateTime)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Contact:</b> {selected.email}
                {selected.phone ? ` · ${selected.phone}` : ""}
              </div>
              <b>Documents</b>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 10px" }}>
                {selected.files.map((f) => (
                  <a
                    key={f.id}
                    href={applicationsApi.fileDownloadUrl(f.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn small"
                  >
                    {CATEGORY_LABEL[f.category]}: {f.originalName}
                  </a>
                ))}
                {selected.files.length === 0 && <span className="cell-muted">none attached</span>}
              </div>
              <b>Cover letter</b>
              <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>
                {selected.coverLetter ?? "—"}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
