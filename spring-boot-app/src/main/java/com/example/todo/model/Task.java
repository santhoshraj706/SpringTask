package com.example.todo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "tasks")
public class Task {
    @Id
    private String id;
    private String title;
    private String description;
    private boolean completed;
    
    // Enhanced attributes
    private String priority; // LOW, MEDIUM, HIGH
    private String category; // Work, Personal, Study
    private Instant dueDate;
    
    // Audit fields
    private Instant createdAt = Instant.now();
    private Instant updatedAt;
    private String createdBy;
    
    private String userId; // Reference mapping to secure user context elements
}
