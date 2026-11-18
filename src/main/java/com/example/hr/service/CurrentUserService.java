package com.example.hr.service;

import com.example.hr.entity.UserAccount;
import com.example.hr.repository.UserAccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Resolves the currently authenticated UserAccount from the security context.
 */
@Service
public class CurrentUserService {

    private final UserAccountRepository repository;

    public CurrentUserService(UserAccountRepository repository) {
        this.repository = repository;
    }

    public UserAccount get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return repository.findByUsername(auth.getName()).orElse(null);
    }

    public boolean isAdmin() {
        UserAccount user = get();
        return user != null && user.getRole() == com.example.hr.entity.Role.ADMIN;
    }
}
