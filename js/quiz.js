// --- SESSION & BACK-BUTTON SECURITY GUARDS ---
function checkQuizAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('login.html');
  }
}

checkQuizAuth();

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    checkQuizAuth();
  }
});

const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('id');
const token = localStorage.getItem('token');

if (!quizId) {
  window.location.replace('dashboard.html');
}

let quizData = null;
let currentIdx = 0;
let userAnswers = {};
let timerInterval = null;
let timeLeft = 0;
let isSubmitted = false;

document.addEventListener('DOMContentLoaded', fetchQuiz);

async function fetchQuiz() {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      alert('Error loading exam paper.');
      window.location.replace('dashboard.html');
      return;
    }

    quizData = await res.json();
    document.getElementById('quizTitle').innerText = quizData.title;
    timeLeft = quizData.duration * 60;
    
    startTimer();
    renderQuestion();
  } catch (err) {
    alert('Server connection lost.');
    window.location.replace('dashboard.html');
  }
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert('⏰ Time expired! Your exam will be submitted automatically.');
      submitQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerElem = document.getElementById('timer');
  if (timerElem) {
    timerElem.innerHTML = `<i class="bi bi-clock me-1"></i> ${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (timeLeft < 120) {
      timerElem.className = 'badge bg-danger fs-5 px-3 py-2 shadow-sm animate-pulse';
    }
  }
}

function renderQuestion() {
  if (!quizData || !quizData.questions) return;

  const q = quizData.questions[currentIdx];
  const quizBox = document.getElementById('quizBox');
  document.getElementById('questionProgress').innerText = `Question ${currentIdx + 1} of ${quizData.questions.length}`;

  quizBox.innerHTML = `
    <h5 class="fw-bold mb-4">${currentIdx + 1}. ${q.questionText}</h5>
    <div class="d-flex flex-column gap-2 mb-4">
      ${q.options.map((opt, oIdx) => {
        const isSelected = userAnswers[currentIdx] === oIdx;
        return `
          <button 
            type="button" 
            onclick="selectOption(${oIdx})" 
            class="btn text-start p-3 border rounded-3 d-flex align-items-center justify-content-between ${
              isSelected ? 'btn-primary' : 'btn-outline-secondary'
            }"
          >
            <span><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${opt}</span>
            ${isSelected ? '<i class="bi bi-check-circle-fill"></i>' : ''}
          </button>
        `;
      }).join('')}
    </div>
    <div class="d-flex justify-content-between border-top pt-3">
      <button 
        onclick="prevQuestion()" 
        class="btn btn-outline-secondary" 
        ${currentIdx === 0 ? 'disabled' : ''}
      >
        Previous
      </button>

      ${currentIdx === quizData.questions.length - 1 
        ? `<button onclick="submitQuiz()" class="btn btn-success fw-bold px-4">Submit Exam</button>` 
        : `<button onclick="nextQuestion()" class="btn btn-primary px-4">Next Question</button>`
      }
    </div>
  `;
}

function selectOption(oIdx) {
  if (isSubmitted) return;
  userAnswers[currentIdx] = oIdx;
  renderQuestion();
}

function nextQuestion() {
  if (currentIdx < quizData.questions.length - 1) {
    currentIdx++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIdx > 0) {
    currentIdx--;
    renderQuestion();
  }
}

async function submitQuiz() {
  if (isSubmitted) return;
  isSubmitted = true;
  clearInterval(timerInterval);

  const answersArray = quizData.questions.map((_, idx) => userAnswers[idx]);

  try {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ answers: answersArray })
    });

    const result = await res.json();
    displayResults(result);
  } catch (err) {
    alert('Error submitting responses.');
  }
}

function displayResults(result) {
  document.getElementById('quizBox').classList.add('d-none');
  const resultBox = document.getElementById('resultBox');
  resultBox.classList.remove('d-none');

  resultBox.innerHTML = `
    <div class="text-center mb-4">
      <i class="bi bi-trophy display-3 text-warning mb-2"></i>
      <h3 class="fw-bold">Exam Submitted Successfully!</h3>
      <p class="text-muted">Paper: <strong>${quizData.title}</strong></p>
    </div>

    <div class="row g-3 mb-4 text-center">
      <div class="col-4">
        <div class="p-3 bg-body-tertiary rounded-3 border">
          <small class="text-muted d-block">Score</small>
          <span class="fs-3 fw-bold">${result.score} / ${result.totalQuestions}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="p-3 bg-body-tertiary rounded-3 border">
          <small class="text-muted d-block">Percentage</small>
          <span class="fs-3 fw-bold text-primary">${result.percentage}%</span>
        </div>
      </div>
      <div class="col-4">
        <div class="p-3 bg-body-tertiary rounded-3 border">
          <small class="text-muted d-block">Status</small>
          <span class="fs-3 fw-bold ${result.percentage >= 40 ? 'text-success' : 'text-danger'}">
            ${result.percentage >= 40 ? 'PASS' : 'FAIL'}
          </span>
        </div>
      </div>
    </div>

    <h5 class="fw-bold mb-3 border-bottom pb-2">Answer Breakdown & Explanations</h5>
    ${result.detailedResults.map((item, idx) => `
      <div class="card mb-3 border-start border-4 ${item.isCorrect ? 'border-success bg-success-subtle' : 'border-danger bg-danger-subtle'}">
        <div class="card-body">
          <h6 class="fw-bold">${idx + 1}. ${item.questionText}</h6>
          <div class="small mt-2">
            <div>Your Answer: <strong class="${item.isCorrect ? 'text-success' : 'text-danger'}">${item.userAnswer}</strong></div>
            ${!item.isCorrect ? `<div>Correct Answer: <strong class="text-success">${item.correctAnswer}</strong></div>` : ''}
          </div>
        </div>
      </div>
    `).join('')}

    <div class="text-center mt-4">
      <button onclick="window.location.replace('dashboard.html')" class="btn btn-primary fw-bold px-4 py-2">Return to Dashboard</button>
    </div>
  `;
}