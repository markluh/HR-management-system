package com.example.hr.controller;

import com.example.hr.entity.UserAccount;
import com.example.hr.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) {}

    public record UserDto(Long id, String username, String email, String role,
                          Long employeeId, String employeeName, boolean hasProfilePicture) {

        public static UserDto from(UserAccount u) {
            return new UserDto(u.getId(), u.getUsername(), u.getEmail(), u.getRole().name(),
                    u.getEmployee() != null ? u.getEmployee().getId() : null,
                    u.getEmployee() != null ? u.getEmployee().getFirstName() + " " + u.getEmployee().getLastName() : null,
                    u.getProfilePicture() != null);
        }
    }

    private final AuthenticationManager authenticationManager;
    private final CurrentUserService currentUserService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, CurrentUserService currentUserService) {
        this.authenticationManager = authenticationManager;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/login")
    public ResponseEntity<UserDto> login(@RequestBody LoginRequest request,
                                         HttpServletRequest httpRequest,
                                         HttpServletResponse httpResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
            SecurityContext context = SecurityContextHolder.getContext();
            context.setAuthentication(authentication);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);
            UserAccount user = currentUserService.get();
            return ResponseEntity.ok(UserDto.from(user));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return Map.of("message", "Logged out");
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        UserAccount user = currentUserService.get();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
        return ResponseEntity.ok(UserDto.from(user));
    }

    /** Convenience DTO for tests/frontend callers. */
    public static Map<String, Object> userToMap(UserAccount user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("role", user.getRole().name());
        map.put("employeeId", user.getEmployee() != null ? user.getEmployee().getId() : null);
        return map;
    }
}
