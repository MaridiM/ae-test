// ============================================
// UTILS MODULE - Утиліти та конфігурація
// ============================================
// Містить:
// - Глобальні налаштування (CONFIG)
// - Функції логування
// - Допоміжні функції роботи з AE API
// ============================================

// ============================================
// КОНФІГУРАЦІЯ ПРОЕКТА
// ============================================
var CONFIG = {
  // Шляхи відносно файлу проекту
  OUTPUT_FOLDER: "/output",
  VIDEO_FOLDER: "/Footage/Material",
  LOG_FOLDER: "/logs",

  // Назви ключових композицій
  RENDER_COMP: "Render",
  CUSTOMIZE_COMP: "Customize Scene",

  // Налаштування рендера
  RENDER_FORMAT: ".avi",

  // Налаштування логування
  LOG_TO_FILE: true,
  LOG_TO_CONSOLE: true,
};

var Utils = (function () {
  var logFile = null;
  var logBuffer = [];

  // ========================================
  // ДОПОМІЖНІ ФУНКЦІЇ ФОРМАТУВАННЯ
  // ========================================

  /**
   * Додає нулі на початок числа
   * @param {number} num - Число для форматування
   * @param {number} size - Бажана довжина рядка
   * @returns {string} Відформатований рядок
   */
  function pad(num, size) {
    size = size || 2;
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  /**
   * Створює timestamp для логів (ISO формат)
   * @returns {string} YYYY-MM-DDTHH:MM:SS
   */
  function getTimestamp() {
    var now = new Date();
    return (
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1, 2) +
      "-" +
      pad(now.getDate(), 2) +
      "T" +
      pad(now.getHours(), 2) +
      ":" +
      pad(now.getMinutes(), 2) +
      ":" +
      pad(now.getSeconds(), 2)
    );
  }

  /**
   * Створює timestamp для імен файлів (без спецсимволів)
   * @returns {string} YYYYMMDD_HHMMSS
   */
  function getFileTimestamp() {
    var now = new Date();
    return (
      now.getFullYear() +
      pad(now.getMonth() + 1, 2) +
      pad(now.getDate(), 2) +
      "_" +
      pad(now.getHours(), 2) +
      pad(now.getMinutes(), 2) +
      pad(now.getSeconds(), 2)
    );
  }

  // ========================================
  // СИСТЕМА ЛОГУВАННЯ
  // ========================================

  /**
   * Ініціалізує файл логів
   * @returns {boolean} Успішність ініціалізації
   */
  function initLog() {
    if (!CONFIG.LOG_TO_FILE) {
      log("Логування в файл вимкнено");
      return false;
    }

    try {
      var projectFile = app.project.file;
      var logFolderPath;

      if (!projectFile) {
        logFolderPath = Folder.desktop.fsName + CONFIG.LOG_FOLDER;
        log("Проект не збережено, логи будуть на робочому столі", "WARN");
      } else {
        logFolderPath = projectFile.path + CONFIG.LOG_FOLDER;
      }

      var logFolder = ensureFolder(logFolderPath);
      var timestamp = getFileTimestamp();
      var logFileName = "script_log_" + timestamp + ".txt";
      logFile = new File(logFolder.fsName + "/" + logFileName);

      logFile.encoding = "UTF-8";
      if (logFile.open("w")) {
        logFile.writeln("===========================================");
        logFile.writeln("  After Effects Automation Script Log");
        logFile.writeln("===========================================");
        logFile.writeln("Started: " + new Date().toString());
        logFile.writeln("===========================================\n");
        logFile.close();

        log("Лог-файл створено: " + logFile.fsName);
        return true;
      }

      log("Не вдалося відкрити файл лога", "ERROR");
      return false;
    } catch (e) {
      log("Помилка ініціалізації лога: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Логує повідомлення в консоль та файл
   * @param {string} message - Повідомлення для логування
   * @param {string} type - Тип: INFO, WARN, ERROR
   * @returns {string} Відформатоване повідомлення
   */
  function log(message, type) {
    type = type || "INFO";
    var timestamp = getTimestamp();
    var logMessage = "[" + timestamp + "] [" + type + "] " + message;

    // Вивід в консоль
    if (CONFIG.LOG_TO_CONSOLE) {
      $.writeln(logMessage);
    }

    // Зберігання в буфер
    logBuffer.push(logMessage);

    // Запис у файл
    if (CONFIG.LOG_TO_FILE && logFile && logFile.exists) {
      try {
        if (logFile.open("a")) {
          logFile.writeln(logMessage);
          logFile.close();
        }
      } catch (e) {
        // Ігноруємо помилки запису, щоб не зациклитись
      }
    }

    return logMessage;
  }

  /**
   * Зберігає фінальні логи при завершенні
   * @returns {boolean} Успішність збереження
   */
  function saveLogs() {
    if (!logFile || !logFile.exists) return false;

    try {
      if (logFile.open("a")) {
        logFile.writeln("\n===========================================");
        logFile.writeln("Session ended: " + new Date().toString());
        logFile.writeln("Total log entries: " + logBuffer.length);
        logFile.writeln("===========================================");
        logFile.close();

        $.writeln(">>> Логи збережено в: " + logFile.fsName);
        return true;
      }
    } catch (e) {
      $.writeln("Помилка збереження логів: " + e.toString());
      return false;
    }
  }

  // ========================================
  // РОБОТА З ПРОЕКТОМ
  // ========================================

  /**
   * Перевіряє що проект відкрито та збережено
   * @returns {boolean} Валідність проекту
   */
  function checkProject() {
    if (!app.project) {
      log("Проект не відкрито!", "ERROR");
      alert("Помилка: проект не відкрито!");
      return false;
    }

    if (!app.project.file) {
      log("Проект не збережено на диску", "ERROR");
      alert(
        "Будь ласка, збережіть проект перед запуском скрипта!\n\n" +
          "Скрипт використовує шлях до файлу проекту для пошуку відео та створення output."
      );
      return false;
    }

    log("Проект: " + app.project.file.fsName);
    return true;
  }

  /**
   * Знаходить композицію за іменем
   * @param {string} compName - Ім'я композиції
   * @returns {CompItem|null} Композиція або null
   */
  function getComp(compName) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === compName) {
        return item;
      }
    }
    return null;
  }

  /**
   * Знаходить шар за іменем у композиції
   * @param {CompItem} comp - Композиція
   * @param {string} layerName - Ім'я шару
   * @returns {Layer|null} Шар або null
   */
  function findLayer(comp, layerName) {
    try {
      return comp.layer(layerName);
    } catch (e) {
      return null;
    }
  }

  /**
   * Отримує ефект за іменем
   * @param {Layer} layer - Шар
   * @param {string} effectName - Ім'я ефекту
   * @returns {Property|null} Ефект або null
   */
  function getEffect(layer, effectName) {
    try {
      var effects = layer.property("Effects");
      if (!effects) return null;

      for (var i = 1; i <= effects.numProperties; i++) {
        var effect = effects.property(i);
        if (effect.name === effectName) {
          return effect;
        }
      }
      return null;
    } catch (e) {
      log("Помилка отримання ефекту: " + e.toString(), "ERROR");
      return null;
    }
  }

  // ========================================
  // ФАЙЛОВА СИСТЕМА
  // ========================================

  /**
   * Створює папку якщо не існує
   * @param {string} folderPath - Шлях до папки
   * @returns {Folder} Об'єкт папки
   */
  function ensureFolder(folderPath) {
    var folder = new Folder(folderPath);
    if (!folder.exists) {
      if (folder.create()) {
        log("Створено папку: " + folderPath);
      } else {
        log("Не вдалося створити папку: " + folderPath, "ERROR");
      }
    }
    return folder;
  }

  // ========================================
  // ДОПОМІЖНІ УТИЛІТИ
  // ========================================

  /**
   * Перевіряє чи міститься значення в масиві
   * @param {Array} arr - Масив
   * @param {*} val - Значення
   * @returns {boolean}
   */
  function arrayContains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) return true;
    }
    return false;
  }

  return {
    // Логування
    log: log,
    initLog: initLog,
    saveLogs: saveLogs,

    // Робота з проектом
    checkProject: checkProject,
    getComp: getComp,
    findLayer: findLayer,
    getEffect: getEffect,

    // Файлова система
    ensureFolder: ensureFolder,

    // Утиліти
    arrayContains: arrayContains,
    getTimestamp: getTimestamp,
    getFileTimestamp: getFileTimestamp,
  };
})();
