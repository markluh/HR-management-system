package com.example.hr.service;

import com.example.hr.exception.BusinessException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Stores uploaded files under <working-dir>/uploads (avatars under uploads/avatars).
 */
@Service
public class FileStorageService {

    private final Path uploadsRoot = Path.of("uploads");
    private final Path avatarsRoot = uploadsRoot.resolve("avatars");

    public FileStorageService() {
        try {
            Files.createDirectories(avatarsRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create uploads directory", e);
        }
    }

    /** Store a work file and return its unique stored name. */
    public String storeWorkFile(MultipartFile file) {
        validateFile(file);
        return store(file, uploadsRoot);
    }

    /** Store a profile picture (images only) and return its unique stored name. */
    public String storeProfilePicture(MultipartFile file) {
        String type = file.getContentType();
        if (type == null || !type.startsWith("image/")) {
            throw new BusinessException("Profile picture must be an image file.");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BusinessException("Profile picture must be 5 MB or smaller.");
        }
        return store(file, avatarsRoot);
    }

    public Resource loadStoredFile(String storedName, boolean fromAvatars) {
        Path base = fromAvatars ? avatarsRoot : uploadsRoot;
        Path resolved = base.resolve(storedName).normalize();
        if (!resolved.startsWith(base)) {
            throw new BusinessException("Invalid file path.");
        }
        return new FileSystemResource(resolved);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is empty.");
        }
        if (file.getSize() > 25 * 1024 * 1024) {
            throw new BusinessException("File must be 25 MB or smaller.");
        }
    }

    private String store(MultipartFile file, Path baseDir) {
        String original = file.getOriginalFilename();
        String safe = original == null ? "file" : original.replaceAll("[\\\\/:*?\"<>|]", "_");
        String storedName = UUID.randomUUID() + "_" + safe;
        Path target = baseDir.resolve(storedName).normalize();
        if (!target.startsWith(baseDir)) {
            throw new BusinessException("Invalid file name.");
        }
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BusinessException("Could not store file: " + e.getMessage());
        }
        return storedName;
    }
}
