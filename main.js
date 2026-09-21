// Storage Key
const STORAGE_KEY = 'custom_quiz_cards';

// Global State
let cards = [];
let activeQueue = [];
let currentCardIndex = 0;
let uploadedImageBase64 = '';

// Default sample data
const sampleCards = [
  {
    id: '1',
    prompt: 'What organelle produces ATP in eukaryotic cells?',
    image: '',
    answer: 'mitochondria, mitochondrion',
    hint: 'Known as the powerhouse of the cell.'
  },
  {
    id: '2',
    prompt: 'Identify this functional chemical group:',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Hydroxide_formula.svg/200px-Hydroxide_formula.svg.png',
    answer: 'hydroxyl, alcohol',
    hint: 'Consists of one hydrogen atom bonded to one oxygen atom (-OH).'
  }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadCards();
  setupEvents();
  renderAll();
});

function loadCards() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    cards = JSON.parse(stored);
  } else {
    cards = [...sampleCards];
    saveCards();
  }
  activeQueue = [...cards];
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function setupEvents() {
  document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });
}

function renderAll() {
  updateStats();
  renderPracticeCard();
  renderManageList();
}

function updateStats() {
  document.getElementById('statTotal').textContent = cards.length;
  document.getElementById('statRemaining').textContent = activeQueue.length;
}

function renderPracticeCard() {
  const display = document.getElementById('quizDisplay');
  const feedback = document.getElementById('feedback');
  feedback.textContent = '';
  document.getElementById('userInput').value = '';

  if (activeQueue.length === 0) {
    if (cards.length > 0) {
      display.innerHTML = `
        <p class="quiz-prompt-text">🎉 Session Complete!</p>
        <button class="btn btn-skip" onclick="resetSession()">Restart Practice Session</button>
      `;
    } else {
      display.innerHTML = `<p class="empty-msg">No cards available. Add some cards below to start practicing!</p>`;
    }
    return;
  }

  const current = activeQueue[currentCardIndex];
  let html = '';

  if (current.prompt) {
    html += `<div class="quiz-prompt-text">${escapeHtml(current.prompt)}</div>`;
  }
  if (current.image) {
    html += `<img src="${current.image}" class="quiz-prompt-img" alt="Quiz Image">`;
  }

  display.innerHTML = html;
  document.getElementById('userInput').focus();
}

function checkAnswer() {
  if (activeQueue.length === 0) return;

  const userVal = document.getElementById('userInput').value.trim().toLowerCase();
  const current = activeQueue[currentCardIndex];
  const validAnswers = current.answer.split(',').map(a => a.trim().toLowerCase());
  const feedback = document.getElementById('feedback');

  if (validAnswers.includes(userVal)) {
    feedback.style.color = 'var(--success)';
    feedback.textContent = 'Correct!';
    
    setTimeout(() => {
      // Remove learned card from active queue for this session
      activeQueue.splice(currentCardIndex, 1);
      if (currentCardIndex >= activeQueue.length) {
        currentCardIndex = 0;
      }
      renderAll();
    }, 800);
  } else {
    feedback.style.color = 'var(--danger)';
    feedback.textContent = `Incorrect. Acceptable answers: "${current.answer}"`;
  }
}

function skipCard() {
  if (activeQueue.length <= 1) return;
  currentCardIndex = (currentCardIndex + 1) % activeQueue.length;
  renderPracticeCard();
}

function showHint() {
  if (activeQueue.length === 0) return;
  const current = activeQueue[currentCardIndex];
  const feedback = document.getElementById('feedback');
  
  feedback.style.color = 'var(--warning)';
  if (current.hint) {
    feedback.textContent = `Hint: ${current.hint}`;
  } else {
    feedback.textContent = `Hint: Starts with "${current.answer.trim().charAt(0)}..."`;
  }
}

function resetSession() {
  activeQueue = [...cards];
  currentCardIndex = 0;
  renderAll();
}

function addSymbol(sym) {
  const input = document.getElementById('userInput');
  input.value += sym;
  input.focus();
}

// File Upload Handler (Base64)
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedImageBase64 = e.target.result;
    document.getElementById('imagePreview').src = uploadedImageBase64;
    document.getElementById('imagePreviewContainer').style.display = 'block';
    document.getElementById('imageUrl').value = ''; // clear text URL
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  uploadedImageBase64 = '';
  document.getElementById('imageFile').value = '';
  document.getElementById('imagePreviewContainer').style.display = 'none';
}

// Card Creation
function handleCardSubmit(e) {
  e.preventDefault();

  const prompt = document.getElementById('promptText').value.trim();
  const imageUrlInput = document.getElementById('imageUrl').value.trim();
  const answer = document.getElementById('correctAnswer').value.trim();
  const hint = document.getElementById('hintText').value.trim();

  const finalImage = uploadedImageBase64 || imageUrlInput;

  if (!prompt && !finalImage) {
    alert('Please enter a question prompt OR provide an image!');
    return;
  }

  const newCard = {
    id: Date.now().toString(),
    prompt,
    image: finalImage,
    answer,
    hint
  };

  cards.push(newCard);
  activeQueue.push(newCard);
  saveCards();

  // Reset form
  document.getElementById('createForm').reset();
  removeSelectedImage();

  renderAll();
}

// Render Manage Cards List
function renderManageList() {
  const container = document.getElementById('cardList');
  container.innerHTML = '';

  if (cards.length === 0) {
    container.innerHTML = '<p class="empty-msg">No cards in library.</p>';
    return;
  }

  cards.forEach(card => {
    const item = document.createElement('div');
    item.className = 'list-item';

    const promptText = card.prompt || '[Image Only Question]';
    const thumbHtml = card.image 
      ? `<img src="${card.image}" class="item-thumb" alt="Thumb">` 
      : '';

    item.innerHTML = `
      <div class="item-content">
        ${thumbHtml}
        <div class="item-info">
          <span class="item-prompt">${escapeHtml(promptText)}</span>
          <span class="item-answer">Answer: ${escapeHtml(card.answer)}</span>
        </div>
      </div>
      <button class="btn-delete" onclick="deleteCard('${card.id}')">Delete</button>
    `;

    container.appendChild(item);
  });
}

// Delete Single Card Functionality
function deleteCard(id) {
  if (confirm('Are you sure you want to delete this card?')) {
    // Remove from main list
    cards = cards.filter(c => c.id !== id);
    // Remove from active practice queue
    activeQueue = activeQueue.filter(c => c.id !== id);
    
    if (currentCardIndex >= activeQueue.length) {
      currentCardIndex = 0;
    }

    saveCards();
    renderAll();
  }
}

// Delete All Cards
function clearAllCards() {
  if (confirm('Are you sure you want to delete ALL cards? This cannot be undone.')) {
    cards = [];
    activeQueue = [];
    currentCardIndex = 0;
    saveCards();
    renderAll();
  }
}

// Utility function to avoid HTML injection
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
