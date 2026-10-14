const wordInput = document.querySelector('#word-input');
const meaningInput = document.querySelector('#meaning-input');
const languageInput = document.querySelector('#language-input');
const masteredInput = document.querySelector('#mastered-input');
const addBtn = document.querySelector('#add-btn');
const vocabList = document.querySelector('#vocab-list');
const filterSelect = document.querySelector('#filter-select');
const message = document.querySelector('#message');

async function loadVocab() {
    let url = '/api/vocabulary';

    if (filterSelect.value !== '') {
        url += '?mastered=' + filterSelect.value;
    }

    const response = await fetch(url);
    const vocab = await response.json();
    console.log(vocab);

    vocabList.innerHTML = ''; 

    vocab.forEach(function (item) {
        const li = document.createElement('li');
        if (item.mastered) {
            li.classList.add('mastered');
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = item.word + ' (' + item.language + ') — ' + item.meaning;

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = item.mastered ? 'แม่นแล้ว ✓' : 'ยังไม่แม่น';
        toggleBtn.className = 'toggle-btn';
        toggleBtn.dataset.id = item._id;
        toggleBtn.dataset.mastered = item.mastered;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'ลบ';
        deleteBtn.className = 'delete-btn';
        deleteBtn.dataset.id = item._id;

        li.appendChild(textSpan);
        li.appendChild(toggleBtn);
        li.appendChild(deleteBtn);
        vocabList.appendChild(li);
    });
}

async function addVocab() {
    const word = wordInput.value.trim();
    const meaning = meaningInput.value.trim();
    const language = languageInput.value.trim();

    if (word === '' || meaning === '' || language === '') {
        message.textContent = 'กรุณากรอกคำศัพท์ ความหมาย และภาษาให้ครบ';
        return;
    }

    const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            word: word,
            meaning: meaning,
            language: language,
            mastered: masteredInput.checked
        })
    });

    // ถ้า server ตอบ error (เช่น 409 คำซ้ำ) ให้แสดงข้อความ แล้วหยุดโดยไม่ล้างฟอร์ม
    if (!response.ok) {
        const data = await response.json();
        message.textContent = data.error;
        return;
    }

    message.textContent = '';
    wordInput.value = '';
    meaningInput.value = '';
    languageInput.value = '';
    masteredInput.checked = false;

    loadVocab();
}

async function toggleVocab(id, currentMastered) {
    await fetch('/api/vocabulary/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mastered: !currentMastered })
    });
    loadVocab();
}

async function deleteVocab(id) {
    await fetch('/api/vocabulary/' + id, { method: 'DELETE' });
    loadVocab();
}

addBtn.addEventListener('click', addVocab);
filterSelect.addEventListener('change', loadVocab);

vocabList.addEventListener('click', function (event) {
    const id = event.target.dataset.id;

    if (event.target.classList.contains('toggle-btn')) {
        const currentMastered = event.target.dataset.mastered === 'true';
        toggleVocab(id, currentMastered);
    } else if (event.target.classList.contains('delete-btn')) {
        deleteVocab(id);
    }
});

loadVocab();