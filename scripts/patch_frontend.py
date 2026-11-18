import io

ROOT = r"C:/Users/user/.deepai-code/scratch/2026-11-16-create-an-hr-system-using-6a226fbb/frontend/"

def apply(path, replacements):
    p = ROOT + path
    s = io.open(p, encoding="utf8").read()
    for old, new in replacements:
        assert old in s, f"NOT FOUND in {path}: {old[:60]!r}"
        s = s.replace(old, new)
    io.open(p, "w", encoding="utf8", newline="").write(s)
    print("patched", path)

# --- employees page: auth guard + admin gating ---
apply("app/employees/page.tsx", [
    ('import {\n  api,',
     'import { useAuth, useRequireAuth } from "@/lib/auth";\nimport {\n  api,'),
    ('export default function EmployeesPage() {\n  const [employees',
     'export default function EmployeesPage() {\n  const { authenticated, loading: authLoading } = useRequireAuth();\n  const { isAdmin } = useAuth();\n  const [employees'),
    ('  const load = useCallback(async () => {\n    setLoading(true);',
     '  const load = useCallback(async () => {\n    if (!authenticated) return;\n    setLoading(true);'),
    ('  }, [search, deptFilter, statusFilter]);',
     '  }, [search, deptFilter, statusFilter, authenticated]);'),
    ('  return (\n    <>\n      <div className="page-header">\n        <div>\n          <h1>Employees</h1>',
     '  if (authLoading) return <div className="loading">Checking session…</div>;\n\n  return (\n    <>\n      <div className="page-header">\n        <div>\n          <h1>Employees</h1>'),
    ('        <button className="btn primary" onClick={openCreate}>\n          + Add employee\n        </button>',
     '        {isAdmin && (\n          <button className="btn primary" onClick={openCreate}>\n            + Add employee\n          </button>\n        )}'),
    ('                      <button className="btn small" onClick={() => openEdit(e)}>\n                        Edit\n                      </button>\n                      <button className="btn small danger" onClick={() => handleDelete(e)}>\n                        Delete\n                      </button>',
     '                      {isAdmin && (\n                        <>\n                          <button className="btn small" onClick={() => openEdit(e)}>\n                            Edit\n                          </button>\n                          <button className="btn small danger" onClick={() => handleDelete(e)}>\n                            Delete\n                          </button>\n                        </>\n                      )}'),
])

# --- departments page ---
apply("app/departments/page.tsx", [
    ('import { api, Department, HttpError } from "@/lib/api";',
     'import { useAuth, useRequireAuth } from "@/lib/auth";\nimport { api, Department, HttpError } from "@/lib/api";'),
    ('export default function DepartmentsPage() {\n  const [departments',
     'export default function DepartmentsPage() {\n  const { authenticated, loading: authLoading } = useRequireAuth();\n  const { isAdmin } = useAuth();\n  const [departments'),
    ('  const load = useCallback(async () => {\n    setLoading(true);',
     '  const load = useCallback(async () => {\n    if (!authenticated) return;\n    setLoading(true);'),
    ('  useEffect(() => {\n    load();\n  }, [load]);',
     '  useEffect(() => {\n    load();\n  }, [load]);\n\n  if (authLoading) return <div className="loading">Checking session…</div>;'),
    ('        <button className="btn primary" onClick={openCreate}>\n          + Add department\n        </button>',
     '        {isAdmin && (\n          <button className="btn primary" onClick={openCreate}>\n            + Add department\n          </button>\n        )}'),
    ('                      <button className="btn small" onClick={() => openEdit(d)}>\n                        Edit\n                      </button>\n                      <button className="btn small danger" onClick={() => handleDelete(d)}>\n                        Delete\n                      </button>',
     '                      {isAdmin && (\n                        <>\n                          <button className="btn small" onClick={() => openEdit(d)}>\n                            Edit\n                          </button>\n                          <button className="btn small danger" onClick={() => handleDelete(d)}>\n                            Delete\n                          </button>\n                        </>\n                      )}'),
])

# --- leave page ---
apply("app/leave/page.tsx", [
    ('import {\n  api,',
     'import { useAuth, useRequireAuth } from "@/lib/auth";\nimport {\n  api,'),
    ('export default function LeavePage() {\n  const [requests',
     'export default function LeavePage() {\n  const { authenticated, loading: authLoading } = useRequireAuth();\n  const { user, isAdmin } = useAuth();\n  const [requests'),
    ('  const load = useCallback(async () => {\n    setLoading(true);',
     '  const load = useCallback(async () => {\n    if (!authenticated) return;\n    setLoading(true);'),
    ('  }, [statusFilter]);\n\n  useEffect(() => {\n    load();\n  }, [load]);',
     '  }, [statusFilter, authenticated]);\n\n  useEffect(() => {\n    load();\n  }, [load]);\n\n  if (authLoading) return <div className="loading">Checking session…</div>;'),
    ('''                          <button
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
                          </button>''',
     '''                          {isAdmin && (
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
                          )}'''),
    ('''                  <option value="">— Select —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </option>
                  ))}''',
     '''                  {isAdmin && <option value="">— Select —</option>}
                  {employees
                    .filter((emp) => isAdmin || emp.id === user?.employeeId)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.email})
                      </option>
                    ))}'''),
    ('''    setForm({
      employeeId: employees[0] ? String(employees[0].id) : "",''',
     '''    setForm({
      employeeId: isAdmin
        ? (employees[0] ? String(employees[0].id) : "")
        : user?.employeeId != null
        ? String(user.employeeId)
        : "",'''),
])
print("ALL OK")
