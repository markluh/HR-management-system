package com.example.hr.controller;

import com.example.hr.entity.Department;
import com.example.hr.service.CurrentUserService;
import com.example.hr.service.DepartmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;
    private final CurrentUserService currentUserService;

    public DepartmentController(DepartmentService departmentService, CurrentUserService currentUserService) {
        this.departmentService = departmentService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<Department> findAll() {
        return departmentService.findAll();
    }

    @GetMapping("/{id}")
    public Department findById(@PathVariable Long id) {
        return departmentService.findById(id);
    }

    @GetMapping("/{id}/headcount")
    public long headcount(@PathVariable Long id) {
        return departmentService.headcount(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Department create(@Valid @RequestBody Department department) {
        requireAdmin();
        return departmentService.create(department);
    }

    @PutMapping("/{id}")
    public Department update(@PathVariable Long id, @Valid @RequestBody Department department) {
        requireAdmin();
        return departmentService.update(id, department);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        requireAdmin();
        departmentService.delete(id);
    }

    private void requireAdmin() {
        if (!currentUserService.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required.");
        }
    }
}
