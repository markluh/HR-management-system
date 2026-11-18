package com.example.hr.service;

import com.example.hr.entity.Employee;
import com.example.hr.entity.EmployeeStatus;
import com.example.hr.entity.LeaveRequest;
import com.example.hr.entity.LeaveStatus;
import com.example.hr.entity.Role;
import com.example.hr.entity.UserAccount;
import com.example.hr.exception.BusinessException;
import com.example.hr.exception.ResourceNotFoundException;
import com.example.hr.repository.EmployeeRepository;
import com.example.hr.repository.LeaveRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;

@Service
@Transactional
public class LeaveRequestService {

    private static final EnumSet<LeaveStatus> BLOCKING_STATUSES =
            EnumSet.of(LeaveStatus.PENDING, LeaveStatus.APPROVED);

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository, EmployeeRepository employeeRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
    }

    /**
     * Admins see every leave request; regular users are restricted to their own
     * linked employee's applications (any employeeId filter they pass is overridden).
     */
    @Transactional(readOnly = true)
    public List<LeaveRequest> findAll(LeaveStatus status, Long employeeId, UserAccount currentUser) {
        if (currentUser != null && currentUser.getRole() == Role.USER) {
            if (currentUser.getEmployee() == null) {
                return List.of();
            }
            employeeId = currentUser.getEmployee().getId();
        }
        if (employeeId != null && status != null) {
            return leaveRequestRepository.findByEmployeeIdAndStatus(employeeId, status);
        }
        if (employeeId != null) {
            return leaveRequestRepository.findByEmployeeId(employeeId);
        }
        if (status != null) {
            return leaveRequestRepository.findByStatus(status);
        }
        return leaveRequestRepository.findAll();
    }

    @Transactional(readOnly = true)
    public LeaveRequest findById(Long id) {
        return getLeaveRequest(id);
    }

    public LeaveRequest create(LeaveRequest request, UserAccount currentUser) {
        final Long requestedEmployeeId;
        if (request.getEmployee() != null) {
            requestedEmployeeId = request.getEmployee().getId();
        } else if (currentUser != null && currentUser.getRole() == Role.USER
                && currentUser.getEmployee() != null) {
            // Regular users default to their own linked employee
            requestedEmployeeId = currentUser.getEmployee().getId();
        } else {
            requestedEmployeeId = null;
        }

        // Regular users can only request leave for their linked employee.
        if (currentUser != null && currentUser.getRole() == Role.USER) {
            if (currentUser.getEmployee() == null) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Your account is not linked to an employee record; ask an admin to link it.");
            }
            if (requestedEmployeeId == null) {
                throw new org.springframework.security.access.AccessDeniedException("Employee is required.");
            }
            if (!requestedEmployeeId.equals(currentUser.getEmployee().getId())) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "You can only request leave for yourself.");
            }
        }
        if (requestedEmployeeId == null) {
            throw new BusinessException("Employee is required.");
        }

        Employee employee = employeeRepository.findById(requestedEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: id=" + requestedEmployeeId));

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new BusinessException("Leave can only be requested by ACTIVE employees. Current status: "
                    + employee.getStatus());
        }
        validateDates(request);
        ensureNoOverlap(request);

        request.setEmployee(employee);
        request.setStatus(LeaveStatus.PENDING);
        return leaveRequestRepository.save(request);
    }

    public LeaveRequest cancel(Long id) {
        LeaveRequest request = getLeaveRequest(id);
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Only PENDING leave requests can be cancelled. Current status: "
                    + request.getStatus());
        }
        request.setStatus(LeaveStatus.REJECTED);
        return request;
    }

    public LeaveRequest decide(Long id, LeaveStatus decision) {
        if (decision == LeaveStatus.PENDING) {
            throw new BusinessException("Decision must be APPROVED or REJECTED.");
        }
        LeaveRequest request = getLeaveRequest(id);
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Leave request has already been decided. Current status: "
                    + request.getStatus());
        }
        request.setStatus(decision);
        if (decision == LeaveStatus.APPROVED) {
            request.getEmployee().setStatus(EmployeeStatus.ON_LEAVE);
        }
        return request;
    }

    private void validateDates(LeaveRequest request) {
        LocalDate today = LocalDate.now();
        if (request.getStartDate().isBefore(today)) {
            throw new BusinessException("Leave start date cannot be in the past.");
        }
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessException("Leave end date cannot be before the start date.");
        }
    }

    private void ensureNoOverlap(LeaveRequest request) {
        List<LeaveRequest> overlapping = leaveRequestRepository
                .findByEmployeeIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        request.getEmployee().getId(),
                        BLOCKING_STATUSES,
                        request.getEndDate(),
                        request.getStartDate());
        if (!overlapping.isEmpty()) {
            throw new BusinessException("Employee already has a PENDING or APPROVED leave overlapping "
                    + request.getStartDate() + " to " + request.getEndDate() + ".");
        }
    }

    private LeaveRequest getLeaveRequest(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found: id=" + id));
    }
}
