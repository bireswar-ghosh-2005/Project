/*************************
 * ENV & IMPORTS
 *************************/
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

/*************************
 * DATABASE CONNECTION
 *************************/
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

/*************************
 * SCHEMA & MODEL
 *************************/
const ProjectSchema = new mongoose.Schema({
  name: String,
  email: String,
  title: String,
  type: String,
  description: String,
  deadline: String,
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model("Project", ProjectSchema);

/*************************
 * ADMIN LOGIN (JWT)
 *************************/
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

/*************************
 * AUTH MIDDLEWARE
 *************************/
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
}

/*************************
 * ROUTES
 *************************/

// Public: submit project
app.post("/api/projects", async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json({ message: "Project submitted" });
  } catch (err) {
    res.status(500).json({ error: "Submission failed" });
  }
});

// Protected: admin view projects
app.get("/api/projects", verifyAdmin, async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

/*************************
 * START SERVER
 *************************/
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
