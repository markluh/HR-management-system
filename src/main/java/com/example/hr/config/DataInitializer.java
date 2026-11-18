package com.example.hr.config;

import com.example.hr.entity.*;
import com.example.hr.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Seeds user accounts (BCrypt hashes, so this runs in Java rather than data.sql)
 * and a realistic attendance record for today used by the dashboard pie charts.
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedUsersAndPasswords(UserAccountRepository users,
                                            EmployeeRepository employees,
                                            AttendanceRepository attendance,
                                            LeaveRequestRepository leaves,
                                            PasswordEncoder encoder,
                                            WorkAssignmentRepository workRepo) {
        return args -> {
            if (users.count() == 0) {
                UserAccount admin = new UserAccount();
                admin.setUsername("admin");
                admin.setEmail("admin@acme.com");
                admin.setPassword(encoder.encode("admin123"));
                admin.setRole(Role.ADMIN);
                users.save(admin);

                seedUser(users, encoder, "bob", "bob.kruger@acme.com", "bob123", employee(employees, 2L));
                seedUser(users, encoder, "carla", "carla.diaz@acme.com", "carla123", employee(employees, 3L));
                seedUser(users, encoder, "farid", "farid.aziz@acme.com", "farid123", employee(employees, 6L));
            }

            // Seed today's attendance once (only if nothing recorded yet)
            if (attendance.count() == 0) {
                LocalDate today = LocalDate.now();
                boolean anyLeaveToday = leaves.findByStatus(LeaveStatus.APPROVED).stream()
                        .anyMatch(l -> !l.getStartDate().isAfter(today) && !l.getEndDate().isBefore(today));
                for (Employee e : employees.findAll()) {
                    if (e.getStatus() == EmployeeStatus.TERMINATED) continue;
                    boolean extendedLeave = leaves.findByStatus(LeaveStatus.APPROVED).stream()
                            .anyMatch(l -> l.getEmployee().getId().equals(e.getId())
                                    && !l.getStartDate().isAfter(today) && !l.getEndDate().isBefore(today));
                    // Bob is marked absent today to make the pie chart meaningful
                    AttendanceStatus status = extendedLeave ? AttendanceStatus.ON_LEAVE
                            : e.getId().equals(2L) ? AttendanceStatus.ABSENT
                            : AttendanceStatus.PRESENT;
                    attendance.save(new Attendance(e, today, status));
                }
            }

            // Seed a sample work assignment so the Work dashboard is not empty
            if (workRepo.count() == 0) {
                users.findByUsername("bob").ifPresent(bob ->
                        users.findByUsername("admin").ifPresent(admin -> {
                            WorkAssignment w = new WorkAssignment();
                            w.setTitle("Prepare Q1 sprint report");
                            w.setDescription("Summarize sprint metrics and open blockers.");
                            w.setAssignedTo(bob);
                            w.setAssignedBy(admin);
                            w.setDueDate(LocalDate.now().plusDays(7));
                            w.setStatus(WorkStatus.IN_PROGRESS);
                            w.setProgressPercent(40);
                            workRepo.save(w);
                        }));
            }
        };
    }

    private Employee employee(EmployeeRepository employees, Long id) {
        return employees.findById(id).orElse(null);
    }

    private void seedUser(UserAccountRepository users, PasswordEncoder encoder,
                          String username, String email, String password, Employee employee) {
        if (employee == null) return;
        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(encoder.encode(password));
        user.setRole(Role.USER);
        user.setEmployee(employee);
        users.save(user);
    }
}
