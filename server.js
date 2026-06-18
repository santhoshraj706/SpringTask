import express from "express";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON body parsing and standard express parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database configuration — loaded from environment variables only (never hardcode secrets)
const mongoURI = process.env.MONGODB_URI?.trim();
const dbName = (process.env.MONGODB_DB || "todo_database").trim();

// Define MongoDB Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: { type: [String], default: ["ROLE_USER"] },
});

const RealUserModel = mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  completed: { type: Boolean, default: false },
  priority: { type: String, default: "MEDIUM" },
  category: { type: String, default: "Personal" },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const RealTaskModel = mongoose.model("Task", taskSchema);

// Connection state and health indicators
let isMongoConnected = false;
const inMemoryUsers = [];
const inMemoryTasks = [];

// Helper to match a query object against an entity-like document in sandbox fallback mode
function matchesQuery(item, query) {
  if (!query || typeof query !== "object") return true;
  for (const key of Object.keys(query)) {
    if (key === "$or") {
      const orConditions = query.$or;
      let matched = false;
      for (const cond of orConditions) {
        if (matchesQuery(item, cond)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
      continue;
    }

    const val = query[key];
    const itemVal = item[key];

    if (val instanceof RegExp) {
      if (!itemVal || !val.test(itemVal.toString())) {
        return false;
      }
    } else if (val && typeof val === "object" && val.constructor.name === "ObjectId") {
      if (!itemVal || itemVal.toString() !== val.toString()) {
        return false;
      }
    } else {
      const targetValStr = val?.toString();
      const itemValStr = itemVal?.toString();
      if (itemValStr !== targetValStr) {
        return false;
      }
    }
  }
  return true;
}

// Find multiple elements in-memory and support standard chained query operations
function findInMemory(collection, query) {
  const exec = async () => {
    return collection.filter(item => matchesQuery(item, query));
  };

  const chain = {
    sort: (sortSpec) => {
      const keys = Object.keys(sortSpec);
      return {
        then: async (resolve) => {
          let results = await exec();
          if (keys.length > 0) {
            const sortKey = keys[0];
            const sortDir = sortSpec[sortKey];
            results = [...results].sort((a, b) => {
              const valA = a[sortKey];
              const valB = b[sortKey];
              if (valA instanceof Date && valB instanceof Date) {
                return sortDir === -1 ? valB.getTime() - valA.getTime() : valA.getTime() - valB.getTime();
              }
              if (valA < valB) return sortDir === -1 ? 1 : -1;
              if (valA > valB) return sortDir === -1 ? -1 : 1;
              return 0;
            });
          }
          resolve(results);
        }
      };
    },
    then: async (resolve) => {
      const results = await exec();
      resolve(results);
    }
  };

  return chain;
}

// Find single document matching query pattern in memory
async function findOneInMemory(collection, query) {
  const found = collection.find(item => matchesQuery(item, query));
  if (!found) return null;
  return makeSaveable(found, collection);
}

// Intercept save operations on documents so modifications are persistent instantly
function makeSaveable(doc, collection) {
  return new Proxy(doc, {
    get(target, prop, receiver) {
      if (prop === "save") {
        return async function() {
          const index = collection.findIndex(item => item._id.toString() === target._id.toString());
          if (index !== -1) {
            collection[index] = target;
          }
          return makeSaveable(target, collection);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      return Reflect.set(target, prop, value, receiver);
    }
  });
}

// Inserts single item structured safely matching schema properties
async function createSingleInMemory(collection, data, entityName) {
  const _id = new mongoose.Types.ObjectId();
  const newItem = {
    _id,
    id: _id,
    createdAt: new Date(),
    ...data,
  };
  const saveable = makeSaveable(newItem, collection);
  collection.push(newItem);
  return saveable;
}

// Creates smart intercept Proxy surrounding original Mongoose Models
const createModelWrapper = (realModel, inMemoryCollection, entityName) => {
  return new Proxy(realModel, {
    get(target, prop, receiver) {
      if (isMongoConnected || process.env.VERCEL === "1") {
        return Reflect.get(target, prop, receiver);
      }

      if (prop === "countDocuments") {
        return async (query) => {
          if (query) {
            return inMemoryCollection.filter(item => matchesQuery(item, query)).length;
          }
          return inMemoryCollection.length;
        };
      }

      if (prop === "findById") {
        return async (id) => {
          const stringId = id?.toString() || id;
          const found = inMemoryCollection.find(item => item._id.toString() === stringId || item.id === stringId);
          return found || null;
        };
      }

      if (prop === "findOne") {
        return async (query) => {
          return findOneInMemory(inMemoryCollection, query);
        };
      }

      if (prop === "find") {
        return (query) => {
          return findInMemory(inMemoryCollection, query);
        };
      }

      if (prop === "create") {
        return async (data) => {
          if (Array.isArray(data)) {
            const results = [];
            for (const item of data) {
              results.push(await createSingleInMemory(inMemoryCollection, item, entityName));
            }
            return results;
          }
          return await createSingleInMemory(inMemoryCollection, data, entityName);
        };
      }

      if (prop === "deleteOne") {
        return async (query) => {
          const deletedIndex = inMemoryCollection.findIndex(item => matchesQuery(item, query));
          if (deletedIndex !== -1) {
            inMemoryCollection.splice(deletedIndex, 1);
            return { deletedCount: 1 };
          }
          return { deletedCount: 0 };
        };
      }

      return Reflect.get(target, prop, receiver);
    }
  });
};

// Expose safe shadows of schemas to controllers
const UserModel = createModelWrapper(RealUserModel, inMemoryUsers, "User");
const TaskModel = createModelWrapper(RealTaskModel, inMemoryTasks, "Task");

// Connection state and health indicators
let dbConnectionStatus = "Initializing...";
let lastMongoError = null;

async function connectToDatabase() {
  try {
    console.log(`Connecting to MongoDB Atlas Cluster with database: "${dbName}"...`);
    await mongoose.connect(mongoURI, {
      dbName: dbName,
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    dbConnectionStatus = "Connected";
    console.log("Successfully connected to MongoDB Atlas!");
    await seedSampleData();
  } catch (error) {
    isMongoConnected = false;
    lastMongoError = error.message;
    dbConnectionStatus = "Sandbox Fallback (Atlas access offline)";
    console.error("MongoDB Connection Failure. Gracefully falling back to Sandbox Engine:", error.message);
    await seedSampleData();
  }
}

const dbConnectionPromise = connectToDatabase();

// Middleware to ensure database connection is ready before handling any request
app.use(async (req, res, next) => {
  await dbConnectionPromise;
  next();
});

// Seed function to provide a premium starter experience
async function seedSampleData() {
  const userCount = await UserModel.countDocuments();
  if (userCount === 0) {
    console.log("No users found. Seeding default demo accounts...");
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);
    
    const adminUser = await UserModel.create({
      username: "admin",
      password: hashedPassword,
      roles: ["ROLE_USER", "ROLE_ADMIN"]
    });

    const standardUser = await UserModel.create({
      username: "user",
      password: hashedPassword,
      roles: ["ROLE_USER"]
    });

    console.log("Demo users created successfully: 'admin' and 'user' (password: 'password123')");

    await TaskModel.create([
      {
        title: "Integrate MongoDB database",
        description: "Verify connection to the user's MongoDB Atlas cluster using mongoose",
        completed: true,
        priority: "HIGH",
        category: "Work",
        dueDate: new Date(Date.now() + 3600000 * 24 * 3),
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 3600000 * 2),
        updatedAt: new Date(Date.now() - 3600000 * 2),
        createdBy: "admin",
      },
      {
        title: "Verify CRUD task operations",
        description: "Test creating, editing, and deleting items with full persistent state",
        completed: false,
        priority: "MEDIUM",
        category: "Personal",
        dueDate: new Date(Date.now() + 3600000 * 24),
        userId: adminUser._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "admin",
      },
      {
        title: "Overdue Study Session prep",
        description: "Finish reading chapters 4 to 8 of building enterprise cloud systems",
        completed: false,
        priority: "HIGH",
        category: "Study",
        dueDate: new Date(Date.now() - 3600000 * 24),
        userId: adminUser._id,
        createdAt: new Date(Date.now() - 3600000 * 48),
        updatedAt: new Date(Date.now() - 3600000 * 48),
        createdBy: "admin",
      },
      {
        title: "Submit React UI for user feedback",
        description: "Review font sizing, colors, layout components, and responsiveness",
        completed: false,
        priority: "LOW",
        category: "Work",
        dueDate: new Date(Date.now() + 3600000 * 24 * 5),
        userId: standardUser._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user",
      },
    ]);
    console.log("Sample tasks seeded successfully.");
  }
}

// Authentication Middleware
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.split(" ")[1]) || req.headers["x-auth-token"];

    if (!token) {
      return res.status(401).json({ message: "Access denied. Authentication token is missing." });
    }

    const decodedId = Buffer.from(token, "base64").toString("ascii");
    if (!mongoose.Types.ObjectId.isValid(decodedId)) {
      return res.status(403).json({ message: "Invalid authentication token format." });
    }

    const user = await UserModel.findById(decodedId);
    if (!user) {
      return res.status(403).json({ message: "User account no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired session token." });
  }
}

// Database health check endpoint
app.get("/api/db-status", (req, res) => {
  res.json({
    status: dbConnectionStatus,
    dbName: dbName,
    host: mongoURI && mongoURI.includes("@") ? mongoURI.split("@")[1].split("/")[0] : "Local/Internal",
    error: lastMongoError,
  });
});

// POST /register
app.post("/register", async (req, res) => {
  const { username, password, roles } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      username,
      password: hashedPassword,
      roles: roles || ["ROLE_USER"],
    });

    const token = Buffer.from(newUser._id.toString()).toString("base64");

    res.status(201).json({
      message: "User successfully registered.",
      user: {
        id: newUser._id,
        username: newUser.username,
        roles: newUser.roles,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering user.", error: error.message });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password credentials." });
    }

    const token = Buffer.from(user._id.toString()).toString("base64");

    res.json({
      message: "Authentication successful.",
      user: {
        id: user._id,
        username: user.username,
        roles: user.roles,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server authentication error.", error: error.message });
  }
});

// POST /logout
app.post("/logout", (req, res) => {
  res.json({ message: "Logout successful. Client session can clear local storage." });
});

// GET /tasks/search
app.get("/tasks/search", authenticateToken, async (req, res) => {
  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ message: "Search parameter 'keyword' is required." });
  }

  try {
    const regex = new RegExp(keyword.toString(), "i");
    const tasks = await TaskModel.find({
      userId: req.user._id,
      $or: [{ title: regex }, { description: regex }],
    });

    const mappedTasks = tasks.map((t) => ({
      id: t._id || t.id,
      title: t.title,
      description: t.description,
      completed: t.completed,
      priority: t.priority || "MEDIUM",
      category: t.category || "Personal",
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
      createdBy: t.createdBy,
    }));

    res.json(mappedTasks);
  } catch (error) {
    res.status(500).json({ message: "Error performing search query.", error: error.message });
  }
});

// GET /tasks/filter
app.get("/tasks/filter", authenticateToken, async (req, res) => {
  const { priority, category } = req.query;
  try {
    const queryObj = { userId: req.user._id };
    if (priority) queryObj.priority = priority;
    if (category) queryObj.category = category;

    const tasks = await TaskModel.find(queryObj);
    const mappedTasks = tasks.map((t) => ({
      id: t._id || t.id,
      title: t.title,
      description: t.description,
      completed: t.completed,
      priority: t.priority || "MEDIUM",
      category: t.category || "Personal",
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
      createdBy: t.createdBy,
    }));

    res.json(mappedTasks);
  } catch (error) {
    res.status(500).json({ message: "Error filtering tasks.", error: error.message });
  }
});

// GET /tasks/overdue
app.get("/tasks/overdue", authenticateToken, async (req, res) => {
  try {
    const queryObj = {
      userId: req.user._id,
      completed: false,
      dueDate: { $lt: new Date() },
    };

    const tasks = await TaskModel.find(queryObj);
    const mappedTasks = tasks.map((t) => ({
      id: t._id || t.id,
      title: t.title,
      description: t.description,
      completed: t.completed,
      priority: t.priority || "MEDIUM",
      category: t.category || "Personal",
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
      createdBy: t.createdBy,
    }));

    res.json(mappedTasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching overdue tasks.", error: error.message });
  }
});

// GET /tasks (paginated)
app.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const direction = req.query.direction || "desc";

    const sortDir = direction === "asc" ? 1 : -1;
    const sortObjValue = { [sortBy]: sortDir };

    let totalItems = 0;
    let tasks = [];

    if (isMongoConnected || process.env.VERCEL === "1") {
      totalItems = await RealTaskModel.countDocuments({ userId: req.user._id });
      tasks = await RealTaskModel.find({ userId: req.user._id })
        .sort(sortObjValue)
        .skip(page * size)
        .limit(size);
    } else {
      const allTasks = inMemoryTasks.filter(item => item.userId.toString() === req.user._id.toString());
      totalItems = allTasks.length;
      
      const sorted = [...allTasks].sort((a, b) => {
        const valA = a[sortBy] || a.createdAt;
        const valB = b[sortBy] || b.createdAt;
        if (valA instanceof Date && valB instanceof Date) {
          return sortDir === -1 ? valB.getTime() - valA.getTime() : valA.getTime() - valB.getTime();
        }
        if (valA < valB) return sortDir === -1 ? 1 : -1;
        if (valA > valB) return sortDir === -1 ? -1 : 1;
        return 0;
      });

      tasks = sorted.slice(page * size, page * size + size);
    }

    const mappedTasks = tasks.map((t) => ({
      id: t._id || t.id,
      title: t.title,
      description: t.description,
      completed: t.completed,
      priority: t.priority || "MEDIUM",
      category: t.category || "Personal",
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
      createdBy: t.createdBy,
    }));

    res.json({
      content: mappedTasks,
      currentPage: page,
      totalItems: totalItems,
      totalPages: Math.ceil(totalItems / size) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user tasks.", error: error.message });
  }
});

// POST /tasks
app.post("/tasks", authenticateToken, async (req, res) => {
  const { title, description, completed, priority, category, dueDate } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Task title cannot be blank." });
  }

  try {
    const newTask = await TaskModel.create({
      title,
      description: description || "",
      completed: completed === true || completed === "true",
      priority: priority || "MEDIUM",
      category: category || "Personal",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.username,
      userId: req.user._id,
    });

    res.status(201).json({
      id: newTask._id || newTask.id,
      title: newTask.title,
      description: newTask.description,
      completed: newTask.completed,
      priority: newTask.priority,
      category: newTask.category,
      dueDate: newTask.dueDate,
      createdAt: newTask.createdAt,
      updatedAt: newTask.updatedAt,
      createdBy: newTask.createdBy,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating task.", error: error.message });
  }
});

// PUT /tasks/:id
app.put("/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, completed, priority, category, dueDate } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid database standard reference id." });
  }

  try {
    const task = await TaskModel.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: `Task not found with matching ID: ${id}` });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (completed !== undefined) task.completed = completed;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    task.updatedAt = new Date();

    await task.save();

    res.json({
      id: task._id || task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      createdBy: task.createdBy,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating task record.", error: error.message });
  }
});

// DELETE /tasks/:id
app.delete("/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid database standard reference id." });
  }

  try {
    const result = await TaskModel.deleteOne({ _id: id, userId: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: `Task not found with matching ID: ${id}` });
    }

    res.json({ message: "Task successfully deleted." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task record.", error: error.message });
  }
});

// Serve static assets and templates
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully active and listening on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
