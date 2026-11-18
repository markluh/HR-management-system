package com.example.hr.service;

import com.example.hr.controller.AuthController.UserDto;
import com.example.hr.entity.Employee;
import com.example.hr.entity.Role;
import com.example.hr.entity.UserAccount;
import com.example.hr.exception.BusinessException;
import com.example.hr.exception.ResourceNotFoundException;
import com.example.hr.repository.UserAccountRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@Transactional
public class UserService {

    private final UserAccountRepository userRepository;
    private final com.example.hr.repository.EmployeeRepository employeeRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserAccountRepository userRepository,
                       com.example.hr.repository.EmployeeRepository employeeRepository,
                       FileStorageService fileStorageService,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.fileStorageService = fileStorageService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserDto toDto(UserAccount user) {
        return UserDto.from(user);
    }

    @Transactional(readOnly = true)
    public Optional<UserAccount> byUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return userRepository.findAll().stream().map(UserDto::from).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<UserAccount> findUsersByRole(Role role) {
        return userRepository.findAll().stream().filter(u -> u.getRole() == role).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserDto create(String username, String email, String rawPassword, Role role, Long employeeId) {
        if (rawPassword == null || rawPassword.length() < 6) {
            throw new BusinessException("Password must be at least 6 characters.");
        }
        if (userRepository.existsByUsername(username)) {
            throw new BusinessException("Username already exists: " + username);
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("A user with this email already exists: " + email);
        }
        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        if (employeeId != null) {
            user.setEmployee(getEmployee(employeeId));
        }
        return UserDto.from(userRepository.save(user));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserDto updateRole(Long userId, Role role) {
        UserAccount user = getUser(userId);
        user.setRole(role);
        return UserDto.from(user);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void delete(Long userId) {
        userRepository.delete(getUser(userId));
    }

    /** Upload/replace the profile picture of the given user (self-service). */
    public UserDto uploadProfilePicture(Long userId, MultipartFile file) {
        UserAccount user = getUser(userId);
        String storedName = fileStorageService.storeProfilePicture(file);
        user.setProfilePicture(storedName);
        return UserDto.from(user);
    }

    @Transactional(readOnly = true)
    public UserAccount getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: id=" + id));
    }

    @Transactional(readOnly = true)
    public Employee getEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: id=" + id));
    }

    @Transactional(readOnly = true)
    public PictureData loadPicture(UserAccount user) {
        if (user.getProfilePicture() != null) {
            Resource resource = fileStorageService.loadStoredFile(user.getProfilePicture(), true);
            if (resource.exists()) {
                String name = user.getProfilePicture().toLowerCase(Locale.ROOT);
                MediaType type = name.endsWith(".png") ? MediaType.IMAGE_PNG
                        : name.endsWith(".jpg") || name.endsWith(".jpeg") ? MediaType.IMAGE_JPEG
                        : name.endsWith(".gif") ? MediaType.IMAGE_GIF
                        : name.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                        : MediaType.parseMediaType("image/svg+xml");
                return new PictureData(resource, type);
            }
        }
        return new PictureData(null, null); // caller falls back to default avatar
    }

    public record PictureData(Resource resource, MediaType contentType) {}
}
