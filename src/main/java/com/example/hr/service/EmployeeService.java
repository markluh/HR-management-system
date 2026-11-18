package com.example.hr.service;

import com.example.hr.entity.Department;
import com.example.hr.entity.Employee;
import com.example.hr.entity.EmployeeStatus;
import com.example.hr.exception.BusinessException;
import com.example.hr.exception.ResourceNotFoundException;
import com.example.hr.repository.DepartmentRepository;
import com.example.hr.repository.EmployeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    public EmployeeService(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<Employee> findAll(String q, Long departmentId, EmployeeStatus status) {
        if (q != null && !q.isBlank()) {
            return employeeRepository.searchByNameOrEmail(q.trim());
        }
        if (departmentId != null && status != null) {
            return employeeRepository.findByDepartmentIdAndStatus(departmentId, status);
        }
        if (departmentId != null) {
            return employeeRepository.findByDepartmentId(departmentId);
        }
        if (status != null) {
            return employeeRepository.findByStatus(status);
        }
        return employeeRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Employee findById(Long id) {
        return getEmployee(id);
    }

    public Employee create(Employee employee) {
        if (employeeRepository.existsByEmailIgnoreCase(employee.getEmail())) {
            throw new BusinessException("An employee with this email already exists: " + employee.getEmail());
        }
        employee.setDepartment(resolveDepartment(employee));
        return employeeRepository.save(employee);
    }

    public Employee update(Long id, Employee changes) {
        Employee existing = getEmployee(id);
        if (!existing.getEmail().equalsIgnoreCase(changes.getEmail())
                && employeeRepository.existsByEmailIgnoreCase(changes.getEmail())) {
            throw new BusinessException("An employee with this email already exists: " + changes.getEmail());
        }
        existing.setFirstName(changes.getFirstName());
        existing.setLastName(changes.getLastName());
        existing.setEmail(changes.getEmail());
        existing.setPhone(changes.getPhone());
        existing.setJobTitle(changes.getJobTitle());
        existing.setSalary(changes.getSalary());
        existing.setHireDate(changes.getHireDate());
        if (changes.getStatus() != null) {
            existing.setStatus(changes.getStatus());
        }
        existing.setDepartment(resolveDepartment(changes));
        return existing;
    }

    public void delete(Long id) {
        Employee employee = getEmployee(id);
        employeeRepository.delete(employee);
    }

    private Department resolveDepartment(Employee employee) {
        if (employee.getDepartment() == null || employee.getDepartment().getId() == null) {
            return null;
        }
        Long deptId = employee.getDepartment().getId();
        return departmentRepository.findById(deptId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: id=" + deptId));
    }

    private Employee getEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: id=" + id));
    }
}
