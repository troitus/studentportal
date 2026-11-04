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
let markedForReview = {};
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
      alert('Error loading SSC/Railway test paper.');
      window.location.replace('dashboard.html');
      return;
    }

    quizData = await res.json();
    document.getElementById('quizTitle').innerText = quizData.title;
    timeLeft = quizData.duration * 60;
    
    startTimer();
    renderExamLayout();
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
      alert('⏰ Test Time Expired! Your answer sheet is being auto-submitted.');
      submitQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerElem = document.getElementById('timer');
  if (timerElem) {
    timerElem.innerHTML = `<i class="bi bi-clock-history me-1"></i> ${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (timeLeft < 180) {
      timerElem.className = 'badge bg-danger fs-5 px-3 py-2 shadow-sm animate-pulse';
    }
  }
}

function renderExamLayout() {
  if (!quizData || !quizData.questions) return;

  const quizBox = document.getElementById('quizBox');

  quizBox.innerHTML = `
    <div class="row g-3">
      <!-- Left Column: Question & Options (2/3 width) -->
      <div class="col-lg-8 border-end-lg pe-lg-4">
        <!-- SSC / Railway / Banking Header Bar -->
        <div class="d-flex justify-content-between align-items-center bg-body-tertiary p-2 rounded mb-3 border">
          <span class="badge bg-primary px-3 py-2">Category: ${quizData.category || 'General Assessment'}</span>
          <span class="fw-bold small text-muted">Question ${currentIdx + 1} of ${quizData.questions.length}</span>
          <span class="badge bg-success-subtle text-success border border-success-subtle">+1.0 / -0.25 Marks</span>
        </div>

        <div id="questionContainer"></div>

        <!-- Action Controls (Save & Next, Clear, Mark for Review) -->
        <div class="d-flex flex-wrap justify-content-between align-items-center border-top pt-3 mt-4 gap-2">
          <div class="d-flex gap-2">
            <button onclick="toggleMarkReview()" class="btn btn-warning btn-sm fw-semibold">
              <i class="bi bi-flag-fill me-1"></i> ${markedForReview[currentIdx] ? 'Unmark Review' : 'Mark for Review'}
            </button>
            <button onclick="clearResponse()" class="btn btn-outline-secondary btn-sm">Clear Response</button>
          </div>
          <div class="d-flex gap-2">
            <button onclick="prevQuestion()" class="btn btn-outline-primary btn-sm" ${currentIdx === 0 ? 'disabled' : ''}>Previous</button>
            <button onclick="nextQuestion()" class="btn btn-primary fw-bold px-3 btn-sm">Save & Next</button>
          </div>
        </div>
      </div>

      <!-- Right Column: SSC/RRB Style Question Palette (1/3 width) -->
      <div class="col-lg-4">
        <div class="card border bg-body-tertiary p-3 rounded-3">
          <h6 class="fw-bold mb-3 border-bottom pb-2">Question Palette</h6>
          
          <!-- Palette Status Legend -->
          <div class="row g-2 mb-3 small">
            <div class="col-6"><span class="badge bg-success me-1">●</span> Answered</div>
            <div class="col-6"><span class="badge bg-danger me-1">●</span> Not Answered</div>
            <div class="col-6"><span class="badge bg-warning text-dark me-1">●</span> Review</div>
            <div class="col-6"><span class="badge bg-secondary me-1">●</span> Not Visited</div>
          </div>

          <!-- Palette Grid Buttons -->
          <div class="d-flex flex-wrap gap-2 mb-4" style="max-height: 220px; overflow-y: auto;">
            ${quizData.questions.map((_, idx) => {
              let btnClass = 'btn-outline-secondary';
              if (userAnswers[idx] !== undefined) btnClass = 'btn-success text-white';
              else if (markedForReview[idx]) btnClass = 'btn-warning text-dark';
              else if (idx === currentIdx) btnClass = 'btn-danger text-white';

              return `
                <button 
                  onclick="jumpToQuestion(${idx})" 
                  class="btn btn-sm ${btnClass} fw-bold" 
                  style="width: 38px; height: 38px;"
                >
                  ${idx + 1}
                </button>
              `;
            }).join('')}
          </div>

          <button onclick="submitQuiz()" class="btn btn-success w-100 fw-bold py-2 shadow-sm">
            <i class="bi bi-check-circle-fill me-1"></i> Submit Test
          </button>
        </div>
      </div>
    </div>
  `;

  renderQuestionContent();
}

function renderQuestionContent() {
  const q = quizData.questions[currentIdx];
  const container = document.getElementById('questionContainer');

  container.innerHTML = `
    <h6 class="fw-bold mb-3">${currentIdx + 1}. ${q.questionText}</h6>
    <div class="d-flex flex-column gap-2">
      ${q.options.map((opt, oIdx) => {
        const isSelected = userAnswers[currentIdx] === oIdx;
        return `
          <div 
            onclick="selectOption(${oIdx})" 
            class="p-3 border rounded-3 cursor-pointer d-flex align-items-center justify-content-between ${
              isSelected ? 'bg-primary-subtle border-primary text-primary fw-bold' : 'bg-body'
            }"
            style="cursor: pointer;"
          >
            <span><strong>(${String.fromCharCode(65 + oIdx)})</strong> ${opt}</span>
            ${isSelected ? '<i class="bi bi-check-circle-fill text-primary"></i>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function selectOption(oIdx) {
  if (isSubmitted) return;
  userAnswers[currentIdx] = oIdx;
  renderExamLayout();
}

function clearResponse() {
  delete userAnswers[currentIdx];
  delete markedForReview[currentIdx];
  renderExamLayout();
}

function toggleMarkReview() {
  if (markedForReview[currentIdx]) {
    delete markedForReview[currentIdx];
  } else {
    markedForReview[currentIdx] = true;
  }
  renderExamLayout();
}

function jumpToQuestion(idx) {
  currentIdx = idx;
  renderExamLayout();
}

function nextQuestion() {
  if (currentIdx < quizData.questions.length - 1) {
    currentIdx++;
    renderExamLayout();
  }
}

function prevQuestion() {
  if (currentIdx > 0) {
    currentIdx--;
    renderExamLayout();
  }
}

async function submitQuiz() {
  if (isSubmitted) return;
  if (!confirm('Are you sure you want to finalize and submit your answer sheet?')) return;

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
      <i class="bi bi-award-fill display-3 text-warning mb-2"></i>
      <h3 class="fw-bold">SSC / Railway / Banking Exam Completed</h3>
      <p class="text-muted">Test Paper: <strong>${quizData.title}</strong></p>
    </div>

    <div class="row g-3 mb-4 text-center">
      <div class="col-4">
        <div class="p-3 bg-body-tertiary rounded-3 border">
          <small class="text-muted d-block">Raw Score</small>
          <span class="fs-3 fw-bold">${result.score} / ${result.totalQuestions}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="p-3 bg-body-tertiary rounded-3 border">
          <small class="text-muted d-block">Accuracy</small>
          <span class="fs-3 fw-bold text-primary">${result.percentage}%</span>
        </div>
      </div>
      <div class="col-4">
        <div class="p-3 bg-body-tertiary rounded-3 border">
          <small class="text-muted d-block">Qualification</small>
          <span class="fs-3 fw-bold ${result.percentage >= 40 ? 'text-success' : 'text-danger'}">
            ${result.percentage >= 40 ? 'QUALIFIED' : 'NOT QUALIFIED'}
          </span>
        </div>
      </div>
    </div>

    <h5 class="fw-bold mb-3 border-bottom pb-2">Detailed Answer Key & Solutions</h5>
    ${result.detailedResults.map((item, idx) => `
      <div class="card mb-3 border-start border-4 ${item.isCorrect ? 'border-success bg-success-subtle' : 'border-danger bg-danger-subtle'}">
        <div class="card-body">
          <h6 class="fw-bold">${idx + 1}. ${item.questionText}</h6>
          <div class="small mt-2">
            <div>Your Selected Option: <strong class="${item.isCorrect ? 'text-success' : 'text-danger'}">${item.userAnswer}</strong></div>
            ${!item.isCorrect ? `<div>Correct Answer: <strong class="text-success">${item.correctAnswer}</strong></div>` : ''}
          </div>
        </div>
      </div>
    `).join('')}

    <div class="text-center mt-4">
      <button onclick="window.location.replace('dashboard.html')" class="btn btn-primary fw-bold px-4 py-2">
        Return to Exam Hub
      </button>
    </div>
  `;
}