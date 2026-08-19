const defaultPatterns = [
  'загрузка', 
  'download',
  '/^[a-f0-9]{8,}/', 
  '/^img_\\d+/',      
  '/^image\\d*/'
];

// Восстановление настроек при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['badPatterns'], (result) => {
    const patterns = result.badPatterns || defaultPatterns;
    document.getElementById('patternsList').value = patterns.join('\n');
  });
});

// Сохранение настроек
document.getElementById('saveBtn').addEventListener('click', () => {
  const text = document.getElementById('patternsList').value;
  // Разбиваем по строкам, очищаем пробелы, убираем пустые строки
  const patterns = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  
  chrome.storage.sync.set({ badPatterns: patterns }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
});