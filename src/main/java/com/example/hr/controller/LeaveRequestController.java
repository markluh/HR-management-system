package com.example.hr.controller;

import com.example.hr.entity.LeaveRequest;
import com.example.hr.entity.LeaveStatus;
import com.example.hr.entity.Role;
import com.example.hr.entity.UserAccount;
import com.example.hr.repository.UserAccountRepository;
import com.example.hr.service.CurrentUserService;
import com.example.hr.service.LeaveRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leave-requests")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final CurrentUserService currentUserService;
    private final UserAccountRepository userAccountRepository;

    public LeaveRequestController(LeaveRequestService leaveRequestService,
                                  CurrentUserService currentUserService,
                                  UserAccountRepository userAccountRepository) {
        this.leaveRequestService = leaveRequestService;
        this.currentUserService = currentUserService;
        this.userAccountRepository = userAccountRepository;
    }

    @GetMapping
    public List<LeaveRequest> findAll(@RequestParam(required = false) LeaveStatus status,
                                      @RequestParam(required = false) Long employeeId) {
        // Regular users can only see their own leave applications; admins see all.
        return leaveRequestService.findAll(status, employeeId, currentUserService.get());
    }

    @GetMapping("/{id}")
    public LeaveRequest findById(@PathVariable Long id) {
        return leaveRequestService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveRequest create(@Valid @RequestBody LeaveRequest request) {
        UserAccount me = currentUserService.get();
        return leaveRequestService.create(request, me);
    }

    /** Approve or reject a pending leave request (admins only). */
    @PutMapping("/{id}/decision")
    public LeaveRequest decide(@PathVariable Long id, @RequestParam LeaveStatus decision) {
        if (!currentUserService.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only admins can approve or reject leave requests.");
        }
        return leaveRequestService.decide(id, decision);
    }

    /** Cancel (withdraw) a pending leave request — admins or the requester. */
    @PutMapping("/{id}/cancel")
    public LeaveRequest cancel(@PathVariable Long id) {
        LeaveRequest request = leaveRequestService.findById(id);
        UserAccount me = currentUserService.get();
        boolean isAdmin = me != null && me.getRole() == Role.ADMIN;
        boolean isRequester = request.getEmployee() != null && me != null
                && userAccountRepository.findByEmployeeId(request.getEmployee().getId())
                .map(u -> u.getId().equals(me.getId()))
                .orElse(false);
        if (!isAdmin && !isRequester) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only the requester or an admin can cancel a leave request.");
        }
        return leaveRequestService.cancel(id);
    }
}
