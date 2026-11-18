"use client";

import { useEffect, useState } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { api, HttpError, LeaveRequest, UserDto, WorkDto } from "@/lib/api";

export default function ProfilePage() {
  const { refresh } = useAuth();
  const { user, loading: authLoading } = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [work, setWork] = useState<WorkDto[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leavesLabel, setLeavesLabel] = useState("My leave applications");
  const [me, setMe] = useState<UserDto | null>(null);
  const [pictureKey, setPictureKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.me().then(setMe).catch((err) => setError((err as Error).message));
    api
      .getWork()
      .then(setWork)
      .catch((err) => setError((err as Error).message));
    // Admin without a linked employee sees all leave applications as an overview
    user.employeeId == null
      ? api
          .getLeaveRequests()
          .then(setLeaves)
          .then(() => setLeavesLabel("All leave applications (admin overview)"))
          .catch((err) => setError((err as Error).message))
      : api
          .getLeaveRequests({ employeeId: user.employeeId })
          .then(setLeaves)
          .catch((err) => setError((err as Error).message));
  }, [user?.hasProfilePicture, user]);

  if (authLoading) return <div className="loading">Checking session…</div>;
  if (authLoading) return <div className="loading">Checking session…</div>;
  if (!me) return null;

  const avatarUrl = api.pictureUrl(me.id);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await api.uploadProfilePicture(file);
      setMe(updated);
      setPictureKey((k) => k + 1); // bust <img> cache
      setNotice("Profile picture updated.");
      await refresh();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "Upload failed.");
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <div className="subtitle">Your account details</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="card" style={{ padding: 24, maxWidth: 560 }}>
        <div className="avatar-row" style={{ marginBottom: 20 }}>
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={pictureKey}
              src={avatarUrl}
              alt={`${me.username} avatar`}
              className="avatar profile"
            />
          )}
          <div>
            <label className="btn small">
              Change profile picture
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
            <div className="cell-muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              JPG, PNG, GIF or WEBP — max 5 MB. A default avatar is shown if none is uploaded.
            </div>
            {me.hasProfilePicture && (
              <div className="cell-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                A custom picture is set.
              </div>
            )}
          </div>
        </div>

        <table style={{ fontSize: 14 }}>
          <tbody>
            <tr>
              <td className="cell-muted" style={{ width: 140, paddingLeft: 0 }}>Username</td>
              <td className="cell-strong">{me.username}</td>
            </tr>
            <tr>
              <td className="cell-muted" style={{ paddingLeft: 0 }}>Email</td>
              <td>{me.email}</td>
            </tr>
            <tr>
              <td className="cell-muted" style={{ paddingLeft: 0 }}>Role</td>
              <td>
                <span className={`badge ${me.role === "ADMIN" ? "ACTIVE" : "ON_LEAVE"}`}>{me.role}</span>
              </td>
            </tr>
            <tr>
              <td className="cell-muted" style={{ paddingLeft: 0 }}>Linked employee</td>
              <td>{me.employeeName ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!error && (
        <>
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Work
          </h2>
          <div className="stats-grid">
            <div className="card stat">
              <div className="value">
                {work.filter((w) => w.status === "COMPLETED").length}
              </div>
              <div className="label">Tasks completed</div>
            </div>
            <div className="card stat">
              <div className="value">
                {work.filter((w) => w.status === "IN_PROGRESS").length}
              </div>
              <div className="label">In progress</div>
            </div>
            <div className="card stat">
              <div className="value">{work.filter((w) => w.status === "PENDING").length}</div>
              <div className="label">Pending</div>
            </div>
            <div className="card stat">
              <div className="value">{work.length}</div>
              <div className="label">Total assigned</div>
            </div>
          </div>

          <h2 className="section-title" style={{ marginTop: 8 }}>
            {leavesLabel}
          </h2>
          <div className="card table-wrap">
            {leaves.length === 0 ? (
              <div className="empty-state">No leave applications on record.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    {me.employeeId == null && <th>Employee</th>}
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id}>
                      {me.employeeId == null && (
                        <td className="cell-strong">
                          {l.employee.firstName} {l.employee.lastName}
                        </td>
                      )}
                      <td>{l.type}</td>
                      <td className="cell-muted">
                        {l.startDate} → {l.endDate}
                      </td>
                      <td className="cell-muted">{l.reason ?? "—"}</td>
                      <td>
                        <span className={`badge ${l.status}`}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
