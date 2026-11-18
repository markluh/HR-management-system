-- Departments
INSERT INTO departments (name, location) VALUES
  ('Engineering', 'Berlin HQ'),
  ('Human Resources', 'Berlin HQ'),
  ('Sales', 'Munich Office'),
  ('Finance', 'Berlin HQ');

-- Employees (id auto-assigned in insertion order: 1..8)
INSERT INTO employees (first_name, last_name, email, phone, job_title, salary, hire_date, status, department_id) VALUES
  ('Alice',  'Nguyen',  'alice.nguyen@acme.com',    '+49-151-1111', 'Engineering Manager', 950000.00, '2018-03-12', 'ACTIVE',   1),
  ('Bob',    'Kruger',  'bob.kruger@acme.com',      '+49-151-2222', 'Senior Developer',    780000.00, '2019-07-01', 'ACTIVE',   1),
  ('Carla',  'Diaz',    'carla.diaz@acme.com',      '+49-151-3333', 'Developer',           660000.00, '2021-01-15', 'ACTIVE',   1),
  ('Dana',   'Weiss',   'dana.weiss@acme.com',      '+49-151-4444', 'HR Manager',          720000.00, '2017-09-04', 'ACTIVE',   2),
  ('Eli',    'Cohen',   'eli.cohen@acme.com',       '+49-151-5555', 'Recruiter',           580000.00, '2022-05-20', 'ON_LEAVE', 2),
  ('Farid',  'Aziz',    'farid.aziz@acme.com',      '+49-151-6666', 'Account Executive',   640000.00, '2020-11-02', 'ACTIVE',   3),
  ('Gina',   'Romano',  'gina.romano@acme.com',     '+49-151-7777', 'Sales Associate',     520000.00, '2023-02-13', 'ACTIVE',   3),
  ('Hans',   'Berger',  'hans.berger@acme.com',     '+49-151-8888', 'Financial Analyst',   690000.00, '2019-04-22', 'TERMINATED', 4);

-- Leave requests (samples in the past and future)
INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status, requested_at) VALUES
  (2, 'VACATION', DATEADD('DAY', 3, CURRENT_DATE), DATEADD('DAY', 10, CURRENT_DATE), 'Family trip', 'PENDING', CURRENT_TIMESTAMP),
  (3, 'SICK', DATEADD('DAY', -5, CURRENT_DATE), DATEADD('DAY', -4, CURRENT_DATE), 'Flu', 'APPROVED', CURRENT_TIMESTAMP),
  (5, 'PARENTAL', DATEADD('DAY', -1, CURRENT_DATE), DATEADD('DAY', 2, CURRENT_DATE), 'Parental leave', 'APPROVED', CURRENT_TIMESTAMP);
