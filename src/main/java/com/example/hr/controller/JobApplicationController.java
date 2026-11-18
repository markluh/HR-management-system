package com.example.hr.controller;

import com.example.hr.entity.ApplicationFile;
import com.example.hr.entity.ApplicationStatus;
import com.example.hr.entity.JobApplication;
import com.example.hr.service.CurrentUserService;
import com.example.hr.service.JobApplicationService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

    public record ApplicationDto(Long id, String fullName, String email, String phone, String position,
                                 String coverLetter, String status, String interviewDateTime,
                                 String appliedAt, List<Map<String, Object>> files) {}

    private final JobApplicationService applicationService;
    private final CurrentUserService currentUserService;

    public JobApplicationController(JobApplicationService applicationService,
                                    CurrentUserService currentUserService) {
        this.applicationService = applicationService;
        this.currentUserService = currentUserService;
    }

    /** PUBLIC — anyone can apply; everything after this point requires an admin. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApplicationDto submit(
            @RequestParam String fullName,
            @RequestParam String email,
            @RequestParam(required = false) String phone,
            @RequestParam String position,
            @RequestParam(required = false) String coverLetter,
            @RequestParam("cv") MultipartFile cv,
            @RequestParam(value = "certificates", required = false) List<MultipartFile> certificates,
            @RequestParam(value = "documents", required = false) List<MultipartFile> documents) {
        JobApplication saved = applicationService.submit(fullName, email, phone, position, coverLetter,
                cv, certificates, documents);
        return toDto(saved, applicationService.filesOf(saved.getId()));
    }

    /** Admin: all applications, ordered by interview slot. */
    @GetMapping
    public List<ApplicationDto> list() {
        requireAdmin();
        return applicationService.listAll().stream()
                .map(a -> toDto(a, applicationService.filesOf(a.getId())))
                .toList();
    }

    /** Admin: hiring decision — IN_REVIEW / HIRED / REJECTED (and back to INTERVIEW_SCHEDULED). */
    @PutMapping("/{id}/status")
    public ApplicationDto updateStatus(@PathVariable Long id, @RequestParam ApplicationStatus status) {
        requireAdmin();
        return toDto(applicationService.updateStatus(id, status),
                applicationService.filesOf(id));
    }

    /** Admin: download an attachment (CV / certificate / other). */
    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long fileId) {
        requireAdmin();
        JobApplicationService.StoredApplicationFile stored = applicationService.loadFile(fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        stored.file().getContentType() != null ? stored.file().getContentType()
                                : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + stored.file().getOriginalName().replace("\"", "'") + "\"")
                .body(stored.resource());
    }

    private void requireAdmin() {
        if (!currentUserService.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Admin role required.");
        }
    }

    static ApplicationDto toDto(JobApplication a, List<ApplicationFile> files) {
        List<Map<String, Object>> fileMaps = new ArrayList<>();
        for (ApplicationFile f : files) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("category", f.getCategory().name());
            m.put("originalName", f.getOriginalName());
            m.put("contentType", f.getContentType());
            m.put("sizeBytes", f.getSizeBytes());
            fileMaps.add(m);
        }
        return new ApplicationDto(
                a.getId(), a.getFullName(), a.getEmail(), a.getPhone(), a.getPosition(),
                a.getCoverLetter(), a.getStatus().name(),
                a.getInterviewDateTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                a.getAppliedAt().toString(), fileMaps);
    }
}
