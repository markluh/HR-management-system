package com.example.hr.repository;

import com.example.hr.entity.ApplicationFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicationFileRepository extends JpaRepository<ApplicationFile, Long> {

    List<ApplicationFile> findByApplicationId(Long applicationId);
}
