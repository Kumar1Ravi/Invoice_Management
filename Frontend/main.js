// frontend/main.js

document.getElementById("login-form").addEventListener("submit", async function(e) {
    e.preventDefault(); // Prevent form submission

    const empcode = document.getElementById("empcode").value.trim();
    const password = document.getElementById("password").value;

    const messageDiv = document.getElementById("message");
    messageDiv.textContent = "Logging in...";

    try {
        const response = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ empcode, password })
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.style.color = "green";
            messageDiv.textContent = `✅ Login successful! Welcome, ${data.empname}`;

            // Store empcode and empname in localStorage for later use
            localStorage.setItem("empcode", empcode);
            localStorage.setItem("empname", data.empname);

            // Redirect to main page after 1s
            setTimeout(() => {
                window.location.href = "main.html";
            }, 1000);
        } else {
            messageDiv.style.color = "red";
            messageDiv.textContent = `❌ ${data.message}`;
        }

    } catch (err) {
        console.error("Fetch error:", err);
        messageDiv.style.color = "red";
        messageDiv.textContent = "❌ Server error. Please try again later.";
    }
});


function loadPage(pageUrl, btn) {
    // Load page inside iframe
    document.getElementById('content-frame').src = pageUrl;

    // Remove active class from all buttons
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));

    // Add active to clicked button
    if(btn) btn.classList.add('active');
}

// Logout logic
document.getElementById('logoutBtn').addEventListener('click', () => {
    fetch('/api/logout', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                window.location.href = 'login.html';
            } else {
                alert('Logout failed');
            }
        });
});