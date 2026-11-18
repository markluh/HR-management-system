package com.example.hr.controller;

import com.example.hr.entity.AttendanceStatus;
import com.example.hr.service.AttendanceService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    /** Daily attendance rows for a date (admin only). */
    @GetMapping
    public List<AttendanceService.AttendanceRow> listForDate(
            @RequestParam(required = false) LocalDate date) {
        return attendanceService.listForDate(date != null ? date : LocalDate.now());
    }

    /** Mark an employee PRESENT / ABSENT / ON_LEAVE for a date (admin only). */
    @PostMapping
    public AttendanceService.AttendanceRow mark(@RequestParam Long employeeId,
                                                @RequestParam(required = false) LocalDate date,
                                                @RequestParam AttendanceStatus status) {
        return attendanceService.mark(employeeId, date != null ? date : LocalDate.now(), status);
    }

    /** Aggregated counts for a date — accessible to all authenticated users (dashboard pie chart). */
    @GetMapping("/summary")
    public AttendanceService.Summary summary(@RequestParam(required = false) LocalDate date) {
        return attendanceService.summarize(date != null ? date : LocalDate.now());
    }
}
