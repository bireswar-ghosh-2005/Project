require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5050;

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());

/* =======================
   MONGODB CONNECTION
======================= */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* =======================
   PROJECT SCHEMA
======================= */
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

/* =======================
   ADMIN AUTH MIDDLEWARE
======================= */
function verifyAdmin(req, res, next) {
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

/* =======================
   MAIL CONFIG (MAIL_*)
======================= */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  connectionTimeout: 10000,
});

/* VERIFY MAIL ON START */
transporter.verify((err) => {
  if (err) {
    console.error("❌ Mail config error:", err.message);
  } else {
    console.log("📧 Mail server ready");
  }
});

/* SEND MAIL HELPER */
async function sendMail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Cazzual Projects" <${process.env.MAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.response);
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
}

/* =======================
   ROUTES
======================= */

/* Health check */
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

/* -----------------------
   SUBMIT PROJECT (PUBLIC)
------------------------ */
app.post("/api/projects", async (req, res) => {
  try {
    const project = new Project({
      name: req.body.name,          // ✅ FIXED
      email: req.body.email,
      title: req.body.title,
      type: req.body.type,
      description: req.body.description,
      deadline: req.body.deadline,
      status: "pending",
    });

    await project.save();

    res.status(201).json({
      message: "Project submitted successfully",
    });
  } catch (err) {
    console.error("❌ Project submission error:", err.message);
    res.status(500).json({ error: "Failed to submit project" });
  }
});

/* -----------------------
   ADMIN LOGIN
------------------------ */
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
    { expiresIn: "2h" }
  );

  res.json({ token });
});

/* -----------------------
   GET ALL PROJECTS (ADMIN)
------------------------ */
app.get("/api/admin/projects", verifyAdmin, async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

/* -----------------------
   ACCEPT PROJECT
------------------------ */
app.post(
  "/api/admin/projects/:id/accept",
  verifyAdmin,
  async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    project.status = "accepted";
    await project.save();

    await sendMail(
      project.email,
      "Your project has been accepted 🎉",
      `
        <p>Hello ${project.name},</p>
        <p>Your project <b>${project.title}</b> has been <b>ACCEPTED</b>.</p>
        <p>We are calculating pricing and will contact you shortly.</p>
        <p>— Cazzual Team</p>
      `
    );

    res.json({ message: "Project accepted" });
  }
);

/* -----------------------
   REJECT PROJECT
------------------------ */
app.post(
  "/api/admin/projects/:id/reject",
  verifyAdmin,
  async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    project.status = "rejected";
    await project.save();

    await sendMail(
      project.email,
      "Regarding your project request",
      `
        <p>Hello ${project.name},</p>
        <p>Thank you for your interest.</p>
        <p>Unfortunately, we cannot take up your project at this time.</p>
        <p>We wish you all the best.</p>
        <p>— Cazzual Team</p>
      `
    );

    res.json({ message: "Project rejected" });
  }
);

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
