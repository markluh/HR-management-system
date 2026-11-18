package com.example.hr.repository;

import com.example.hr.entity.WorkFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkFileRepository extends JpaRepository<WorkFile, Long> {

    List<WorkFile> findByAssignmentIdOrderByUploadedAtDesc(Long assignmentId);
}
