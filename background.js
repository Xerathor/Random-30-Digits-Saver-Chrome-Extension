// Генерация крипто-стойких 30 случайных цифр
function generate30Digits() {
  const arr = new Uint8Array(30);
  crypto.getRandomValues(arr);
  return Array.from(arr, byte => byte % 10).join('');
}

// Карта MIME-типов картинок
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// Дефолтные паттерны плохих имен
let badNamePatterns = [
  'загрузка', 'download',
  '/^[a-f0-9]{8,}/', 
  '/^img_\\d+/',      
  '/^image\\d*/'      
];

// Кэш ID загрузок, инициированных через нашу кнопку Save
// (используем downloadId, а не URL: один и тот же URL может встретиться
// на странице несколько раз, а Chrome иногда меняет item.url после
// редиректов — со строковым ключом это давало гонку состояний)
const forceRenameIds = new Set();

// Загрузка настроек из storage
chrome.storage.sync.get(['badPatterns'], (result) => {
  if (result.badPatterns && result.badPatterns.length > 0) {
    badNamePatterns = result.badPatterns;
  }
});

// Обновление паттернов на лету, если пользователь изменил их в настройках
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.badPatterns) {
    badNamePatterns = changes.badPatterns.newValue;
  }
});

function getExtensionFromName(filename) {
  if (!filename) return null;
  const match = filename.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : null;
}

// MIME из HTTP-заголовка сервера надёжнее имени файла: сервер может отдать
// в Content-Disposition неверное/устаревшее имя, а Content-Type обычно верный
function resolveImageExtension(filename, mime) {
  if (mime && MIME_TO_EXT[mime]) {
    return MIME_TO_EXT[mime];
  }
  const nameExt = getExtensionFromName(filename);
  if (nameExt && IMAGE_EXTENSIONS.includes(nameExt)) {
    return nameExt;
  }
  return null;
}

// Проверка файла по настраиваемому списку
function hasBadName(filename) {
  const lower = (filename || '').toLowerCase();
  for (const pattern of badNamePatterns) {
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        const regex = new RegExp(pattern.slice(1, -1));
        if (regex.test(lower)) return true;
      } catch (e) { console.error("Invalid regex:", pattern); }
    } else {
      if (lower.includes(pattern.toLowerCase())) return true;
    }
  }
  return false;
}

// Главная магия переименования
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const filename = item.filename || '';
  const ext = resolveImageExtension(filename, item.mime);

  // Проверяем, скачан ли файл через нашу кнопку Save (по downloadId, не по URL)
  const isForced = forceRenameIds.has(item.id);
  if (isForced) {
    forceRenameIds.delete(item.id); // Очищаем после обработки
  }

  if (!ext) {
    suggest();
    return;
  }

  // Если имя нормальное и загрузка вызвана НЕ нашей кнопкой — пропускаем
  if (!isForced && !hasBadName(filename)) {
    suggest();
    return;
  }

  const newName = generate30Digits() + ext;

  suggest({
    filename: newName,
    conflictAction: 'uniquify'
  });
  console.log('✅ Random name applied:', newName);
});

// Открытие страницы настроек при клике на иконку в панели
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Прием сообщения от content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadImage" && message.url) {
    chrome.downloads.download({ url: message.url }, (downloadId) => {
      if (chrome.runtime.lastError || downloadId === undefined) {
        console.error('Download failed:', chrome.runtime.lastError);
        return;
      }
      forceRenameIds.add(downloadId); // Запоминаем downloadId для форсированного переименования
    });
  }
});