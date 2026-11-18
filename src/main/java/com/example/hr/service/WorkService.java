package com.example.hr.service;

import com.example.hr.entity.WorkAssignment;
import com.example.hr.entity.UserAccount;
import com.example.hr.entity.WorkFile;
import com.example.hr.entity.WorkStatus;
import com.example.hr.exception.BusinessException;
import com.example.hr.exception.ResourceNotFoundException;
import com.example.hr.repository.WorkAssignmentRepository;
import com.example.hr.repository.WorkFileRepository;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class WorkService {

    private final WorkAssignmentRepository workRepository;
    private final WorkFileRepository fileRepository;
    private final FileStorageService fileStorageService;
    private final UserService userService;
    private final CurrentUserService currentUserService;

    public WorkService(WorkAssignmentRepository workRepository,
                       WorkFileRepository fileRepository,
                       FileStorageService fileStorageService,
                       UserService userService,
                       CurrentUserService currentUserService) {
        this.workRepository = workRepository;
        this.fileRepository = fileRepository;
        this.fileStorageService = fileStorageService;
        this.userService = userService;
        this.currentUserService = currentUserService;
    }

    /** Admin sees all assignments; regular users only their own. */
    @Transactional(readOnly = true)
    public List<WorkAssignment> visibleToCurrentUser() {
        if (currentUserService.isAdmin()) {
            return workRepository.findAllByOrderByCreatedAtDesc();
        }
        UserAccount me = requireCurrentUser();
        return workRepository.findByAssignedToIdOrderByCreatedAtDesc(me.getId());
    }

    @Transactional(readOnly = true)
    public WorkAssignment findById(Long id) {
        return workRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work assignment not found: id=" + id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public WorkAssignment create(String title, String description, Long assignedToUserId,
                                 LocalDate dueDate) {
        UserAccount assignee = userService.getUser(assignedToUserId);
        UserAccount admin = requireCurrentUser();
        WorkAssignment work = new WorkAssignment();
        work.setTitle(title);
        work.setDescription(description);
        work.setAssignedTo(assignee);
        work.setAssignedBy(admin);
        work.setDueDate(dueDate);
        work.setStatus(WorkStatus.PENDING);
        work.setProgressPercent(0);
        return workRepository.save(work);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void delete(Long id) {
        workRepository.delete(findById(id));
    }

    /**
     * The assigned user (or an admin) records progress. Mapping rules:
     * status PENDING -> 0%, COMPLETED -> 100%; explicit percent clamped to 0..100.
     */
    public WorkAssignment updateProgress(Long id, WorkStatus status, Integer progressPercent) {
        WorkAssignment work = findById(id);
        requireOwnerOrAdmin(work);

        if (status != null) {
            work.setStatus(status);
            if (status == WorkStatus.PENDING) {
                work.setProgressPercent(0);
            } else if (status == WorkStatus.COMPLETED) {
                work.setProgressPercent(100);
            }
        }
        if (progressPercent != null) {
            if (progressPercent < 0 || progressPercent > 100) {
                throw new BusinessException("Progress must be between 0 and 100.");
            }
            work.setProgressPercent(progressPercent);
            if (progressPercent == 0) {
                work.setStatus(WorkStatus.PENDING);
            } else if (progressPercent == 100) {
                work.setStatus(WorkStatus.COMPLETED);
            } else if (work.getStatus() == WorkStatus.PENDING) {
                work.setStatus(WorkStatus.IN_PROGRESS);
            }
        }
        work.setUpdatedAt(java.time.LocalDateTime.now());
        return work;
    }

    // ---------- files ----------

    @Transactional(readOnly = true)
    public List<WorkFile> filesOf(Long assignmentId) {
        WorkAssignment work = findById(assignmentId);
        requireOwnerOrAdmin(work);
        return fileRepository.findByAssignmentIdOrderByUploadedAtDesc(assignmentId);
    }

    public WorkFile uploadFile(Long assignmentId, MultipartFile file) {
        WorkAssignment work = findById(assignmentId);
        requireOwnerOrAdmin(work);

        String storedName = fileStorageService.storeWorkFile(file);
        WorkFile workFile = new WorkFile();
        workFile.setAssignment(work);
        workFile.setOriginalName(originalNameOf(file));
        workFile.setStoredName(storedName);
        workFile.setContentType(file.getContentType());
        workFile.setSizeBytes(file.getSize());
        workFile.setUploadedBy(requireCurrentUser());
        return fileRepository.save(workFile);
    }

    @Transactional(readOnly = true)
    public StoredResource loadFile(Long fileId) {
        WorkFile workFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found: id=" + fileId));
        Resource resource = fileStorageService.loadStoredFile(workFile.getStoredName(), false);
        if (!resource.exists()) {
            throw new ResourceNotFoundException("Stored file is missing on disk.");
        }
        return new StoredResource(resource, workFile);
    }

    private void requireOwnerOrAdmin(WorkAssignment work) {
        UserAccount me = requireCurrentUser();
        boolean owner = Objects.equals(me.getId(), work.getAssignedTo().getId());
        if (!owner && me.getRole() != com.example.hr.entity.Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only the assignee or an admin can modify this work item.");
        }
    }

    private UserAccount requireCurrentUser() {
        UserAccount me = currentUserService.get();
        if (me == null) {
            throw new org.springframework.security.access.AccessDeniedException("Not authenticated.");
        }
        return me;
    }

    private String originalNameOf(MultipartFile file) {
        String name = file.getOriginalFilename();
        return (name == null || name.isBlank()) ? "file" : name;
    }

    public record StoredResource(Resource resource, WorkFile file) {}
}
