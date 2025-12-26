const form = document.getElementById("projectForm");
const messageDiv = document.getElementById("message");

// ✅ PUBLIC backend endpoint (NO TOKEN)
const API_URL =
  "https://project-backend-hybc.onrender.com/api/projects";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    title: document.getElementById("title").value,
    type: document.getElementById("type").value,
    description: document.getElementById("description").value,
    deadline: document.getElementById("deadline").value
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      messageDiv.innerHTML =
        "<p style='color:green'>✅ Project submitted successfully!</p>";
      form.reset();
    } else {
      messageDiv.innerHTML =
        "<p style='color:red'>❌ Submission failed. Try again.</p>";
    }
  } catch (err) {
    messageDiv.innerHTML =
      "<p style='color:red'>❌ Server error. Please try later.</p>";
  }
});
// Load selected stickers (if any) when index page loads
document.addEventListener("DOMContentLoaded", () => {
  const stickers = JSON.parse(localStorage.getItem("selectedStickers") || "[]");
  const input = document.getElementById("stickersInput");
  if (input) {
    input.value = stickers.join(",");
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const stickerBtn = document.getElementById("stickerBtn");
  const stickersInput = document.getElementById("stickersInput");

  // Load previously selected stickers
  const selectedStickers = JSON.parse(
    localStorage.getItem("selectedStickers") || "[]"
  );

  if (selectedStickers.length > 0) {
    stickerBtn.innerText =
      "🎁 Stickers: " + selectedStickers.join(", ");
    stickersInput.value = selectedStickers.join(",");
  }

  // Redirect to sticker page on click
  stickerBtn.addEventListener("click", () => {
    window.location.href = "sticker.html";
  });
});
