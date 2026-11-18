package com.example.hr.controller;

import com.example.hr.controller.AuthController.UserDto;
import com.example.hr.entity.Role;
import com.example.hr.entity.UserAccount;
import com.example.hr.service.CurrentUserService;
import com.example.hr.service.UserService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    public record CreateUserRequest(String username, String email, String password,
                                    String role, Long employeeId) {}

    private final UserService userService;
    private final CurrentUserService currentUserService;

    public UserController(UserService userService, CurrentUserService currentUserService) {
        this.userService = userService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/me")
    public UserDto me() {
        UserAccount me = requireUser(currentUserService.get());
        return userService.toDto(me);
    }

    /** Admin: list user accounts. */
    @GetMapping
    public List<UserDto> list() {
        return userService.findAll();
    }

    /** Admin: create a user account (optionally linked to an employee). */
    @PostMapping
    public UserDto create(@RequestBody CreateUserRequest request) {
        Role role;
        try {
            role = Role.valueOf(request.role() == null ? "USER" : request.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + request.role());
        }
        return userService.create(request.username(), request.email(), request.password(), role,
                request.employeeId());
    }

    /** Admin: change a user's role. */
    @PutMapping("/{id}/role")
    public UserDto updateRole(@PathVariable Long id, @RequestParam Role role) {
        return userService.updateRole(id, role);
    }

    /** Admin: delete a user account. */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }

    /** Profile picture of a user; falls back to a default generated avatar. Public so <img> tags always work. */
    @GetMapping("/{id}/picture")
    public ResponseEntity<Resource> picture(@PathVariable Long id) {
        UserAccount user;
        try {
            user = userService.getUser(id);
        } catch (Exception e) {
            return defaultAvatar(null);
        }
        UserService.PictureData data = userService.loadPicture(user);
        if (data.resource() != null) {
            return ResponseEntity.ok().contentType(data.contentType()).body(data.resource());
        }
        return defaultAvatar(user.getUsername());
    }

    /** Upload/replace the current user's profile picture. */
    @PostMapping(value = "/me/picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto uploadMyPicture(@RequestParam("file") MultipartFile file) {
        UserAccount me = requireUser(currentUserService.get());
        return userService.uploadProfilePicture(me.getId(), file);
    }

    private UserAccount requireUser(UserAccount user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return user;
    }

    /** Inline SVG avatar with the user's initials — used when no picture has been uploaded. */
    private ResponseEntity<Resource> defaultAvatar(String seed) {
        String initials = (seed == null || seed.isBlank())
                ? "?"
                : (String.valueOf(Character.toUpperCase(seed.charAt(0)))
                + (seed.contains(".")
                ? String.valueOf(Character.toUpperCase(seed.charAt(seed.indexOf('.') + 1)))
                : seed.length() > 1 ? "" : ""));
        int hash = seed == null ? 0 : Math.abs(seed.hashCode());
        String color1 = '#' + String.format("%06x", hash & 0xFFFFFF | 0x404040);
        String svg = """
                <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
                  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%%" stop-color="%s"/>
                    <stop offset="100%%" stop-color="#3358d4"/>
                  </linearGradient></defs>
                  <rect width="128" height="128" rx="24" fill="url(#g)"/>
                  <text x="64" y="80" font-family="Segoe UI, sans-serif" font-size="52" font-weight="700"
                        fill="#ffffff" text-anchor="middle">%s</text>
                </svg>
                """.formatted(color1, initials);
        Resource resource = new org.springframework.core.io.ByteArrayResource(svg.getBytes());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("image/svg+xml"))
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(resource);
    }
}
