"use client";

import { useState } from "react";
import Link from "next/link";
import { applications, HttpError, JobApplicationDto } from "@/lib/api";

export default function ApplyPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    position: "",
    coverLetter: "",
  });
  const [cv, setCv] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<JobApplicationDto | null>(null);

  function validate(): string | null {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!form.email.trim() || !form.email.includes("@")) return "A valid email is required.";
    if (!form.position.trim()) return "Desired position is required.";
    if (!cv) return "Please attach your CV.";
    if (cv && !/\.(pdf|doc|docx)$/i.test(cv.name)) {
      return "The CV must be a PDF or Word document (.pdf, .doc, .docx).";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate();
    if (validation) {
      setFieldError(validation);
      return;
    }
    if (!cv) return; // ensured by validate()
    setFieldError(null);
    setError(null);
    setBusy(true);
    try {
      const saved = await applications.submit({
        ...form,
        cv,
        certificates: certificates.length ? certificates : undefined,
        documents: documents.length ? documents : undefined,
      });
      setResult(saved);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Could not submit application. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  function fmt(date: string) {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (result) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <h1>Application received 🎉</h1>
          <p className="cell-muted">Thank you, {result.fullName}. Your application for <b>{result.position}</b> has been submitted.</p>
          <div className="alert success" style={{ marginTop: 16 }}>
            <b>Interview automatically scheduled:</b> {fmt(result.interviewDateTime)}
          </div>
          <p className="cell-muted" style={{ fontSize: 13 }}>
            Please make sure you bring your documents. Our HR team will contact you at {result.email}.
          </p>
          <div className="modal-footer" style={{ padding: "16px 0 0", justifyContent: "flex-start" }}>
            <Link className="btn primary" href="/">
              Back to home
            </Link>
            <button className="btn" onClick={() => setResult(null)}>
              Submit another application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Apply for a job</h1>
          <div className="subtitle">
            Submit your application — interviews are scheduled automatically once your
            application comes in.
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {fieldError && <div className="alert error">{fieldError}</div>}

      <form className="card" style={{ maxWidth: 640, padding: 24 }} onSubmit={handleSubmit}>
        <div className="form-grid" style={{ padding: 0 }}>
          <div className="field">
            <label>Full name *</label>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Email *</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
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
            <label>Desired position *</label>
            <input
              className="input"
              placeholder="e.g. Backend Developer"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              required
            />
          </div>
          <div className="field full">
            <label>Cover letter</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Tell us why you are a great fit…"
              value={form.coverLetter}
              onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
            />
          </div>
          <div className="field">
            <label>CV * (PDF / Word)</label>
            <input
              className="input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
            />
            {cv && <span className="cell-muted" style={{ fontSize: 12 }}>{cv.name}</span>}
          </div>
          <div className="field">
            <label>Certificates (multiple allowed)</label>
            <input
              className="input"
              type="file"
              multiple
              onChange={(e) => setCertificates(Array.from(e.target.files ?? []))}
            />
            {certificates.length > 0 && (
              <span className="cell-muted" style={{ fontSize: 12 }}>
                {certificates.map((f) => f.name).join(", ")}
              </span>
            )}
          </div>
          <div className="field full">
            <label>Other required / supporting documents</label>
            <input
              className="input"
              type="file"
              multiple
              onChange={(e) => setDocuments(Array.from(e.target.files ?? []))}
            />
            {documents.length > 0 && (
              <span className="cell-muted" style={{ fontSize: 12 }}>
                {documents.map((f) => f.name).join(", ")}
              </span>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: "16px 0 0", justifyContent: "flex-start" }}>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </form>
    </>
  );
}
