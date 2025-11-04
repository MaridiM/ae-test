// ============================================
// RENDERER MODULE - Rendering module
// ============================================
// Configures and runs composition renders
// Exports videos and still frames
// ============================================

var Renderer = (function () {
  var renderQueue = app.project.renderQueue;

  // ========================================
  // RENDER SETUP
  // ========================================

  /**
   * Configures render settings for a composition
   * @param {CompItem} comp - Composition to render
   * @returns {Object} Setup result {ready, renderItem, outputPath, error}
   */
  function setupRender(comp) {
    Utils.log("--- Налаштування рендера ---");

    // Validation
    if (!comp) {
      Utils.log("Композицію не передано", "ERROR");
      return { ready: false, error: "No composition provided" };
    }

    try {
      // Add the composition to the queue
      var renderItem = renderQueue.items.add(comp);

      // Generate the output path
      var outputFile = getSafeOutputPath(comp, CONFIG.RENDER_FORMAT);

      // Fetch the output module
      var om = renderItem.outputModule(1);

      // Assign the output file
      om.file = outputFile;

      // Apply a quality template when available
      applyRenderTemplate(om);

      // Set the status to QUEUED
      renderItem.render = true;

      // Log diagnostic information
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
   * Applies a render template
   * @param {OutputModule} om - Output module
   */
  function applyRenderTemplate(om) {
    var templates = ["Lossless", "High Quality", "Best Settings"];

    for (var i = 0; i < templates.length; i++) {
      try {
        om.applyTemplate(templates[i]);
        Utils.log("  Застосовано шаблон: " + templates[i]);
        return;
      } catch (e) {
        // Try the next template
      }
    }

    Utils.log(
      "  Шаблон не знайдено, використовуємо налаштування за замовчуванням",
      "WARN"
    );
  }

  // ========================================
  // RENDER EXECUTION
  // ========================================

  /**
   * Starts rendering the entire queue
   * @returns {boolean} Whether rendering succeeded
   */
  function startRender() {
    Utils.log("\n=== ЗАПУСК РЕНДЕРА ===");

    // Ensure there are items
    if (renderQueue.numItems === 0) {
      Utils.log("Черга рендера пуста", "ERROR");
      return false;
    }

    Utils.log("Елементів в черзі: " + renderQueue.numItems);

    try {
      // Check the status of each item
      for (var i = 1; i <= renderQueue.numItems; i++) {
        var item = renderQueue.item(i);
        Utils.log("  Елемент " + i + ": " + item.comp.name);

        // Ensure the item is ready
        if (item.status !== RQItemStatus.QUEUED) {
          item.render = true;
        }
      }

      Utils.log("\nПочинаємо рендер (це може зайняти час)...\n");

      // START THE RENDER
      renderQueue.render();

      Utils.log("\n✓✓✓ РЕНДЕР ЗАВЕРШЕНО ✓✓✓");

      // Verify the generated files
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
   * Checks the files created after rendering
   * @returns {Array} File information array
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
  // FRAME EXPORT
  // ========================================

  /**
   * Exports a single frame from a composition
   * @param {CompItem} comp - Composition
   * @param {number} time - Frame time (seconds)
   * @returns {RenderQueueItem|null} Render item or null
   */
  function exportFrame(comp, time) {
    Utils.log("Експорт кадру з: " + comp.name);

    try {
      var renderItem = renderQueue.items.add(comp);

      // Configure for a single frame
      renderItem.timeSpanDuration = comp.frameDuration;
      renderItem.timeSpanStart = time || 0;

      var pngPath = getSafeOutputPath(comp, ".png");
      var om = renderItem.outputModule(1);

      // Apply the PNG template
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
  // QUEUE MANAGEMENT
  // ========================================

  /**
   * Clears the render queue
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
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Generates a safe output path
   * @param {CompItem} comp - Composition
   * @param {string} ext - File extension
   * @returns {File} File object
   */
  function getSafeOutputPath(comp, ext) {
    var projectFile = app.project.file;
    var baseFolder = projectFile ? projectFile.parent : Folder.desktop;

    // Create the output folder
    var outputFolder = new Folder(baseFolder.fsName + CONFIG.OUTPUT_FOLDER);
    if (!outputFolder.exists) {
      if (!outputFolder.create()) {
        throw new Error("Не вдалося створити папку output");
      }
      Utils.log("Створено папку: " + outputFolder.fsName);
    }

    // Generate a safe filename
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
