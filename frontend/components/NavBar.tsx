"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/", label: "Dashboard", always: true },
  { href: "/employees", label: "Employees", always: true },
  { href: "/departments", label: "Departments", always: true },
  { href: "/leave", label: "Leave Requests", always: true },
  { href: "/work", label: "Work", always: true },
  { href: "/attendance", label: "Attendance", adminOnly: true },
  { href: "/profile", label: "Profile", always: true },
  { href: "/applications", label: "Applications", adminOnly: true },
  { href: "/users", label: "User Accounts", adminOnly: true },
];

const publicLinks = [{ href: "/apply", label: "Apply for a job", always: true }];

export default function NavBar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const alwaysVisiblePublic = !user;

  const visible = alwaysVisiblePublic
    ? publicLinks
    : links.filter((l) => l.always || (l.adminOnly && isAdmin));

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        HR System
      </Link>
      <nav className="nav">{visible.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
          {l.label}
        </Link>
      ))}</nav>
      <div className="topbar-right">
        {user ? (
          <>
            {user.employeeName && <span className="cell-muted">Signed in as {user.employeeName} ({user.role})</span>}
            {!user.employeeName && <span className="cell-muted">Signed in as {user.username} ({user.role})</span>}
            <button className="btn small" onClick={() => logout()}>
              Logout
            </button>
          </>
        ) : (
          <Link className="btn primary small" href="/login">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
