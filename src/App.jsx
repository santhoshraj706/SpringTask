import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3, 
  Search, 
  Plus, 
  LogOut, 
  User, 
  Lock, 
  Shield, 
  X, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Check,
  Calendar,
  Flag,
  Briefcase,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Clock,
  User2
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  // Authentication & Session State
  const [token, setToken] = useState(() => localStorage.getItem("auth_token"));
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("current_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Auth form states
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Core Tasks States
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Expanded View Navigation
  const [currentView, setCurrentView] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  // Form states for adding tasks
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newCategory, setNewCategory] = useState("Work");
  const [newDueDate, setNewDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Edit states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editCategory, setEditCategory] = useState("Work");
  const [editDueDate, setEditDueDate] = useState("");

  // Sync state helpers to localStorage
  const handleLoginSuccess = (user, userToken) => {
    localStorage.setItem("auth_token", userToken);
    localStorage.setItem("current_user", JSON.stringify(user));
    setToken(userToken);
    setCurrentUser(user);
    setAuthError(null);
  };

  const handleLogout = async () => {
    try {
      await fetch("/logout", { method: "POST" });
    } catch (e) {
      // Ignored: cleanup client session anyway
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_user");
    setToken(null);
    setCurrentUser(null);
    setTasks([]);
  };

  // Fetch Overdue Count dynamically
  const fetchOverdueCount = async () => {
    if (!token) return;
    try {
      const res = await fetch("/tasks/overdue", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOverdueCount(data.length);
      }
    } catch (e) {
      // Quietly fail for stats
    }
  };

  // Fetch Tasks based on active constraints
  const fetchTasks = async () => {
    if (!token) return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      let url = `/tasks?page=${currentPage}&size=${pageSize}&sortBy=${sortBy}&direction=${sortDir}`;
      
      if (currentView === "OVERDUE") {
        url = `/tasks/overdue`;
      } else if (currentView === "FILTER") {
        const params = [];
        if (selectedPriority) params.push(`priority=${selectedPriority}`);
        if (selectedCategory) params.push(`category=${selectedCategory}`);
        url = `/tasks/filter?${params.join("&")}`;
      } else if (currentView === "SEARCH" && searchQuery.trim()) {
        url = `/tasks/search?keyword=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (currentView === "ALL") {
          setTasks(data.content || []);
          setTotalPages(data.totalPages || 1);
          setTotalItems(data.totalItems || 0);
        } else {
          setTasks(data || []);
          setTotalPages(1);
          setTotalItems(data.length || 0);
          setCurrentPage(0);
        }
      } else {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
        } else {
          setTasksError("Failed to fetch task elements based on parameters.");
        }
      }
    } catch (e) {
      setTasksError("Error establishing a stable connection to the database layer.");
    } finally {
      setTasksLoading(false);
    }
  };

  // Trigger task load & overdue status monitoring
  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchOverdueCount();
    }
  }, [token, currentView, currentPage, pageSize, sortBy, sortDir, selectedPriority, selectedCategory]);

  // Debounced search queries matching search endpoint
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        setCurrentView("SEARCH");
        fetchTasks();
      } else if (currentView === "SEARCH") {
        setCurrentView("ALL");
        setCurrentPage(0);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Gates: login / register
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError("Requires username and password validation.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const url = isRegisterMode ? "/register" : "/login";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegisterMode) {
          setAuthSuccess("Enterprise credentials provisioned successfully!");
          setIsRegisterMode(false);
          setPassword("");
        } else {
          handleLoginSuccess(data.user, data.token);
          setUsername("");
          setPassword("");
        }
      } else {
        setAuthError(data.message || "Security authorization failed.");
      }
    } catch (e) {
      setAuthError("Network exception negotiating with security gateway.");
    } finally {
      setAuthLoading(false);
    }
  };

  // CRUD Operations: Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const bodyPayload = {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        category: newCategory,
        dueDate: newDueDate || undefined
      };

      const res = await fetch("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewDueDate("");
        setIsAddingTask(false);
        fetchTasks();
        fetchOverdueCount();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "Failed to commit record.");
      }
    } catch (e) {
      alert("Error sending serialization task block.");
    }
  };

  // CRUD Operations: Toggle checked
  const handleToggleTask = async (task) => {
    try {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));

      const res = await fetch(`/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: !task.completed
        })
      });

      if (res.ok) {
        fetchOverdueCount();
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Error validating toggles.");
      }
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
    }
  };

  // CRUD Operations: Save edits
  const handleSaveTextEdit = async (id) => {
    if (!editTitle.trim()) return;

    try {
      const res = await fetch(`/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          category: editCategory,
          dueDate: editDueDate || null
        })
      });

      if (res.ok) {
        setEditingTaskId(null);
        fetchTasks();
        fetchOverdueCount();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to save updates.");
      }
    } catch (e) {
      alert("Exception negotiating PUT request.");
    }
  };

  // CRUD Operations: Delete tasks
  const handleDeleteTask = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const res = await fetch(`/tasks/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchTasks();
        fetchOverdueCount();
      } else {
        alert("Could not remove task asset.");
      }
    } catch (e) {
      alert("Negotiation failure on task deletion request.");
    }
  };

  // Filter triggers from Sidebar
  const selectPriorityFilter = (priority) => {
    setSelectedPriority(priority);
    setSelectedCategory(null);
    setCurrentView("FILTER");
  };

  const selectCategoryFilter = (category) => {
    setSelectedCategory(category);
    setSelectedPriority(null);
    setCurrentView("FILTER");
  };

  const selectAllTasks = () => {
    setCurrentView("ALL");
    setSelectedPriority(null);
    setSelectedCategory(null);
    setCurrentPage(0);
  };

  const selectOverdueView = () => {
    setCurrentView("OVERDUE");
    setSelectedPriority(null);
    setSelectedCategory(null);
    setCurrentPage(0);
  };

  // Check if a task is overdue
  const isOverdue = (task) => {
    if (task.completed || !task.dueDate) return false;
    return new Date(task.dueDate).getTime() < Date.now();
  };

  // Helper Auto-Fill Creds
  const handleAutoFill = () => {
    setUsername("user");
    setPassword("password123");
  };

  return (
    <div className="relative min-h-screen text-slate-200 font-sans flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Mesh background gradient */}
      <div className="mesh-gradient absolute inset-0 z-[-1] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="glass sticky top-0 z-50 shadow-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-linear-to-tr from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-md font-extrabold text-white tracking-tight leading-none">SpringTask</h1>
              <span className="text-[9px] font-semibold text-indigo-300 mt-1 inline-block uppercase tracking-wider font-mono">
                Enterprise Dashboard
              </span>
            </div>
          </div>

          {currentUser ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl text-xs">
                <Shield className="w-3.5 h-3.5 text-indigo-300" />
                <span className="font-semibold text-white">{currentUser.username}</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase bg-white/5 px-1 py-0.5 rounded">
                  {currentUser.roles[0]?.replace("ROLE_", "") || "USER"}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-1.5 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-slate-300 hover:text-rose-300 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="text-[10px] uppercase font-mono tracking-wider bg-white/5 text-slate-400 border border-white/5 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Spring Security Authenticated Environment</span>
            </div>
          )}
        </div>
      </header>

      {/* CORE WRAPPER CONTENT */}
      {currentUser ? (
        <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 relative">
          
          {/* LEFT COLUMN MODULE: NAVIGATION & FILTERS SYSTEM */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Quick Navigation Panel */}
            <div className="glass rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Views</p>
              
              <div className="space-y-1">
                <button
                  onClick={selectAllTasks}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    currentView === "ALL" && !selectedPriority && !selectedCategory
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Filter className="w-3.5 h-3.5" />
                    <span>All Tasks</span>
                  </div>
                </button>

                <button
                  onClick={selectOverdueView}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    currentView === "OVERDUE"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Overdue Tracker</span>
                  </div>
                  {overdueCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 animate-pulse">
                      {overdueCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Priority filters */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Priority Filters</p>
                <div className="space-y-1">
                  {["LOW", "MEDIUM", "HIGH"].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => selectPriorityFilter(priority)}
                      className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                        currentView === "FILTER" && selectedPriority === priority
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        priority === "HIGH" ? "bg-rose-500" : priority === "MEDIUM" ? "bg-amber-500" : "bg-blue-400"
                      }`} />
                      <span className="capitalize">{priority.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category filters */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Category Filters</p>
                <div className="space-y-1">
                  {["Work", "Personal", "Study"].map((category) => (
                    <button
                      key={category}
                      onClick={() => selectCategoryFilter(category)}
                      className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                        currentView === "FILTER" && selectedCategory === category
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      {category === "Work" ? (
                        <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      ) : category === "Personal" ? (
                        <User2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span>{category}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick Add CTA toggle button */}
            {!isAddingTask && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/15 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Create Custom Task</span>
              </button>
            )}

          </div>

          {/* RIGHT COLUMN MODULE: TASK MANAGEMENT workspace */}
          <div className="md:col-span-9 flex flex-col space-y-6">
            
            {/* Top Toolbar */}
            <div className="glass p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* Instant Search */}
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Instant search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-10 pr-9 py-3 rounded-xl outline-hidden transition glass-input font-medium placeholder-slate-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sorting selectors */}
              {currentView === "ALL" && (
                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-medium">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => { setSortBy(e.target.value); setCurrentPage(0); }}
                      className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1 text-xs text-white focus:outline-hidden"
                    >
                      <option value="createdAt">Date Created</option>
                      <option value="title">Title</option>
                      <option value="dueDate">Due Date</option>
                      <option value="priority">Priority</option>
                    </select>
                  </div>

                  <div className="flex bg-slate-950/40 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setSortDir("asc")}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${sortDir === "asc" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Asc
                    </button>
                    <button
                      onClick={() => setSortDir("desc")}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${sortDir === "desc" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      Desc
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Creation Card Panel */}
            <AnimatePresence>
              {isAddingTask && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass rounded-2xl shadow-lg border border-indigo-500/10 overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Plus className="w-4.5 h-4.5 text-indigo-400" />
                        <span>Define Custom Task Record</span>
                      </h3>
                      <button
                        onClick={() => setIsAddingTask(false)}
                        className="text-slate-500 hover:text-white transition"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Task Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g., Deploy and configure server filters"
                          className="w-full text-xs px-4 py-2.5 rounded-xl outline-hidden transition glass-input"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Additional Description
                        </label>
                        <textarea
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="Summarize objectives, goals, and notes..."
                          rows={2}
                          className="w-full text-xs px-4 py-2.5 rounded-xl outline-hidden transition resize-none glass-input"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Task Priority
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {["LOW", "MEDIUM", "HIGH"].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewPriority(p)}
                              className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                newPriority === p
                                  ? p === "HIGH" ? "bg-rose-500/20 text-rose-300 border-rose-500/35" : p === "MEDIUM" ? "bg-amber-500/20 text-amber-300 border-amber-500/35" : "bg-blue-500/20 text-blue-300 border-blue-500/35"
                                  : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-white"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Category Segment
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {["Work", "Personal", "Study"].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setNewCategory(cat)}
                              className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                newCategory === cat
                                  ? "bg-indigo-600/25 border-indigo-500/30 text-indigo-300"
                                  : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-white"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Due Date Reminder
                        </label>
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="w-full text-xs px-4 py-2.5 rounded-xl outline-hidden transition glass-input"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 sm:col-span-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setIsAddingTask(false)}
                          className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold rounded-lg transition"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          disabled={!newTitle.trim()}
                          className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold uppercase tracking-wider rounded-lg border border-indigo-500/30 transition shadow-md cursor-pointer inline-flex items-center space-x-2"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Assign Task</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Indicators */}
            {tasksError && (
              <div className="bg-rose-500/10 text-rose-200 p-4 rounded-xl border border-rose-500/10 flex items-center space-x-3 text-xs leading-relaxed">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{tasksError}</span>
              </div>
            )}

            {/* MAIN TASKS WORKSPACE VIEW */}
            <div className="flex-1 glass rounded-2xl shadow-sm overflow-hidden flex flex-col border border-white/5">
              
              {/* Workspace Header */}
              <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-white/3">
                <div>
                  <h3 className="font-bold text-white text-xs tracking-wider uppercase text-indigo-300">
                    {currentView === "ALL" && "All Enlisted Tasks"}
                    {currentView === "OVERDUE" && "Overdue Deadlines"}
                    {currentView === "FILTER" && `Filtered: ${selectedPriority || selectedCategory}`}
                    {currentView === "SEARCH" && `Search results for "${searchQuery}"`}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {currentView === "ALL" ? `Displaying page items` : "Isolated filters results"}
                  </p>
                </div>

                <span className="text-[9px] font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                  {totalItems} total matches
                </span>
              </div>

              {/* Tasks List */}
              <div className="p-6 space-y-4 flex-1">
                {tasksLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex space-x-4 animate-pulse bg-white/3 p-5 rounded-2xl border border-white/5">
                        <div className="rounded-full bg-white/10 h-5 w-5 mt-1"></div>
                        <div className="flex-1 space-y-2.5 py-1">
                          <div className="h-4 bg-white/10 rounded w-1/5"></div>
                          <div className="h-3 bg-white/5 rounded w-3/5"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="py-14 text-center space-y-4">
                    <div className="inline-flex bg-white/3 border border-white/5 p-4 rounded-full text-indigo-300">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div className="max-w-xs mx-auto space-y-1">
                      <p className="font-bold text-white text-xs">No active records enqueued</p>
                      <p className="text-slate-400 text-[10px]">
                        {searchQuery
                          ? "Adjust search keywords to query other tasks."
                          : "Create custom tasks to start tracking metrics!"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {tasks.map((task) => {
                        const taskPastDue = isOverdue(task);
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className={`task-card p-5 rounded-2xl flex items-start space-x-4 ${task.completed ? 'opacity-70 bg-white/1 hover:bg-white/2' : ''}`}
                          >
                            
                            {/* Toggle Completes Checkbox */}
                            <button
                              onClick={() => handleToggleTask(task)}
                              className="mt-1 shrink-0 text-slate-500 hover:text-emerald-400 transition cursor-pointer"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500" />
                              )}
                            </button>

                            {/* Task Content segment */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {editingTaskId === task.id ? (
                                /* Inline Editing view */
                                <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-white/5 mt-1">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Title</label>
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full text-xs font-semibold bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-hidden"
                                      />
                                    </div>

                                    <div className="sm:col-span-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                                      <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full text-xs text-slate-300 bg-slate-900 border border-white/5 rounded-lg px-3 py-2 focus:outline-hidden resize-none"
                                        rows={2}
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Priority</label>
                                      <select
                                        value={editPriority}
                                        onChange={(e) => setEditPriority(e.target.value)}
                                        className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-hidden w-full"
                                      >
                                        <option value="LOW">LOW</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                                      <select
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                        className="bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-hidden w-full"
                                      >
                                        <option value="Work">Work</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Study">Study</option>
                                      </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Due Date</label>
                                      <input
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="w-full text-xs bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-white"
                                      />
                                    </div>

                                    <div className="sm:col-span-2 flex space-x-2 justify-end pt-2 border-t border-white/5">
                                      <button
                                        type="button"
                                        onClick={() => setEditingTaskId(null)}
                                        className="px-3 py-1.5 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 font-semibold"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveTextEdit(task.id)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-500/20 inline-flex items-center space-x-1"
                                      >
                                        <Save className="w-3 h-3" />
                                        <span>Save Changes</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Normal Details render */
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    
                                    {/* Priority badge */}
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                                      task.priority === "HIGH" 
                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/15" 
                                        : task.priority === "MEDIUM"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
                                        : "bg-blue-500/10 text-blue-400 border-blue-500/15"
                                    }`}>
                                      <span className={`w-1 h-1 rounded-full mr-1.5 ${
                                        task.priority === "HIGH" ? "bg-rose-500" : task.priority === "MEDIUM" ? "bg-amber-500" : "bg-blue-400"
                                      }`} />
                                      {task.priority || "MEDIUM"}
                                    </span>

                                    {/* Category pill */}
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-300 border border-white/5">
                                      {task.category === "Work" ? (
                                        <Briefcase className="w-2.5 h-2.5 text-indigo-400 mr-1.5 animate-pulse" />
                                      ) : task.category === "Personal" ? (
                                        <User2 className="w-2.5 h-2.5 text-emerald-400 mr-1.5" />
                                      ) : (
                                        <BookOpen className="w-2.5 h-2.5 text-purple-400 mr-1.5" />
                                      )}
                                      {task.category || "Personal"}
                                    </span>

                                    {/* Due Date Indicator */}
                                    {task.dueDate && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border ${
                                        taskPastDue
                                          ? "bg-rose-500/15 text-rose-300 border-rose-500/25 animate-pulse"
                                          : "bg-slate-800 text-slate-300 border-white/5"
                                      }`}>
                                        <Calendar className="w-2.5 h-2.5 mr-1" />
                                        {taskPastDue ? (
                                          <span className="font-extrabold flex items-center">
                                            Overdue: {new Date(task.dueDate).toLocaleDateString(undefined, {month: "short", day: "numeric"})}
                                          </span>
                                        ) : (
                                          <span>Due: {new Date(task.dueDate).toLocaleDateString(undefined, {month: "short", day: "numeric"})}</span>
                                        )}
                                      </span>
                                    )}

                                  </div>

                                  <h4 className={`text-md font-bold text-white tracking-tight ${task.completed ? 'line-through text-slate-400/70 font-medium' : ''}`}>
                                    {task.title}
                                  </h4>

                                  {task.description && (
                                    <p className={`text-xs text-slate-400 leading-relaxed max-w-2xl ${task.completed ? 'text-slate-500/75 line-through' : ''}`}>
                                      {task.description}
                                    </p>
                                  )}

                                  {/* Audit trail details */}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] text-slate-500 font-mono pt-2 border-t border-white/5">
                                    <span className="flex items-center">
                                      <Clock className="w-2.5 h-2.5 mr-1 text-slate-600" />
                                      Enlisted {new Date(task.createdAt).toLocaleDateString()} at {new Date(task.createdAt).toLocaleTimeString(undefined, {hour: "2-digit", minute:"2-digit"})}
                                    </span>
                                    {task.createdBy && (
                                      <span className="flex items-center">
                                        <User className="w-2.5 h-2.5 mr-1 text-slate-600" />
                                        Created by: <span className="text-slate-400 ml-1 font-semibold">{task.createdBy}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Option actions panel */}
                            {editingTaskId !== task.id && (
                              <div className="flex space-x-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditTitle(task.title);
                                    setEditDescription(task.description || "");
                                    setEditPriority(task.priority || "MEDIUM");
                                    setEditCategory(task.category || "Work");
                                    setEditDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-white/5 transition cursor-pointer"
                                  title="Edit details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Pagination Footer */}
              {currentView === "ALL" && totalPages > 1 && (
                <div className="border-t border-white/5 px-6 py-4 bg-white/1 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Showing page <strong className="text-white font-semibold font-mono">{currentPage + 1}</strong> of <strong className="text-white font-semibold font-mono">{totalPages}</strong>
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </main>
      ) : (
        /* LANDING & ACCOUNT AUTHENTICATION PORTAL */
        <main className="flex-1 flex flex-col justify-center py-12 px-6">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* SaaS App Header branding */}
            <div className="text-center space-y-2">
              <div className="inline-flex bg-indigo-600 text-white p-4.5 rounded-2xl shadow-xl shadow-indigo-600/15 mb-2">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                SpringTask System
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                A clean, secure, production-grade tasks management gateway powered by Spring Security, Spring Boot, and custom MongoDB storage.
              </p>
            </div>

            {/* Authentication UI Form card */}
            <div className="glass rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setAuthError(null); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${!isRegisterMode ? 'bg-white/10 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setAuthError(null); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${isRegisterMode ? 'bg-white/10 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="bg-rose-500/10 text-rose-200 border border-rose-500/15 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs leading-relaxed">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="bg-emerald-500/10 text-emerald-200 border border-emerald-500/15 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs leading-relaxed">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter legal username"
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl outline-hidden transition glass-input font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl outline-hidden transition glass-input font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold text-xs uppercase tracking-widest text-white py-3.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/15 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{isRegisterMode ? "Register Account" : "Sign In"}</span>
                  )}
                </button>
              </form>
            </div>

            {/* Micro Demo auto-fill */}
            <div className="text-center">
              <button 
                type="button"
                onClick={handleAutoFill}
                className="text-[11px] text-slate-400 hover:text-indigo-300 font-mono transition inline-flex items-center space-x-1.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg hover:border-indigo-500/20"
              >
                <span>Click to Auto-fill demo credentials:</span>
                <span className="font-bold text-white uppercase tracking-wider text-[10px] bg-slate-900 border border-white/10 px-1.5 py-0.5 rounded">
                  user
                </span>
              </button>
            </div>

          </div>
        </main>
      )}

      {/* FOOTER */}
      <footer className="glass border-t border-white/5 py-4 mt-8 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1">
            <span>Enterprise System engineered with</span>
            <a href="https://spring.io" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white underline font-medium">Spring Boot &amp; Security</a>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1 sm:mt-0">
            Node Gateway Proxy Active
          </div>
        </div>
      </footer>

    </div>
  );
}
