// Shared API client + domain types matching the Spring Boot backend

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";
export type LeaveType = "VACATION" | "SICK" | "UNPAID" | "PARENTAL" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type WorkStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "ON_LEAVE";
export type Role = "ADMIN" | "USER";
export type ApplicationStatus = "INTERVIEW_SCHEDULED" | "IN_REVIEW" | "HIRED" | "REJECTED";
export type ApplicationFileCategory = "CV" | "CERTIFICATE" | "OTHER";

export interface Department {
  id: number;
  name: string;
  location?: string | null;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  salary?: number | null;
  hireDate: string; // yyyy-MM-dd
  status: EmployeeStatus;
  department?: Department | null;
}

export interface LeaveRequest {
  id: number;
  employee: Employee;
  type: LeaveType;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  reason?: string | null;
  status: LeaveStatus;
  requestedAt: string;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
  role: Role;
  employeeId: number | null;
  employeeName: string | null;
  hasProfilePicture: boolean;
}

export interface WorkDto {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: WorkStatus;
  progressPercent: number;
  assignedToUserId: number;
  assignedToUsername: string;
  assignedToEmployeeName: string;
  assignedByUsername: string;
}

export interface WorkFileInfo {
  id: number;
  originalName: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  assignmentId: number;
}

export interface AttendanceRow {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  onLeave: number;
}

export interface ApplicationFileInfo {
  id: number;
  category: ApplicationFileCategory;
  originalName: string;
  contentType: string | null;
  sizeBytes: number;
}

export interface JobApplicationDto {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  coverLetter: string | null;
  status: ApplicationStatus;
  interviewDateTime: string;
  appliedAt: string;
  files: ApplicationFileInfo[];
}

export class HttpError extends Error {
  fieldErrors?: Record<string, string>;
  status: number;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    headers: init?.body && !isFormData ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let fieldErrors: Record<string, string> | undefined;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      if (body?.fieldErrors) fieldErrors = body.fieldErrors;
    } catch {
      /* ignore body parse errors */
    }
    throw new HttpError(res.status, message, fieldErrors);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ---- auth ----
  login: (username: string, password: string) =>
    request<UserDto>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<UserDto>("/auth/me"),

  // ---- departments ----
  getDepartments: () => request<Department[]>("/departments"),
  createDepartment: (d: Partial<Department>) =>
    request<Department>("/departments", { method: "POST", body: JSON.stringify(d) }),
  updateDepartment: (id: number, d: Partial<Department>) =>
    request<Department>(`/departments/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteDepartment: (id: number) => request<void>(`/departments/${id}`, { method: "DELETE" }),
  headcount: (id: number) => request<number>(`/departments/${id}/headcount`),

  // ---- employees ----
  getEmployees: (params: { q?: string; departmentId?: number; status?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.departmentId) search.set("departmentId", String(params.departmentId));
    if (params.status) search.set("status", params.status);
    const qs = search.toString();
    return request<Employee[]>(`/employees${qs ? `?${qs}` : ""}`);
  },
  createEmployee: (e: Partial<Employee>) =>
    request<Employee>("/employees", { method: "POST", body: JSON.stringify(e) }),
  updateEmployee: (id: number, e: Partial<Employee>) =>
    request<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(e) }),
  deleteEmployee: (id: number) => request<void>(`/employees/${id}`, { method: "DELETE" }),

  // ---- leave requests ----
  getLeaveRequests: (params: { employeeId?: number; status?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.employeeId) search.set("employeeId", String(params.employeeId));
    if (params.status) search.set("status", params.status);
    const qs = search.toString();
    return request<LeaveRequest[]>(`/leave-requests${qs ? `?${qs}` : ""}`);
  },
  createLeaveRequest: (l: {
    employee: { id: number };
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => request<LeaveRequest>("/leave-requests", { method: "POST", body: JSON.stringify(l) }),
  decideLeave: (id: number, decision: "APPROVED" | "REJECTED") =>
    request<LeaveRequest>(`/leave-requests/${id}/decision?decision=${decision}`, { method: "PUT" }),
  cancelLeave: (id: number) =>
    request<LeaveRequest>(`/leave-requests/${id}/cancel`, { method: "PUT" }),

  // ---- work assignments ----
  getWork: () => request<WorkDto[]>("/work"),
  createWork: (w: { title: string; description?: string; assignedToUserId: number; dueDate?: string }) =>
    request<WorkDto>("/work", { method: "POST", body: JSON.stringify(w) }),
  deleteWork: (id: number) => request<void>(`/work/${id}`, { method: "DELETE" }),
  updateWorkProgress: (id: number, p: { status?: WorkStatus; progressPercent?: number }) =>
    request<WorkDto>(`/work/${id}/progress`, { method: "PUT", body: JSON.stringify(p) }),
  getWorkFiles: (id: number) => request<WorkFileInfo[]>(`/work/${id}/files`),
  uploadWorkFile: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<WorkFileInfo>(`/work/${id}/files`, { method: "POST", body: fd });
  },
  downloadUrl: (fileId: number) => `/api/work/files/${fileId}/download`,

  // ---- attendance ----
  getAttendanceSummary: (date?: string) =>
    request<AttendanceSummary>(`/attendance/summary${date ? `?date=${date}` : ""}`),
  getAttendanceRows: (date?: string) =>
    request<AttendanceRow[]>(`/attendance${date ? `?date=${date}` : ""}`),
  markAttendance: (employeeId: number, status: AttendanceStatus, date?: string) => {
    const search = new URLSearchParams({ employeeId: String(employeeId), status });
    if (date) search.set("date", date);
    return request<AttendanceRow>(`/attendance?${search.toString()}`, { method: "POST" });
  },

  // ---- users / profile ----
  getUsers: () => request<UserDto[]>("/users"),
  createUser: (u: { username: string; email: string; password: string; role?: string; employeeId?: number }) =>
    request<UserDto>("/users", { method: "POST", body: JSON.stringify(u) }),
  updateUserRole: (id: number, role: Role) =>
    request<UserDto>(`/users/${id}/role?role=${role}`, { method: "PUT" }),
  deleteUser: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),
  uploadProfilePicture: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<UserDto>("/users/me/picture", { method: "POST", body: fd });
  },
  pictureUrl: (userId: number | null | undefined) =>
    userId != null ? `/api/users/${userId}/picture` : null,
};

export const applications = {
  submit: (form: {
    fullName: string;
    email: string;
    phone?: string;
    position: string;
    coverLetter?: string;
    cv: File;
    certificates?: File[];
    documents?: File[];
  }) => {
    const fd = new FormData();
    fd.append("fullName", form.fullName);
    fd.append("email", form.email);
    if (form.phone) fd.append("phone", form.phone);
    fd.append("position", form.position);
    if (form.coverLetter) fd.append("coverLetter", form.coverLetter);
    fd.append("cv", form.cv);
    for (const f of form.certificates ?? []) fd.append("certificates", f);
    for (const f of form.documents ?? []) fd.append("documents", f);
    return request<JobApplicationDto>("/applications", { method: "POST", body: fd });
  },
  list: () => request<JobApplicationDto[]>("/applications"),
  updateStatus: (id: number, status: ApplicationStatus) =>
    request<JobApplicationDto>(`/applications/${id}/status?status=${status}`, { method: "PUT" }),
  fileDownloadUrl: (fileId: number) => `/api/applications/files/${fileId}/download`,
};

export function fullName(e: Employee): string {
  return `${e.firstName} ${e.lastName}`;
}
