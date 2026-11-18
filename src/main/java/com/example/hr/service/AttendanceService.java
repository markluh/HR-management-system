package com.example.hr.service;

import com.example.hr.entity.*;
import com.example.hr.repository.AttendanceRepository;
import com.example.hr.repository.EmployeeRepository;
import com.example.hr.repository.LeaveRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             EmployeeRepository employeeRepository,
                             LeaveRequestRepository leaveRequestRepository) {
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
        this.leaveRequestRepository = leaveRequestRepository;
    }

    public record AttendanceRow(Long employeeId, String employeeName, String departmentName,
                                LocalDate date, AttendanceStatus status) {}

    public record Summary(LocalDate date, long total, long present, long absent, long onLeave) {}

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<AttendanceRow> listForDate(LocalDate date) {
        Map<Long, AttendanceStatus> recorded = new LinkedHashMap<>();
        for (Attendance a : attendanceRepository.findByDate(date)) {
            recorded.put(a.getEmployee().getId(), a.getStatus());
        }
        List<AttendanceRow> rows = new ArrayList<>();
        for (Employee e : employeeRepository.findAll()) {
            Long id = e.getId();
            rows.add(new AttendanceRow(id,
                    e.getFirstName() + " " + e.getLastName(),
                    e.getDepartment() != null ? e.getDepartment().getName() : null,
                    date,
                    recorded.getOrDefault(id, AttendanceStatus.ABSENT)));
        }
        return rows;
    }

    /** Set (upsert) an employee's attendance status for a date. */
    @PreAuthorize("hasRole('ADMIN')")
    public AttendanceRow mark(Long employeeId, LocalDate date, AttendanceStatus status) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Employee not found: id=" + employeeId));
        Attendance attendance = attendanceRepository.findByEmployeeIdAndDate(employeeId, date)
                .orElseGet(() -> {
                    Attendance a = new Attendance();
                    a.setEmployee(employee);
                    a.setDate(date);
                    return a;
                });
        attendance.setStatus(status);
        attendanceRepository.save(attendance);
        return new AttendanceRow(employeeId,
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getDepartment() != null ? employee.getDepartment().getName() : null,
                date, status);
    }

    /**
     * Summary for a date used by the dashboard pie chart:
     * PRESENT = marked present; ON_LEAVE = approved leave spanning the date (or marked ON_LEAVE);
     * everything else among non-terminated employees = ABSENT.
     */
    @Transactional(readOnly = true)
    public Summary summarize(LocalDate date) {
        Map<Long, AttendanceStatus> recorded = new LinkedHashMap<>();
        for (Attendance a : attendanceRepository.findByDate(date)) {
            recorded.put(a.getEmployee().getId(), a.getStatus());
        }
        List<Long> approvedLeaves = leaveRequestRepository.findByStatus(LeaveStatus.APPROVED).stream()
                .filter(lr -> !lr.getStartDate().isAfter(date) && !lr.getEndDate().isBefore(date))
                .map(lr -> lr.getEmployee().getId())
                .toList();
        java.util.Set<Long> onLeaveIds = new java.util.HashSet<>(approvedLeaves);

        long total = 0, present = 0, onLeave = 0;
        for (Employee e : employeeRepository.findAll()) {
            if (e.getStatus() == EmployeeStatus.TERMINATED) continue;
            total++;
            AttendanceStatus s = recorded.get(e.getId());
            if (s == AttendanceStatus.PRESENT) present++;
            else if (s == AttendanceStatus.ON_LEAVE || onLeaveIds.contains(e.getId())) onLeave++;
        }
        return new Summary(date, total, present, total - present - onLeave, onLeave);
    }
}
