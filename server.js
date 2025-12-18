const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());

/* =====================
   DATABASE CONNECTION
===================== */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

/* =====================
   PROJECT SCHEMA
===================== */
const projectSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    title: String,
    type: String,
    description: String,
    deadline: String
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

/* =====================
   AUTH MIDDLEWARE
===================== */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

/* =====================
   ROUTES
===================== */

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/* ---------- PUBLIC ROUTE ---------- */
// Anyone can submit a project (NO TOKEN)
app.post("/api/projects", async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.json({ message: "Project submitted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit project" });
  }
});

/* ---------- ADMIN LOGIN ---------- */
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

/* ---------- ADMIN ROUTE ---------- */
// Admin can view all projects (TOKEN REQUIRED)
app.get("/api/admin/projects", authenticateToken, async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

/* =====================
   SERVER START
===================== */
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
