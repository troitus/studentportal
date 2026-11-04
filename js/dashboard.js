// --- SESSION & BACK-BUTTON SECURITY GUARDS ---
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    // Force replace window location so dashboard entry is cleared from history
    window.location.replace('login.html');
  }
}

// 1. Initial verification on script load
checkAuth();

// 2. Prevent back-button restore via browser Back-Forward Cache (bfcache)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    checkAuth();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userGreeting = document.getElementById('userGreeting');
  if (userGreeting && user.name) {
    userGreeting.innerText = `Welcome, ${user.name}`;
  }

  fetchQuizzes();
});

async function fetchQuizzes() {
  const container = document.getElementById('quizContainer');
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE_URL}/quizzes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      logout();
      return;
    }

    const quizzes = await res.json();

    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="card border-0 shadow-sm p-4">
            <i class="bi bi-inbox display-4 text-muted mb-2"></i>
            <h5 class="fw-bold">No Examination Papers Available</h5>
            <p class="text-muted small">Faculty has not published any tests yet. Check back soon!</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = quizzes.map((quiz) => `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
          <div class="card-header bg-primary-subtle border-0 py-3 d-flex justify-content-between align-items-center">
            <span class="badge bg-primary px-3 py-2">${quiz.category}</span>
            <span class="badge bg-dark px-3 py-2"><i class="bi bi-clock me-1"></i>${quiz.duration} Mins</span>
          </div>
          <div class="card-body d-flex flex-column p-4">
            <h5 class="card-title fw-bold mb-2">${quiz.title}</h5>
            <p class="card-text text-muted small flex-grow-1">
              Questions: <strong>${quiz.questions ? quiz.questions.length : 0}</strong>
            </p>
            <button onclick="startQuiz('${quiz._id}')" class="btn btn-primary w-100 fw-bold mt-3 shadow-sm py-2">
              Start Exam <i class="bi bi-play-circle me-1"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger text-center">Failed to load test series. Check server connection.</div>
      </div>
    `;
  }
}

function startQuiz(quizId) {
  window.location.href = `quiz.html?id=${quizId}`;
}

// Secure Logout function
function logout() {
  localStorage.clear();
  window.location.replace('login.html');
}