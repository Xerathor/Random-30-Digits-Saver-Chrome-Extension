const MIN_SIZE = 150; // Минимальный размер картинки (игнорирует мелкие элементы)

const btn = document.createElement('div');
btn.className = 'rds-save-btn';
btn.textContent = '💾 Save';
document.body.appendChild(btn);

let currentImage = null;
let hideTimeout = null;

// Используем Event Delegation для работы с динамическим контентом
document.addEventListener('mouseover', (e) => {
  if (e.target.tagName === 'IMG') {
    const rect = e.target.getBoundingClientRect();
    
    if (rect.width >= MIN_SIZE && rect.height >= MIN_SIZE) {
      clearTimeout(hideTimeout);
      currentImage = e.target;
      
      btn.style.display = 'block';
      
      // Вычисляем координаты для правого верхнего угла
      const top = window.scrollY + rect.top + 8;
      const left = window.scrollX + rect.left + rect.width - btn.offsetWidth - 8;
      
      btn.style.top = top + 'px';
      btn.style.left = left + 'px';
    }
  }
});

document.addEventListener('mouseout', (e) => {
  if (e.target.tagName === 'IMG') {
    hideTimeout = setTimeout(() => {
      btn.style.display = 'none';
      currentImage = null;
    }, 200); 
  }
});

// Не скрывать кнопку, пока мышь находится на ней
btn.addEventListener('mouseover', () => {
  clearTimeout(hideTimeout); 
});

btn.addEventListener('mouseout', () => {
  hideTimeout = setTimeout(() => {
    btn.style.display = 'none';
    currentImage = null;
  }, 200);
});

// Обработка клика
btn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (!currentImage || !currentImage.src) return;

  try {
    chrome.runtime.sendMessage({
      action: "downloadImage",
      url: currentImage.src
    });

    const originalText = btn.textContent;
    btn.textContent = '✅ Saved';
    btn.style.background = 'rgba(39, 174, 96, 0.9)';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 1500);
  } catch (err) {
    // sendMessage бросает исключение синхронно, если контекст расширения
    // "протух" — например, расширение перезагрузили, пока вкладка уже
    // была открыта. Без этого catch клик просто ничего не делал бы,
    // без единой подсказки, что случилось.
    console.error('Save button: sendMessage failed', err);
    btn.textContent = '⚠️ Reload page';
    btn.style.background = 'rgba(192, 57, 43, 0.9)';
    setTimeout(() => {
      btn.textContent = '💾 Save';
      btn.style.background = '';
    }, 2500);
  }
});