package com.example.hr.service;

import com.example.hr.entity.ApplicationFile;
import com.example.hr.entity.ApplicationFileCategory;
import com.example.hr.entity.ApplicationStatus;
import com.example.hr.entity.JobApplication;
import com.example.hr.exception.BusinessException;
import com.example.hr.exception.ResourceNotFoundException;
import com.example.hr.repository.ApplicationFileRepository;
import com.example.hr.repository.JobApplicationRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class JobApplicationService {

    private static final LocalTime FIRST_SLOT = LocalTime.of(9, 0);
    private static final LocalTime LAST_SLOT = LocalTime.of(16, 0);
    private static final int SLOT_MINUTES = 60;

    private final JobApplicationRepository applicationRepository;
    private final ApplicationFileRepository fileRepository;
    private final FileStorageService fileStorageService;

    public JobApplicationService(JobApplicationRepository applicationRepository,
                                 ApplicationFileRepository fileRepository,
                                 FileStorageService fileStorageService) {
        this.applicationRepository = applicationRepository;
        this.fileRepository = fileRepository;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Public submission: stores the CV, certificates and other required documents,
     * then automatically schedules an interview in the first free business-hours slot
     * (weekdays 09:00–16:00, hourly slots, starting tomorrow).
     */
    public JobApplication submit(String fullName, String email, String phone, String position,
                                 String coverLetter,
                                 MultipartFile cv,
                                 List<MultipartFile> certificates,
                                 List<MultipartFile> documents) {
        if (cv == null || cv.isEmpty()) {
            throw new BusinessException("A CV is required.");
        }
        if (fullName == null || fullName.isBlank() || position == null || position.isBlank()) {
            throw new BusinessException("Full name and desired position are required.");
        }

        JobApplication application = new JobApplication();
        application.setFullName(fullName.trim());
        application.setEmail(email == null ? "" : email.trim());
        application.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        application.setPosition(position.trim());
        application.setCoverLetter(coverLetter == null || coverLetter.isBlank() ? null : coverLetter.trim());
        application.setStatus(ApplicationStatus.INTERVIEW_SCHEDULED);
        application.setInterviewDateTime(scheduleInterview());
        JobApplication saved = applicationRepository.save(application);

        saveFile(saved, cv, ApplicationFileCategory.CV);
        if (certificates != null) {
            for (MultipartFile f : certificates) {
                if (f != null && !f.isEmpty()) saveFile(saved, f, ApplicationFileCategory.CERTIFICATE);
            }
        }
        if (documents != null) {
            for (MultipartFile f : documents) {
                if (f != null && !f.isEmpty()) saveFile(saved, f, ApplicationFileCategory.OTHER);
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<JobApplication> listAll() {
        return applicationRepository.findAllByOrderByInterviewDateTimeAsc();
    }

    @Transactional(readOnly = true)
    public List<ApplicationFile> filesOf(Long applicationId) {
        return fileRepository.findByApplicationId(applicationId);
    }

    @Transactional(readOnly = true)
    public JobApplication byId(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: id=" + id));
    }

    /** Admin hiring decision. */
    public JobApplication updateStatus(Long id, ApplicationStatus status) {
        JobApplication application = byId(id);
        application.setStatus(status);
        return application;
    }

    @Transactional(readOnly = true)
    public StoredApplicationFile loadFile(Long fileId) {
        ApplicationFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Application file not found: id=" + fileId));
        Resource resource = fileStorageService.loadStoredFile(file.getStoredName(), false);
        if (!resource.exists()) {
            throw new ResourceNotFoundException("Stored file is missing on disk.");
        }
        return new StoredApplicationFile(resource, file);
    }

    /**
     * First free hourly slot on business days between 09:00 and 16:00,
     * starting tomorrow (a fresh slot must not collide with any booked interview).
     */
    LocalDateTime scheduleInterview() {
        Set<LocalDateTime> taken = new HashSet<>();
        for (JobApplication a : applicationRepository.findAll()) {
            if (a.getInterviewDateTime() != null && a.getInterviewDateTime().isAfter(LocalDateTime.now())) {
                taken.add(a.getInterviewDateTime().withSecond(0).withNano(0));
            }
        }

        LocalDate day = LocalDate.now().plusDays(1);
        for (int checked = 0; checked < 60; checked++) {
            if (day.getDayOfWeek() != DayOfWeek.SATURDAY && day.getDayOfWeek() != DayOfWeek.SUNDAY) {
                for (LocalTime slot = FIRST_SLOT; !slot.isAfter(LAST_SLOT); slot = slot.plusMinutes(SLOT_MINUTES)) {
                    LocalDateTime candidate = LocalDateTime.of(day, slot);
                    if (!taken.contains(candidate)) {
                        return candidate;
                    }
                }
            }
            day = day.plusDays(1);
        }
        return LocalDateTime.of(day, FIRST_SLOT); // fallback far enough out
    }

    private void saveFile(JobApplication application, MultipartFile file, ApplicationFileCategory category) {
        String storedName = fileStorageService.storeWorkFile(file);
        ApplicationFile af = new ApplicationFile();
        af.setApplication(application);
        af.setCategory(category);
        String original = file.getOriginalFilename();
        af.setOriginalName((original == null || original.isBlank()) ? "file" : original);
        af.setStoredName(storedName);
        af.setContentType(file.getContentType());
        af.setSizeBytes(file.getSize());
        fileRepository.save(af);
    }

    public record StoredApplicationFile(Resource resource, ApplicationFile file) {}
}
