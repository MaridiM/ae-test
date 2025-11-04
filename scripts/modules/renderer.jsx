// ============================================
// RENDERER MODULE - Модуль рендера
// ============================================
// Налаштовує та виконує рендер композицій
// Експортує відео та кадри
// ============================================

var Renderer = (function () {
  var renderQueue = app.project.renderQueue;

  // ========================================
  // НАЛАШТУВАННЯ РЕНДЕРА
  // ========================================

  /**
   * Налаштовує рендер для композиції
   * @param {CompItem} comp - Композиція для рендера
   * @returns {Object} Результат налаштування {ready, renderItem, outputPath, error}
   */
  function setupRender(comp) {
    Utils.log("--- Налаштування рендера ---");

    // Валідація
    if (!comp) {
      Utils.log("Композицію не передано", "ERROR");
      return { ready: false, error: "No composition provided" };
    }

    try {
      // Додаємо композицію в чергу
      var renderItem = renderQueue.items.add(comp);

      // Генеруємо шлях до вихідного файлу
      var outputFile = getSafeOutputPath(comp, CONFIG.RENDER_FORMAT);

      // Отримуємо Output Module
      var om = renderItem.outputModule(1);

      // Призначаємо файл виводу
      om.file = outputFile;

      // Застосовуємо шаблон якості (якщо є)
      applyRenderTemplate(om);

      // Встановлюємо статус в QUEUED
      renderItem.render = true;

      // Виводимо інформацію
      Utils.log("  Композиція: " + comp.name);
      Utils.log("  Розмір: " + comp.width + "x" + comp.height);
      Utils.log("  FPS: " + comp.frameRate);
      Utils.log("  Тривалість: " + comp.duration.toFixed(2) + "s");
      Utils.log("  Output: " + om.file.fsName);
      Utils.log("  ✓ Рендер налаштовано успішно");

      return {
        renderItem: renderItem,
        outputPath: outputFile,
        ready: true,
      };
    } catch (e) {
      Utils.log("Помилка налаштування рендера: " + e.toString(), "ERROR");
      return { ready: false, error: e.toString() };
    }
  }

  /**
   * Застосовує шаблон рендера
   * @param {OutputModule} om - Output Module
   */
  function applyRenderTemplate(om) {
    var templates = ["Lossless", "High Quality", "Best Settings"];

    for (var i = 0; i < templates.length; i++) {
      try {
        om.applyTemplate(templates[i]);
        Utils.log("  Застосовано шаблон: " + templates[i]);
        return;
      } catch (e) {
        // Пробуємо наступний шаблон
      }
    }

    Utils.log(
      "  Шаблон не знайдено, використовуємо налаштування за замовчуванням",
      "WARN"
    );
  }

  // ========================================
  // ЗАПУСК РЕНДЕРА
  // ========================================

  /**
   * Запускає рендер всієї черги
   * @returns {boolean} Успішність рендера
   */
  function startRender() {
    Utils.log("\n=== ЗАПУСК РЕНДЕРА ===");

    // Перевірка наявності елементів
    if (renderQueue.numItems === 0) {
      Utils.log("Черга рендера пуста", "ERROR");
      return false;
    }

    Utils.log("Елементів в черзі: " + renderQueue.numItems);

    try {
      // Перевіряємо статус кожного елемента
      for (var i = 1; i <= renderQueue.numItems; i++) {
        var item = renderQueue.item(i);
        Utils.log("  Елемент " + i + ": " + item.comp.name);

        // Переконуємось що елемент готовий
        if (item.status !== RQItemStatus.QUEUED) {
          item.render = true;
        }
      }

      Utils.log("\nПочинаємо рендер (це може зайняти час)...\n");

      // ЗАПУСКАЄМО РЕНДЕР
      renderQueue.render();

      Utils.log("\n✓✓✓ РЕНДЕР ЗАВЕРШЕНО ✓✓✓");

      // Перевіряємо створені файли
      var createdFiles = checkRenderedFiles();
      if (createdFiles.length > 0) {
        Utils.log("\nСтворено файлів: " + createdFiles.length);
        for (var i = 0; i < createdFiles.length; i++) {
          var fileInfo = createdFiles[i];
          Utils.log("  ✓ " + fileInfo.name + " (" + fileInfo.sizeMB + " MB)");
        }
      }

      return true;
    } catch (e) {
      Utils.log("ПОМИЛКА РЕНДЕРА: " + e.toString(), "ERROR");
      if (e.line) {
        Utils.log("  Рядок: " + e.line, "ERROR");
      }
      return false;
    }
  }

  /**
   * Перевіряє створені файли після рендера
   * @returns {Array} Масив інформації про файли
   */
  function checkRenderedFiles() {
    var files = [];

    try {
      for (var i = 1; i <= renderQueue.numItems; i++) {
        var item = renderQueue.item(i);
        var om = item.outputModule(1);

        if (om.file && om.file.exists) {
          var fileSize = om.file.length;
          files.push({
            name: om.file.name,
            path: om.file.fsName,
            size: fileSize,
            sizeMB: (fileSize / 1024 / 1024).toFixed(2),
          });
        }
      }
    } catch (e) {
      Utils.log("Помилка перевірки файлів: " + e.toString(), "WARN");
    }

    return files;
  }

  // ========================================
  // ЕКСПОРТ КАДРІВ
  // ========================================

  /**
   * Експортує один кадр з композиції
   * @param {CompItem} comp - Композиція
   * @param {number} time - Час кадру (в секундах)
   * @returns {RenderQueueItem|null} Render Item або null
   */
  function exportFrame(comp, time) {
    Utils.log("Експорт кадру з: " + comp.name);

    try {
      var renderItem = renderQueue.items.add(comp);

      // Налаштовуємо на один кадр
      renderItem.timeSpanDuration = comp.frameDuration;
      renderItem.timeSpanStart = time || 0;

      var pngPath = getSafeOutputPath(comp, ".png");
      var om = renderItem.outputModule(1);

      // Застосовуємо PNG шаблон
      try {
        om.applyTemplate("PNG Sequence");
      } catch (e) {
        Utils.log("  PNG шаблон не знайдено", "WARN");
      }

      om.file = pngPath;
      renderItem.render = true;

      Utils.log("  Frame output: " + om.file.fsName);
      return renderItem;
    } catch (e) {
      Utils.log("Помилка експорту кадру: " + e.toString(), "ERROR");
      return null;
    }
  }

  // ========================================
  // УПРАВЛІННЯ ЧЕРГОЮ
  // ========================================

  /**
   * Очищає чергу рендера
   */
  function clearRenderQueue() {
    var count = renderQueue.numItems;

    try {
      while (renderQueue.numItems > 0) {
        renderQueue.item(1).remove();
      }

      if (count > 0) {
        Utils.log("Чергу рендера очищено (" + count + " елементів)");
      }
    } catch (e) {
      Utils.log("Помилка очищення черги: " + e.toString(), "ERROR");
    }
  }

  // ========================================
  // ДОПОМІЖНІ ФУНКЦІЇ
  // ========================================

  /**
   * Генерує безпечний шлях до вихідного файлу
   * @param {CompItem} comp - Композиція
   * @param {string} ext - Розширення файлу
   * @returns {File} Об'єкт файлу
   */
  function getSafeOutputPath(comp, ext) {
    var projectFile = app.project.file;
    var baseFolder = projectFile ? projectFile.parent : Folder.desktop;

    // Створюємо папку output
    var outputFolder = new Folder(baseFolder.fsName + CONFIG.OUTPUT_FOLDER);
    if (!outputFolder.exists) {
      if (!outputFolder.create()) {
        throw new Error("Не вдалося створити папку output");
      }
      Utils.log("Створено папку: " + outputFolder.fsName);
    }

    // Генеруємо безпечне ім'я файлу
    var timestamp = Utils.getFileTimestamp();
    var safeName = comp.name.replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = safeName + "_" + timestamp + (ext || "");

    var filePath = Folder.decode(outputFolder.fsName + "/" + fileName);

    Utils.log("  Шлях виводу: " + filePath);

    return new File(filePath);
  }

  return {
    setupRender: setupRender,
    startRender: startRender,
    clearRenderQueue: clearRenderQueue,
    exportFrame: exportFrame,
  };
})();
