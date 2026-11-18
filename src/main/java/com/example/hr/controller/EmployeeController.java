package com.example.hr.controller;

import com.example.hr.entity.Employee;
import com.example.hr.entity.EmployeeStatus;
import com.example.hr.service.CurrentUserService;
import com.example.hr.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final CurrentUserService currentUserService;

    public EmployeeController(EmployeeService employeeService, CurrentUserService currentUserService) {
        this.employeeService = employeeService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<Employee> findAll(@RequestParam(required = false) String q,
                                  @RequestParam(required = false) Long departmentId,
                                  @RequestParam(required = false) EmployeeStatus status) {
        return employeeService.findAll(q, departmentId, status);
    }

    @GetMapping("/{id}")
    public Employee findById(@PathVariable Long id) {
        return employeeService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Employee create(@Valid @RequestBody Employee employee) {
        requireAdmin();
        return employeeService.create(employee);
    }

    @PutMapping("/{id}")
    public Employee update(@PathVariable Long id, @Valid @RequestBody Employee employee) {
        requireAdmin();
        return employeeService.update(id, employee);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        requireAdmin();
        employeeService.delete(id);
    }

    private void requireAdmin() {
        if (!currentUserService.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required.");
        }
    }
}
