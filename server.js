require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// MongoDB
// =======================
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error:", err));

// =======================
// Resend
// =======================
const resend = new Resend(process.env.RESEND_API_KEY);

// =======================
// Schema
// =======================
const projectSchema = new mongoose.Schema({
  name: String,
  email: String,
  title: String,
  type: String,
  description: String,
  deadline: String,
  status: { type: String, default: "pending" }
});

const Project = mongoose.model("Project", projectSchema);

// =======================
// Admin Login
// =======================
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { admin: true },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// =======================
// Admin Auth
// =======================
function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

// =======================
// Submit Project
// =======================
app.post("/api/projects", async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const project = new Project(req.body);
    await project.save();

    res.json({ message: "Project submitted successfully" });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: "Failed to submit project" });
  }
});

// =======================
// Admin: Get Projects
// =======================
app.get("/api/admin/projects", adminAuth, async (req, res) => {
  const projects = await Project.find().sort({ _id: -1 });
  res.json(projects);
});

// =======================
// Accept Project
// =======================
app.post("/api/admin/projects/:id/accept", adminAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });

    project.status = "accepted";
    await project.save();

    const emailResult = await resend.emails.send({
      from: "Cazzual <onboarding@resend.dev>",
      to: project.email,
      subject: "Your project has been accepted 🎉",
      html: `
        <h2>Hello ${project.name},</h2>
        <p>Your project <b>${project.title}</b> has been <b>ACCEPTED</b>.</p>
        <p>We will calculate pricing and contact you shortly.</p>
        <br/>
        <p>– Cazzual Team</p>
      `
    });

    console.log("Resend ACCEPT result:", emailResult);

    res.json({ message: "Project accepted & email sent" });
  } catch (err) {
    console.error("Accept email error:", err);
    res.status(500).json({ error: "Accept failed" });
  }
});

// =======================
// Reject Project
// =======================
app.post("/api/admin/projects/:id/reject", adminAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });

    project.status = "rejected";
    await project.save();

    const emailResult = await resend.emails.send({
      from: "Cazzual <onboarding@resend.dev>",
      to: project.email,
      subject: "Regarding your project request",
      html: `
        <h2>Hello ${project.name},</h2>
        <p>Thank you for submitting your project.</p>
        <p>Unfortunately, we are unable to take this project at the moment.</p>
        <br/>
        <p>– Cazzual Team</p>
      `
    });

    console.log("Resend REJECT result:", emailResult);

    res.json({ message: "Project rejected & email sent" });
  } catch (err) {
    console.error("Reject email error:", err);
    res.status(500).json({ error: "Reject failed" });
  }
});

// =======================
// Test Mail (IMPORTANT)
// =======================
app.get("/test-mail", async (req, res) => {
  try {
    const result = await resend.emails.send({
      from: "Cazzual <onboarding@resend.dev>",
      to: process.env.ADMIN_EMAIL,
      subject: "Resend Test Email",
      html: "<h2>Resend is working 🚀</h2>"
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error("TEST MAIL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log("Server running on port", PORT));
