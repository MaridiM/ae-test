// ============================================
// КОНФИГУРАЦИЯ ПРОЕКТА
// ============================================
var CONFIG = {
  // Пути относительно файла проекта
  OUTPUT_FOLDER: "/output",
  VIDEO_FOLDER: "/Footage/Material",
  LOG_FOLDER: "/logs",

  // Названия ключевых композиций
  RENDER_COMP: "Render",
  CUSTOMIZE_COMP: "Customize Scene",

  // Настройки рендера
  RENDER_FORMAT: ".avi", // для Windows; для Mac можно .mov

  // Настройки логирования
  LOG_TO_FILE: true,
  LOG_TO_CONSOLE: true,
};

// ============================================
// УТИЛИТЫ
// ============================================
var Utils = (function () {
  var logFile = null;
  var logBuffer = [];

  // Добавление нулей в начало числа (необходимо для форматирования даты)
  function pad(num, size) {
    size = size || 2;
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  // Ручное создание timestamp, совместимое со старым JS
  function getTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = pad(now.getMonth() + 1, 2); // Месяцы 0-11
    var day = pad(now.getDate(), 2);
    var hours = pad(now.getHours(), 2);
    var minutes = pad(now.getMinutes(), 2);
    var seconds = pad(now.getSeconds(), 2);

    // Формат: YYYY-MM-DDTHH:MM:SS
    return (
      year +
      "-" +
      month +
      "-" +
      day +
      "T" +
      hours +
      ":" +
      minutes +
      ":" +
      seconds
    );
  }

  // Короткий timestamp для имен файлов (без спецсимволов)
  function getFileTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = pad(now.getMonth() + 1, 2);
    var day = pad(now.getDate(), 2);
    var hours = pad(now.getHours(), 2);
    var minutes = pad(now.getMinutes(), 2);
    var seconds = pad(now.getSeconds(), 2);

    // Формат: YYYYMMDD_HHMMSS
    return year + month + day + "_" + hours + minutes + seconds;
  }

  // Инициализация файла логов
  function initLog() {
    if (!CONFIG.LOG_TO_FILE) {
      log("Логирование в файл отключено");
      return false;
    }

    try {
      var projectFile = app.project.file;
      var logFolderPath;

      if (!projectFile) {
        // Если проект не сохранен, пишем на рабочий стол
        logFolderPath = Folder.desktop.fsName + CONFIG.LOG_FOLDER;
        log("Проект не сохранен, логи будут на рабочем столе", "WARN");
      } else {
        logFolderPath = projectFile.path + CONFIG.LOG_FOLDER;
      }

      var logFolder = ensureFolder(logFolderPath);

      // Создаем файл лога с timestamp
      var timestamp = getFileTimestamp();
      var logFileName = "script_log_" + timestamp + ".txt";
      logFile = new File(logFolder.fsName + "/" + logFileName);

      // Открываем файл для записи
      logFile.encoding = "UTF-8";
      if (logFile.open("w")) {
        logFile.writeln("===========================================");
        logFile.writeln("  After Effects Automation Script Log");
        logFile.writeln("===========================================");
        logFile.writeln("Started: " + new Date().toString());
        logFile.writeln("===========================================\n");
        logFile.close();

        log("Лог-файл создан: " + logFile.fsName);
        return true;
      } else {
        log("Не удалось открыть файл лога", "ERROR");
        return false;
      }
    } catch (e) {
      log("Ошибка инициализации лога: " + e.toString(), "ERROR");
      return false;
    }
  }

  // Логирование с timestamp
  function log(message, type) {
    type = type || "INFO";

    // Используем нашу функцию для timestamp
    var timestamp = getTimestamp();

    var logMessage = "[" + timestamp + "] [" + type + "] " + message;

    // Вывод в консоль ExtendScript Toolkit
    if (CONFIG.LOG_TO_CONSOLE) {
      $.writeln(logMessage);
    }

    // Сохранение в буфер
    logBuffer.push(logMessage);

    // Запись в файл
    if (CONFIG.LOG_TO_FILE && logFile && logFile.exists) {
      try {
        if (logFile.open("a")) {
          logFile.writeln(logMessage);
          logFile.close();
        }
      } catch (e) {
        // Игнорируем ошибки записи в лог, чтобы не зациклиться
      }
    }

    return logMessage;
  }

  // Сохранение финальных логов
  function saveLogs() {
    if (!logFile || !logFile.exists) {
      return false;
    }

    try {
      if (logFile.open("a")) {
        logFile.writeln("\n===========================================");
        logFile.writeln("Session ended: " + new Date().toString());
        logFile.writeln("Total log entries: " + logBuffer.length);
        logFile.writeln("===========================================");
        logFile.close();

        $.writeln(">>> Логи сохранены в: " + logFile.fsName);
        return true;
      }
    } catch (e) {
      $.writeln("Ошибка сохранения логов: " + e.toString());
      return false;
    }
  }

  // Проверка что проект открыт и сохранен
  function checkProject() {
    if (!app.project) {
      log("Проект не открыт!", "ERROR");
      alert("Ошибка: проект не открыт!");
      return false;
    }

    if (!app.project.file) {
      log("Проект не сохранен на диске", "ERROR");
      alert(
        "Пожалуйста, сохраните проект перед запуском скрипта!\n\n" +
          "Скрипт использует путь к файлу проекта для поиска видео и создания output."
      );
      return false;
    }

    log("Проект: " + app.project.file.fsName);
    return true;
  }

  // Поиск композиции по имени
  function findComp(compName) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === compName) {
        return item;
      }
    }
    return null;
  }

  // Алиас для совместимости с разными модулями
  function getComp(compName) {
    return findComp(compName);
  }

  // Поиск всех композиций (возвращает массив)
  function getAllComps() {
    var comps = [];
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem) {
        comps.push(item);
      }
    }
    return comps;
  }

  // Безопасное получение значения свойства
  function safeGetValue(property) {
    try {
      return property.value;
    } catch (e) {
      log("Ошибка получения значения: " + e.toString(), "ERROR");
      return null;
    }
  }

  // Поиск слоя по имени в композиции
  function findLayer(comp, layerName) {
    try {
      return comp.layer(layerName);
    } catch (e) {
      return null;
    }
  }

  // Проверка существования эффекта на слое
  function hasEffect(layer, effectName) {
    try {
      var effects = layer.property("Effects");
      if (!effects) return false;

      for (var i = 1; i <= effects.numProperties; i++) {
        if (effects.property(i).name === effectName) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Получение эффекта по имени
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
      log("Ошибка получения эффекта: " + e.toString(), "ERROR");
      return null;
    }
  }

  // Форматирование времени в читаемый вид (00:00:00:00)
  function formatTime(seconds, fps) {
    fps = fps || 30; // Предполагаем 30fps по умолчанию
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var f = Math.floor((seconds % 1) * fps);

    return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2) + ":" + pad(f, 2);
  }

  // Проверка, содержит ли массив указанное значение (замена для indexOf)
  function arrayContains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) {
        return true;
      }
    }
    return false;
  }

  // Создание папки если не существует
  function ensureFolder(folderPath) {
    var folder = new Folder(folderPath);
    if (!folder.exists) {
      if (folder.create()) {
        log("Создана папка: " + folderPath);
      } else {
        log("Не удалось создать папку: " + folderPath, "ERROR");
      }
    }
    return folder;
  }

  // Экспорт всех функций
  return {
    log: log,
    initLog: initLog,
    saveLogs: saveLogs,
    checkProject: checkProject,
    findComp: findComp,
    getComp: getComp,
    getAllComps: getAllComps,
    safeGetValue: safeGetValue,
    findLayer: findLayer,
    hasEffect: hasEffect,
    getEffect: getEffect,
    formatTime: formatTime,
    ensureFolder: ensureFolder,
    arrayContains: arrayContains,
    getTimestamp: getTimestamp,
    getFileTimestamp: getFileTimestamp,
  };
})();
