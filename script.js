// Storage Key
const STORAGE_KEY = 'quiz_app_groups';

// Application State
let groups = {}; // Structure: { "Group Name": [ { cardObj }, ... ] }
let activeGroupName = 'Biology Basics';
let activeQueue = [];
let currentCardIndex = 0;
let uploadedImageBase64 = '';

// Sample Initial Data
const defaultGroups = {
  "Biology Basics": [
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

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabEvents();
  setupKeyEvents();
  renderAll();
});

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    groups = JSON.parse(stored);
  } else {
    groups = defaultGroups;
    saveData();
  }

  const groupKeys = Object.keys(groups);
  if (groupKeys.length > 0) {
    activeGroupName = groupKeys[0];
  } else {
    activeGroupName = '';
  }
  resetQueue();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

// Tab Switching Setup
function setupTabEvents() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');

      // Update button active state
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all tabs and display target
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.getElementById(targetTabId).classList.add('active');

      renderAll();
    });
  });
}

function setupKeyEvents() {
  document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });
}

function resetQueue() {
  if (activeGroupName && groups[activeGroupName]) {
    activeQueue = [...groups[activeGroupName]];
  } else {
    activeQueue = [];
  }
  currentCardIndex = 0;
}

function renderAll() {
  renderGroupDropdowns();
  updateHeaderBanner();
  renderPracticeCard();
  renderManageList();
}

// Group Dropdowns
function renderGroupDropdowns() {
  const deckSelect = document.getElementById('deckSelect');
  const targetDeckSelect = document.getElementById('targetDeckSelect');

  deckSelect.innerHTML = '';
  targetDeckSelect.innerHTML = '';

  const groupNames = Object.keys(groups);

  if (groupNames.length === 0) {
    deckSelect.innerHTML = '<option value="">No Groups Found</option>';
    targetDeckSelect.innerHTML = '<option value="">No Groups Found</option>';
    return;
  }

  groupNames.forEach(name => {
    const opt1 = document.createElement('option');
    opt1.value = name;
    opt1.textContent = name;
    if (name === activeGroupName) opt1.selected = true;
    deckSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = name;
    opt2.textContent = name;
    if (name === activeGroupName) opt2.selected = true;
    targetDeckSelect.appendChild(opt2);
  });
}

function updateHeaderBanner() {
  document.getElementById('activeGroupTitle').textContent = activeGroupName || 'None Selected';
  const total = (activeGroupName && groups[activeGroupName]) ? groups[activeGroupName].length : 0;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statRemaining').textContent = activeQueue.length;
}

function handleDeckChange() {
  const select = document.getElementById('deckSelect');
  activeGroupName = select.value;
  resetQueue();
  renderAll();
}

function handleDeckSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('newDeckName');
  const name = input.value.trim();

  if (!name) return;
  if (groups[name]) {
    alert('A group with this name already exists!');
    return;
  }

  groups[name] = [];
  activeGroupName = name;
  saveData();

  input.value = '';
  resetQueue();
  renderAll();
}

function deleteActiveGroup() {
  if (!activeGroupName) return;

  if (confirm(`Are you sure you want to delete the entire group "${activeGroupName}" and all of its cards?`)) {
    delete groups[activeGroupName];
    saveData();

    const remainingGroups = Object.keys(groups);
    activeGroupName = remainingGroups.length > 0 ? remainingGroups[0] : '';
    
    resetQueue();
    renderAll();
  }
}

// Practice Execution
function renderPracticeCard() {
  const display = document.getElementById('quizDisplay');
  const feedback = document.getElementById('feedback');
  feedback.textContent = '';
  document.getElementById('userInput').value = '';

  if (activeQueue.length === 0) {
    const totalInGroup = (activeGroupName && groups[activeGroupName]) ? groups[activeGroupName].length : 0;
    if (totalInGroup > 0) {
      display.innerHTML = `
        <p class="quiz-prompt-text">🎉 Practice Completed for "${escapeHtml(activeGroupName)}"!</p>
        <button class="btn btn-skip" onclick="resetQueue(); renderAll();">Restart Group</button>
      `;
    } else {
      display.innerHTML = `<p class="empty-msg">No cards in this group. Go to 'Create Card' tab to add some!</p>`;
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

// Card Submission
function handleCardSubmit(e) {
  e.preventDefault();

  const targetGroup = document.getElementById('targetDeckSelect').value;
  const prompt = document.getElementById('promptText').value.trim();
  const imageUrlInput = document.getElementById('imageUrl').value.trim();
  const answer = document.getElementById('correctAnswer').value.trim();
  const hint = document.getElementById('hintText').value.trim();

  const finalImage = uploadedImageBase64 || imageUrlInput;

  if (!targetGroup) {
    alert('Please select or create a group first!');
    return;
  }

  if (!prompt && !finalImage) {
    alert('Please provide a question text OR an image!');
    return;
  }

  const newCard = {
    id: Date.now().toString(),
    prompt,
    image: finalImage,
    answer,
    hint
  };

  groups[targetGroup].push(newCard);
  saveData();

  if (targetGroup === activeGroupName) {
    activeQueue.push(newCard);
  }

  document.getElementById('createForm').reset();
  removeSelectedImage();
  alert(`Card added to "${targetGroup}"!`);
}

// Card List Manager
function renderManageList() {
  const container = document.getElementById('cardList');
  container.innerHTML = '';

  const currentCards = (activeGroupName && groups[activeGroupName]) ? groups[activeGroupName] : [];

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
    groups[activeGroupName] = groups[activeGroupName].filter(c => c.id !== cardId);
    activeQueue = activeQueue.filter(c => c.id !== cardId);

    if (currentCardIndex >= activeQueue.length) {
      currentCardIndex = 0;
    }

    saveData();
    renderAll();
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
