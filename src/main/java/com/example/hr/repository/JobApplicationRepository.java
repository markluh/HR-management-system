package com.example.hr.repository;

import com.example.hr.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findAllByOrderByInterviewDateTimeAsc();

    List<JobApplication> findByStatus(com.example.hr.entity.ApplicationStatus status);
}
