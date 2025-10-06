const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // prevent default form submission

  const empcode = document.getElementById('empcode').value.trim();
  const password = document.getElementById('password').value;

  // Clear previous message
  messageDiv.textContent = '';

  // Make a fetch POST request to backend login API
  try {
    const response = await fetch('login_api.php', { // backend endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empcode, password })
    });

    const data = await response.json();

    if (data.success) {
      messageDiv.style.color = 'green';
      messageDiv.textContent = `✅ Login successful! Welcome, ${data.empname}`;
      // Redirect after 1 second
      setTimeout(() => {
        window.location.href = 'main.html';
      }, 1000);
    } else {
      messageDiv.style.color = 'red';
      messageDiv.textContent = `❌ ${data.message}`;
    }
  } catch (err) {
    console.error(err);
    messageDiv.style.color = 'red';
    messageDiv.textContent = '❌ Server error. Please try again later.';
  }
});
