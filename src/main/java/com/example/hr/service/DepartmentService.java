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
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    public DepartmentService(DepartmentRepository departmentRepository, EmployeeRepository employeeRepository) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<Department> findAll() {
        return departmentRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Department findById(Long id) {
        return getDepartment(id);
    }

    public Department create(Department department) {
        if (departmentRepository.existsByNameIgnoreCase(department.getName())) {
            throw new BusinessException("Department name already exists: " + department.getName());
        }
        return departmentRepository.save(department);
    }

    public Department update(Long id, Department changes) {
        Department existing = getDepartment(id);
        if (!existing.getName().equalsIgnoreCase(changes.getName())
                && departmentRepository.existsByNameIgnoreCase(changes.getName())) {
            throw new BusinessException("Department name already exists: " + changes.getName());
        }
        existing.setName(changes.getName());
        existing.setLocation(changes.getLocation());
        return existing;
    }

    public void delete(Long id) {
        Department department = getDepartment(id);
        List<Employee> employees = employeeRepository.findByDepartmentId(id);
        if (!employees.isEmpty()) {
            throw new BusinessException(
                    "Cannot delete department '" + department.getName() + "': it still has "
                            + employees.size() + " employee(s). Reassign them first.");
        }
        departmentRepository.delete(department);
    }

    @Transactional(readOnly = true)
    public long headcount(Long id) {
        getDepartment(id);
        return employeeRepository.findByDepartmentIdAndStatus(id, EmployeeStatus.ACTIVE).size();
    }

    private Department getDepartment(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: id=" + id));
    }
}
