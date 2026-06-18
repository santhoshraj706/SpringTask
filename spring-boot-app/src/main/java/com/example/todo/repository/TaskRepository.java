package com.example.todo.repository;

import com.example.todo.model.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    
    // Filter tasks by userId to ensure user isolation with pagination
    Page<Task> findByUserId(String userId, Pageable pageable);

    // List all tasks by userId for non-paginated requests or fallback
    List<Task> findByUserId(String userId);

    // Custom search query using MongoDB regular expressions matching keyword case-insensitively
    @Query("{ 'userId': ?0, '$or': [ { 'title': { '$regex': ?1, '$options': 'i' } }, { 'description': { '$regex': ?1, '$options': 'i' } } ] }")
    List<Task> searchByKeywordAndUserId(String userId, String keyword);

    // Filter by priority and category for user
    List<Task> findByUserIdAndPriorityAndCategory(String userId, String priority, String category);

    // Filter by priority for user
    List<Task> findByUserIdAndPriority(String userId, String priority);

    // Filter by category for user
    List<Task> findByUserIdAndCategory(String userId, String category);

    // Find overdue tasks (completed is false and dueDate is before now)
    List<Task> findByUserIdAndCompletedFalseAndDueDateBefore(String userId, Instant now);
}
