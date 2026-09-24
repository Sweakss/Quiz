// Storage Key
const STORAGE_KEY = 'custom_quiz_app_decks';

// Global State
let decks = {}; // Format: { "DeckName": [ { cardObj }, ... ] }
let activeDeckName = 'Default Group';
let activeQueue = [];
let currentCardIndex = 0;
let uploadedImageBase64 = '';

// Sample Default Data
const defaultDecks = {
  "Biology": [
    {
      id: '1',
      prompt: 'What organelle produces ATP in eukaryotic cells?',
      image: '',
      answer: 'mitochondria, mitochondrion',
      hint: 'Powerhouse of the cell.'
    }
  ],
  "Chemistry": [
    {
      id: '2',
      prompt: 'Identify this functional chemical group:',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Hydroxide_formula.svg/200px-Hydroxide_formula.svg.png',
      answer: 'hydroxyl, alcohol',
      hint: 'Contains oxygen and hydrogen (-OH).'
    }
  ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEvents();
  renderDeckSelectors();
  renderAll();
});

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    decks = JSON.parse(stored);
  } else {
    decks = defaultDecks;
    saveData();
  }
  
  const deckNames = Object.keys(decks);
  if (deckNames.length > 0) {
    activeDeckName = deckNames[0];
  }
  resetQueue();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

function setupEvents() {
  document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });
}

// Tab Switching Logic
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  
  const navBtns = document.querySelectorAll('.tab-btn');
  if (tabId === 'practiceTab') navBtns[0].classList.add('active');
  if (tabId === 'createTab') navBtns[1].classList.add('active');
  if (tabId === 'manageTab') navBtns[2].classList.add('active');

  renderAll();
}

// Deck Selectors
function renderDeckSelectors() {
  const deckSelect = document.getElementById('deckSelect');
  const targetDeckSelect = document.getElementById('targetDeckSelect');
  
  deckSelect.innerHTML = '';
  targetDeckSelect.innerHTML = '';

  const names = Object.keys(decks);

  if (names.length === 0) {
    deckSelect.innerHTML = '<option value="">No Groups Found</option>';
    targetDeckSelect.innerHTML = '<option value="">No Groups Found</option>';
    return;
  }

  names.forEach(name => {
    const opt1 = document.createElement('option');
    opt1.value = name;
    opt1.textContent = name;
    if (name === activeDeckName) opt1.selected = true;
    deckSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = name;
    opt2.textContent = name;
    if (name === activeDeckName) opt2.selected = true;
    targetDeckSelect.appendChild(opt2);
  });
}

function handleDeckChange() {
  const select = document.getElementById('deckSelect');
  activeDeckName = select.value;
  document.getElementById('targetDeckSelect').value = activeDeckName;
  resetQueue();
  renderAll();
}

function handleDeckSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('newDeckName');
  const name = input.value.trim();

  if (!name) return;
  if (decks[name]) {
    alert('A group with this name already exists!');
    return;
  }

  decks[name] = [];
  activeDeckName = name;
  saveData();

  input.value = '';
  renderDeckSelectors();
  resetQueue();
  renderAll();
}

function resetQueue() {
  if (decks[activeDeckName]) {
    activeQueue = [...decks[activeDeckName]];
  } else {
    activeQueue = [];
  }
  currentCardIndex = 0;
}

function renderAll() {
  updateStats();
  renderPracticeCard();
  renderManageList();
}

function updateStats() {
  const total = decks[activeDeckName] ? decks[activeDeckName].length : 0;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statRemaining').textContent = activeQueue.length;
}

// Practice Rendering & Logic
function renderPracticeCard() {
  const display = document.getElementById('quizDisplay');
  const feedback = document.getElementById('feedback');
  feedback.textContent = '';
  document.getElementById('userInput').value = '';

  if (activeQueue.length === 0) {
    const totalInDeck = decks[activeDeckName] ? decks[activeDeckName].length : 0;
    if (totalInDeck > 0) {
      display.innerHTML = `
        <p class="quiz-prompt-text">🎉 Group Practice Complete!</p>
        <button class="btn btn-skip" onclick="resetQueue(); renderAll();">Restart Group</button>
      `;
    } else {
      display.innerHTML = `<p class="empty-msg">No cards in this group. Add cards in the 'Create Card' tab!</p>`;
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

function addSymbol(sym) {
  const input = document.getElementById('userInput');
  input.value += sym;
  input.focus();
}

// File Upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedImageBase64 = e.target.result;
    document.getElementById('imagePreview').src = uploadedImageBase64;
    document.getElementById('imagePreviewContainer').style.display = 'block';
    document.getElementById('imageUrl').value = '';
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

  const targetDeck = document.getElementById('targetDeckSelect').value;
  const prompt = document.getElementById('promptText').value.trim();
  const imageUrlInput = document.getElementById('imageUrl').value.trim();
  const answer = document.getElementById('correctAnswer').value.trim();
  const hint = document.getElementById('hintText').value.trim();

  const finalImage = uploadedImageBase64 || imageUrlInput;

  if (!targetDeck) {
    alert('Please select or create a group first!');
    return;
  }

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

  decks[targetDeck].push(newCard);
  saveData();

  if (targetDeck === activeDeckName) {
    activeQueue.push(newCard);
  }

  // Reset form
  document.getElementById('createForm').reset();
  removeSelectedImage();
  alert('Card added successfully!');
}

// Manage Cards
function renderManageList() {
  const container = document.getElementById('cardList');
  container.innerHTML = '';

  const currentCards = decks[activeDeckName] || [];

  if (currentCards.length === 0) {
    container.innerHTML = '<p class="empty-msg">No cards in this group.</p>';
    return;
  }

  currentCards.forEach(card => {
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

function deleteCard(cardId) {
  if (confirm('Delete this card?')) {
    decks[activeDeckName] = decks[activeDeckName].filter(c => c.id !== cardId);
    activeQueue = activeQueue.filter(c => c.id !== cardId);

    if (currentCardIndex >= activeQueue.length) {
      currentCardIndex = 0;
    }

    saveData();
    renderAll();
  }
}

function clearCurrentDeck() {
  if (!activeDeckName) return;

  if (confirm(`Delete the entire "${activeDeckName}" group and all its cards?`)) {
    delete decks[activeDeckName];
    saveData();

    const remainingDeckNames = Object.keys(decks);
    activeDeckName = remainingDeckNames.length > 0 ? remainingDeckNames[0] : '';
    
    renderDeckSelectors();
    resetQueue();
    renderAll();
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
