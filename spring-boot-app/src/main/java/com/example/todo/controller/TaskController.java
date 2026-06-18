package com.example.todo.controller;

import com.example.todo.model.Task;
import com.example.todo.model.User;
import com.example.todo.repository.TaskRepository;
import com.example.todo.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    // Helper: Obtain authenticated User context mapping from Spring Security context
    private User getAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current authenticated user not found in database."));
    }

    // GET /tasks - Read operational list of tasks for the authenticated user with pagination and sorting
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        try {
            User user = getAuthenticatedUser();
            Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
            Pageable pageable = PageRequest.of(page, size, sort);
            Page<Task> tasksPage = taskRepository.findByUserId(user.getId(), pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("content", tasksPage.getContent());
            response.put("currentPage", tasksPage.getNumber());
            response.put("totalItems", tasksPage.getTotalElements());
            response.put("totalPages", tasksPage.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // GET /tasks/search?keyword=...
    @GetMapping("/search")
    public ResponseEntity<List<Task>> searchTasks(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            User user = getAuthenticatedUser();
            List<Task> tasks = taskRepository.searchByKeywordAndUserId(user.getId(), keyword);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // GET /tasks/filter?priority=...&category=...
    @GetMapping("/filter")
    public ResponseEntity<List<Task>> filterTasks(
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String category) {
        try {
            User user = getAuthenticatedUser();
            List<Task> tasks;
            if (priority != null && category != null) {
                tasks = taskRepository.findByUserIdAndPriorityAndCategory(user.getId(), priority, category);
            } else if (priority != null) {
                tasks = taskRepository.findByUserIdAndPriority(user.getId(), priority);
            } else if (category != null) {
                tasks = taskRepository.findByUserIdAndCategory(user.getId(), category);
            } else {
                tasks = taskRepository.findByUserId(user.getId());
            }
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // GET /tasks/overdue - Overdue pending tasks detection
    @GetMapping("/overdue")
    public ResponseEntity<List<Task>> getOverdueTasks() {
        try {
            User user = getAuthenticatedUser();
            List<Task> tasks = taskRepository.findByUserIdAndCompletedFalseAndDueDateBefore(user.getId(), Instant.now());
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // POST /tasks - Create a tasks record
    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody Task task) {
        if (task.getTitle() == null || task.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            User user = getAuthenticatedUser();
            task.setUserId(user.getId()); // Secure scope constraint insertion
            task.setCreatedBy(user.getUsername());
            task.setCreatedAt(Instant.now());
            task.setUpdatedAt(Instant.now());
            
            if (task.getPriority() == null) {
                task.setPriority("MEDIUM");
            }
            if (task.getCategory() == null) {
                task.setCategory("Personal");
            }
            
            Task savedTask = taskRepository.save(task);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedTask);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // PUT /tasks/{id} - Update a task record
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable String id, @RequestBody Task updatedDetails) {
        try {
            User user = getAuthenticatedUser();
            Optional<Task> existingTaskOpt = taskRepository.findById(id);

            if (existingTaskOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Task task = existingTaskOpt.get();
            // Verify ownership scope
            if (!task.getUserId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if (updatedDetails.getTitle() != null) {
                task.setTitle(updatedDetails.getTitle());
            }
            if (updatedDetails.getDescription() != null) {
                task.setDescription(updatedDetails.getDescription());
            }
            
            task.setCompleted(updatedDetails.isCompleted());

            if (updatedDetails.getPriority() != null) {
                task.setPriority(updatedDetails.getPriority());
            }
            if (updatedDetails.getCategory() != null) {
                task.setCategory(updatedDetails.getCategory());
            }
            
            // Allow resetting or setting due dates
            task.setDueDate(updatedDetails.getDueDate());
            
            task.setUpdatedAt(Instant.now());

            Task savedTask = taskRepository.save(task);
            return ResponseEntity.ok(savedTask);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // DELETE /tasks/{id} - Delete task record
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable String id) {
        try {
            User user = getAuthenticatedUser();
            Optional<Task> existingTaskOpt = taskRepository.findById(id);

            if (existingTaskOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Task task = existingTaskOpt.get();
            // Verify ownership scope
            if (!task.getUserId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            taskRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
