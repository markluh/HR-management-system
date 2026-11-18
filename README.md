# HR System

A full-stack HR management application built with Spring Boot and Next.js.

- **Backend:** Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA
- **Frontend:** Next.js 16, React 19, TypeScript
- **Database:** H2 in-memory database
- **File storage:** Local files under `uploads/`

## Features

- Employee and department management
- Role-based authentication for `ADMIN` and `USER` accounts
- Leave requests, cancellation, approval, and rejection
- Work assignments, progress updates, and file attachments
- Daily attendance tracking and dashboard summaries
- Employee profile picture uploads
- Public job applications with CV, certificate, and document uploads
- Recruiter application review and status management
- Dashboard charts for departments, leave status, and attendance
- Search and filtering across employees and leave requests

## Project structure

```text
.
├── src/main/java/com/example/hr/  Spring Boot application
│   ├── controller/                REST endpoints
│   ├── entity/                    JPA entities and enums
│   ├── repository/                Spring Data repositories
│   ├── service/                   Business logic
│   ├── security/                  Authentication and authorization
│   └── exception/                 API error handling
├── src/main/resources/
│   ├── application.yml            Backend configuration
│   └── data.sql                   Seed data
├── frontend/                      Next.js application
│   ├── app/                       Pages and layouts
│   ├── components/                Shared UI components
│   └── lib/                       API client and auth context
├── uploads/                       Runtime work and application files
├── pom.xml                        Maven configuration
└── target/                        Maven build output
```

## Prerequisites

- Java 21 or newer
- Maven 3.9 or newer
- Node.js 20 or newer
- npm

Verify the tools:

```powershell
java -version
mvn -version
node --version
npm --version
```

## Quick start

Open two terminals from the project root.

### 1. Start the backend

```powershell
mvn spring-boot:run
```

The API is available at `http://localhost:8080`.

The database is in-memory and is recreated on each backend restart. H2 data is seeded from `src/main/resources/data.sql`, and users are created by `DataInitializer`.

H2 console:

- URL: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:hrdb`
- Username: `sa`
- Password: leave empty

### 2. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

The Next.js development server proxies requests from `/api/*` to `http://localhost:8080/api/*`, so the frontend and backend do not require separate CORS configuration.

## Demo accounts

All seeded accounts use the passwords below.

| Username | Password | Role | Linked employee |
|---|---|---|---|
| `admin` | `admin123` | `ADMIN` | None |
| `bob` | `bob123` | `USER` | Bob Kruger |
| `carla` | `carla123` | `USER` | Carla Diaz |
| `farid` | `farid123` | `USER` | Farid Aziz |

`ADMIN` accounts can manage employees, departments, users, leave decisions, attendance, work assignments, and applications. `USER` accounts can manage their own profile, leave, and assigned work according to the API authorization rules.

## Frontend pages

| Route | Purpose |
|---|---|
| `/` | HR dashboard and summary charts |
| `/login` | User sign-in |
| `/employees` | Employee directory and employee management |
| `/departments` | Department management |
| `/leave` | Leave requests and decisions |
| `/work` | Work assignments and progress |
| `/attendance` | Daily attendance management |
| `/applications` | Job application review |
| `/apply` | Public job application form |
| `/users` | User account management |
| `/profile` | Current user profile and avatar |

## API overview

Authentication:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/auth/me` | Get the current user |

Main resources:

| Resource | Endpoints |
|---|---|
| Departments | `/api/departments` |
| Employees | `/api/employees` |
| Leave requests | `/api/leave-requests` |
| Work assignments | `/api/work` |
| Attendance | `/api/attendance` |
| User accounts | `/api/users` |
| Job applications | `/api/applications` |

The API uses JSON for regular requests and multipart form data for profile pictures, work files, and job application attachments.

### Employee API example

```http
POST /api/employees
Content-Type: application/json

{
  "firstName": "Iris",
  "lastName": "Muller",
  "email": "iris.muller@acme.com",
  "phone": "+49-151-9999",
  "jobTitle": "Developer",
  "salary": 60000,
  "hireDate": "2026-11-16",
  "status": "ACTIVE",
  "department": {
    "id": 1
  }
}
```

## Upload configuration

Spring multipart uploads are configured for:

- 25 MB per file
- 75 MB per request

Uploaded files are stored below `uploads/`, including:

- Profile avatars in `uploads/avatars/`
- Work result files
- Job application CVs and supporting documents

Do not commit runtime uploads or generated build directories.

## Build and test

Run backend tests:

```powershell
mvn test
```

Create a backend package:

```powershell
mvn package
```

Build the frontend:

```powershell
cd frontend
npm run build
```

The frontend build performs TypeScript checking and creates an optimized Next.js production build.

## Production notes

The default configuration uses an in-memory H2 database, so data is lost whenever the backend restarts. For persistent deployment, replace the H2 datasource and dependency with a supported database such as PostgreSQL and add persistent storage for `uploads/`.

Before deploying, also provide a production session/authentication strategy and replace the demo accounts and seeded passwords.

