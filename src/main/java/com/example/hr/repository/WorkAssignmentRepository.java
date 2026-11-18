package com.example.hr.repository;

import com.example.hr.entity.WorkAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkAssignmentRepository extends JpaRepository<WorkAssignment, Long> {

    List<WorkAssignment> findByAssignedToIdOrderByCreatedAtDesc(Long assignedToId);

    List<WorkAssignment> findAllByOrderByCreatedAtDesc();
}
