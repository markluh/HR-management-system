package com.example.hr.controller;

import com.example.hr.entity.WorkAssignment;
import com.example.hr.entity.WorkFile;
import com.example.hr.entity.WorkStatus;
import com.example.hr.service.WorkService;
import com.example.hr.service.UserService;
import com.example.hr.service.CurrentUserService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/work")
public class WorkController {

    public record CreateRequest(@NotBlank String title, String description,
                                Long assignedToUserId, LocalDate dueDate) {}

    public record ProgressRequest(WorkStatus status, Integer progressPercent) {}

    public record WorkDto(Long id, String title, String description, LocalDate dueDate,
                          String status, int progressPercent,
                          Long assignedToUserId, String assignedToUsername, String assignedToEmployeeName,
                          String assignedByUsername) {}

    private final WorkService workService;
    private final UserService userService;
    private final CurrentUserService currentUserService;

    public WorkController(WorkService workService, UserService userService,
                          CurrentUserService currentUserService) {
        this.workService = workService;
        this.userService = userService;
        this.currentUserService = currentUserService;
    }

    /** Admin: list of all work items. User: one's own assigned work items — GET /api/work */
    @GetMapping
    public List<WorkDto> list() {
        return workService.visibleToCurrentUser().stream().map(this::toDto).toList();
    }

    /** Admin assigns work to a user: POST /api/work */
    @PostMapping
    public WorkDto create(@RequestBody CreateRequest request) {
        if (!currentUserService.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only admins can assign work.");
        }
        if (request.assignedToUserId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "assignedToUserId is required");
        }
        return toDto(workService.create(request.title(), request.description(),
                request.assignedToUserId(), request.dueDate()));
    }

    /** Admin only: delete a work item. */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!currentUserService.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only admins can delete work assignments.");
        }
        workService.delete(id);
    }

    /** The assigned user marks progress; admins may also set it: PUT /api/work/{id}/progress */
    @PutMapping("/{id}/progress")
    public WorkDto updateProgress(@PathVariable Long id, @RequestBody ProgressRequest request) {
        return toDto(workService.updateProgress(id, request.status(), request.progressPercent()));
    }

    /** Files attached to a work item (assignee or admin). */
    @GetMapping("/{id}/files")
    public List<Map<String, Object>> files(@PathVariable Long id) {
        return workService.filesOf(id).stream().map(WorkController::fileToMap).toList();
    }

    /** Upload a file for a work item (assignee or admin): POST /api/work/{id}/files */
    @PostMapping(value = "/{id}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadFile(@PathVariable Long id,
                                          @RequestParam("file") MultipartFile file) {
        WorkFile saved = workService.uploadFile(id, file);
        return fileToMap(saved);
    }

    /** Download a stored work file: GET /api/files/download/{fileId} */
    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long fileId) {
        WorkService.StoredResource stored = workService.loadFile(fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        stored.file().getContentType() != null ? stored.file().getContentType()
                                : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + stored.file().getOriginalName().replace("\"", "'") + "\"")
                .body(stored.resource());
    }

    static Map<String, Object> fileToMap(WorkFile f) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", f.getId());
        map.put("originalName", f.getOriginalName());
        map.put("contentType", f.getContentType());
        map.put("sizeBytes", f.getSizeBytes());
        map.put("uploadedBy", f.getUploadedBy().getUsername());
        map.put("uploadedAt", f.getUploadedAt().toString());
        map.put("assignmentId", f.getAssignment().getId());
        return map;
    }

    private WorkDto toDto(WorkAssignment w) {
        return new WorkDto(
                w.getId(), w.getTitle(), w.getDescription(), w.getDueDate(),
                w.getStatus().name(), w.getProgressPercent(),
                w.getAssignedTo().getId(), w.getAssignedTo().getUsername(),
                w.getAssignedTo().getEmployee() != null
                        ? w.getAssignedTo().getEmployee().getFirstName() + " "
                        + w.getAssignedTo().getEmployee().getLastName()
                        : w.getAssignedTo().getUsername(),
                w.getAssignedBy().getUsername());
    }
}
