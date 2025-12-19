require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5050;

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

/* ======================
   MONGODB CONNECTION
====================== */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

/* ======================
   PROJECT SCHEMA
====================== */
const projectSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    title: String,
    type: String,
    description: String,
    deadline: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

/* ======================
   ADMIN AUTH MIDDLEWARE
====================== */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ======================
   EMAIL CONFIG
====================== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendMail(to, subject, text) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
  });
}

/* ======================
   ROUTES
====================== */

/* 🔓 Health Check */
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

/* 🔓 Submit Project */
app.post("/api/projects", async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.json({ message: "Project submitted" });
  } catch {
    res.status(500).json({ error: "Submission failed" });
  }
});

/* 🔐 Admin Login */
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

/* 🔐 View All Projects */
app.get("/api/admin/projects", verifyToken, async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

/* ✅ ACCEPT PROJECT */
app.post(
  "/api/admin/projects/:id/accept",
  verifyToken,
  async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: "Project not found" });

    project.status = "accepted";
    await project.save();

    await sendMail(
      project.email,
      "Your project has been accepted 🎉",
      `Hi ${project.name},

Good news! Your project request "${project.title}" has been accepted.

We are currently calculating the pricing and timeline.
We will get back to you shortly.

Regards,
Cazzual Team`
    );

    res.json({ message: "Project accepted & email sent" });
  }
);

/* ❌ REJECT PROJECT */
app.post(
  "/api/admin/projects/:id/reject",
  verifyToken,
  async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ error: "Project not found" });

    project.status = "rejected";
    await project.save();

    await sendMail(
      project.email,
      "Regarding your project request",
      `Hi ${project.name},

Thank you for reaching out to us.

After reviewing your project "${project.title}",
we regret to inform you that we are unable to take it up at this time.

We truly appreciate your interest and wish you all the best.

Regards,
Cazzual Team`
    );

    res.json({ message: "Project rejected & email sent" });
  }
);

/* ======================
   START SERVER
====================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
