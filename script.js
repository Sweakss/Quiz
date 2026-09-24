// Storage Key
const STORAGE_KEY = 'quiz_app_groups';

// Application State
let groups = {}; // Structure: { "Group Name": [ { cardObj }, ... ] }
let activeGroupName = 'Biology Basics';
let activeQueue = [];
let currentCardIndex = 0;
let uploadedImageBase64 = '';
let editingCardId = null;
let editingCardOriginalGroup = null;
const SHUFFLE_KEY = 'quiz_app_shuffle';
let shuffleMode = localStorage.getItem(SHUFFLE_KEY) === 'true';

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
  const shuffleCheckbox = document.getElementById('shuffleToggle');
  if (shuffleCheckbox) shuffleCheckbox.checked = shuffleMode;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    alert('Could not save your data — storage is full. Try removing large uploaded images or deleting old cards.');
    console.error('Storage save failed:', err);
  }
}

// Tab Switching Setup
function setupTabEvents() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchToTab(btn.getAttribute('data-tab'));
    });
  });
}

function switchToTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.toggle('active', tab.id === tabId);
  });
  renderAll();
}

function setupKeyEvents() {
  document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });
}

function resetQueue() {
  if (activeGroupName && groups[activeGroupName]) {
    activeQueue = [...groups[activeGroupName]];
    if (shuffleMode) shuffleArray(activeQueue);
  } else {
    activeQueue = [];
  }
  currentCardIndex = 0;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toggleShuffleMode() {
  const checkbox = document.getElementById('shuffleToggle');
  shuffleMode = checkbox.checked;
  localStorage.setItem(SHUFFLE_KEY, shuffleMode);
}

function shuffleQueueNow() {
  if (activeQueue.length < 2) return;
  shuffleArray(activeQueue);
  currentCardIndex = 0;
  renderPracticeCard();
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
  const nameExists = Object.keys(groups).some(g => g.toLowerCase() === name.toLowerCase());
  if (nameExists) {
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
    html += `<img src="${escapeHtml(current.image)}" class="quiz-prompt-img" alt="Quiz Image">`;
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

    const solvedCardId = current.id;
    setTimeout(() => {
      const idx = activeQueue.findIndex(c => c.id === solvedCardId);
      if (idx === -1) return; // already removed (e.g. deleted manually in the meantime)
      activeQueue.splice(idx, 1);
      if (currentCardIndex >= activeQueue.length) {
        currentCardIndex = Math.max(0, activeQueue.length - 1);
      }
      renderAll();
    }, 800);
  } else {
    feedback.style.color = 'var(--danger)';
    feedback.textContent = `Incorrect. Acceptable answers: "${current.answer}"`;
  }
}

function skipCard() {
  if (activeQueue.length === 0) return;
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
const MAX_IMAGE_SIZE_MB = 2;

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    alert(`Image is too large (max ${MAX_IMAGE_SIZE_MB}MB). Try a smaller file or use an image URL instead.`);
    event.target.value = '';
    return;
  }

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

// Card Submission (handles both create and edit/update)
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

  if (editingCardId) {
    // Update existing card, possibly moving it to a different group
    const updatedCard = { id: editingCardId, prompt, image: finalImage, answer, hint };

    groups[editingCardOriginalGroup] = groups[editingCardOriginalGroup].filter(c => c.id !== editingCardId);
    groups[targetGroup].push(updatedCard);
    saveData();

    if (editingCardOriginalGroup === activeGroupName) {
      activeQueue = activeQueue.filter(c => c.id !== editingCardId);
    }
    if (targetGroup === activeGroupName) {
      activeQueue.push(updatedCard);
    }

    alert(`Card updated${targetGroup !== editingCardOriginalGroup ? ` and moved to "${targetGroup}"` : ''}!`);
    cancelEdit();
    switchToTab('manageTab');
  } else {
    const newCard = { id: Date.now().toString(), prompt, image: finalImage, answer, hint };

    groups[targetGroup].push(newCard);
    saveData();

    if (targetGroup === activeGroupName) {
      activeQueue.push(newCard);
    }

    document.getElementById('createForm').reset();
    removeSelectedImage();
    alert(`Card added to "${targetGroup}"!`);
    renderAll();
  }
}

// Edit Card
function editCard(cardId, groupName) {
  const card = groups[groupName].find(c => c.id === cardId);
  if (!card) return;

  editingCardId = card.id;
  editingCardOriginalGroup = groupName;

  switchToTab('createTab');

  document.getElementById('targetDeckSelect').value = groupName;
  document.getElementById('promptText').value = card.prompt || '';
  document.getElementById('correctAnswer').value = card.answer || '';
  document.getElementById('hintText').value = card.hint || '';

  removeSelectedImage();
  if (card.image && card.image.startsWith('data:')) {
    uploadedImageBase64 = card.image;
    document.getElementById('imagePreview').src = card.image;
    document.getElementById('imagePreviewContainer').style.display = 'block';
  } else if (card.image) {
    document.getElementById('imageUrl').value = card.image;
  }

  document.getElementById('createCardHeading').textContent = 'Edit Card';
  document.getElementById('createSubmitBtn').textContent = 'Update Card';
  document.getElementById('cancelEditBtn').style.display = 'block';
}

function cancelEdit() {
  editingCardId = null;
  editingCardOriginalGroup = null;
  document.getElementById('createForm').reset();
  removeSelectedImage();
  document.getElementById('createCardHeading').textContent = 'Create New Card';
  document.getElementById('createSubmitBtn').textContent = 'Add Card';
  document.getElementById('cancelEditBtn').style.display = 'none';
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
      ? `<img src="${escapeHtml(card.image)}" class="item-thumb" alt="Thumb">` 
      : '';

    item.innerHTML = `
      <div class="item-content">
        ${thumbHtml}
        <div class="item-info">
          <span class="item-prompt">${escapeHtml(promptText)}</span>
          <span class="item-answer">Answer: ${escapeHtml(card.answer)}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-edit" onclick="editCard('${card.id}', '${activeGroupName}')">Edit</button>
        <button class="btn-delete" onclick="deleteCard('${card.id}')">Delete</button>
      </div>
    `;

    container.appendChild(item);
  });
}

function deleteCard(cardId) {
  if (confirm('Delete this card?')) {
    groups[activeGroupName] = groups[activeGroupName].filter(c => c.id !== cardId);
    activeQueue = activeQueue.filter(c => c.id !== cardId);

    if (currentCardIndex >= activeQueue.length && activeQueue.length > 0) {
      currentCardIndex = activeQueue.length - 1;
    } else if (activeQueue.length === 0) {
      currentCardIndex = 0;
    }

    if (editingCardId === cardId) {
      cancelEdit();
    }

    saveData();
    renderAll();
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Backup: Export
function exportData() {
  const dataStr = JSON.stringify(groups, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `study-quiz-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Backup: Import
function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    let imported;
    try {
      imported = JSON.parse(e.target.result);
    } catch (err) {
      alert('That file is not valid JSON. Please choose a backup file exported from this app.');
      event.target.value = '';
      return;
    }

    if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
      alert('That file doesn\'t look like a valid backup for this app.');
      event.target.value = '';
      return;
    }

    const incomingGroupNames = Object.keys(imported);
    if (incomingGroupNames.length === 0) {
      alert('That backup file has no groups in it.');
      event.target.value = '';
      return;
    }

    if (!confirm(`Import ${incomingGroupNames.length} group(s) from this file? New groups will be added, and cards will be merged into any existing groups with the same name.`)) {
      event.target.value = '';
      return;
    }

    // Collect existing card ids across all groups so we never collide
    const existingIds = new Set();
    Object.values(groups).forEach(cards => cards.forEach(c => existingIds.add(c.id)));

    let addedGroups = 0;
    let addedCards = 0;

    incomingGroupNames.forEach(name => {
      const incomingCards = Array.isArray(imported[name]) ? imported[name] : [];
      if (!groups[name]) {
        groups[name] = [];
        addedGroups++;
      }
      incomingCards.forEach(card => {
        if (!card || typeof card !== 'object' || !card.answer) return;
        let id = card.id ? String(card.id) : Date.now().toString();
        while (existingIds.has(id)) {
          id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        }
        existingIds.add(id);
        groups[name].push({
          id,
          prompt: card.prompt || '',
          image: card.image || '',
          answer: card.answer,
          hint: card.hint || ''
        });
        addedCards++;
      });
    });

    saveData();
    resetQueue();
    renderAll();
    alert(`Import complete: ${addedCards} card(s) added across ${incomingGroupNames.length} group(s) (${addedGroups} new group(s) created).`);
    event.target.value = '';
  };
  reader.readAsText(file);
}
