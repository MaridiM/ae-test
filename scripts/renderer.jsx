var Renderer = (function () {
  var renderQueue = app.project.renderQueue;

  // Настройка рендера для композиции
  function setupRender(comp) {
    Utils.log("--- Настройка рендера ---");

    if (!comp) {
      Utils.log("Композиция не передана", "ERROR");
      return { ready: false, error: "No composition provided" };
    }

    try {
      // Добавляем композицию в очередь
      var renderItem = renderQueue.items.add(comp);

      // Генерируем путь к выходному файлу
      var outputFile = getSafeOutputPath(comp, CONFIG.RENDER_FORMAT);

      // Получаем первый Output Module
      var om = renderItem.outputModule(1);

      // Назначаем файл вывода
      om.file = outputFile;

      // Пытаемся применить шаблон Lossless (если есть)
      try {
        om.applyTemplate("Lossless");
        Utils.log("  Применен шаблон: Lossless");
      } catch (e) {
        Utils.log(
          "  Шаблон не найден, используем настройки по умолчанию",
          "WARN"
        );
      }

      // Устанавливаем статус в QUEUED
      renderItem.render = true;

      Utils.log("  Композиция: " + comp.name);
      Utils.log("  Output: " + om.file.fsName);
      Utils.log("  ✓ Рендер настроен успешно");

      return { renderItem: renderItem, outputPath: outputFile, ready: true };
    } catch (e) {
      Utils.log("Ошибка настройки рендера: " + e.toString(), "ERROR");
      return { ready: false, error: e.toString() };
    }
  }

  // Экспорт одного кадра (опционально)
  function exportFrame(comp, time) {
    Utils.log("Экспорт кадра из: " + comp.name);

    try {
      var renderItem = renderQueue.items.add(comp);
      renderItem.timeSpanDuration = comp.frameDuration;
      renderItem.timeSpanStart = time || 0;

      var pngPath = getSafeOutputPath(comp, ".png");
      var om = renderItem.outputModule(1);

      // Пытаемся применить PNG шаблон
      try {
        om.applyTemplate("PNG Sequence");
      } catch (e) {
        Utils.log("  PNG шаблон не найден", "WARN");
      }

      om.file = pngPath;
      renderItem.render = true;

      Utils.log("  Frame output: " + om.file.fsName);
      return renderItem;
    } catch (e) {
      Utils.log("Ошибка экспорта кадра: " + e.toString(), "ERROR");
      return null;
    }
  }

  // Запуск рендера
  function startRender() {
    Utils.log("\n=== ЗАПУСК РЕНДЕРА ===");

    if (renderQueue.numItems === 0) {
      Utils.log("Очередь рендера пуста", "ERROR");
      return false;
    }

    Utils.log("Элементов в очереди: " + renderQueue.numItems);

    try {
      // Проверяем все элементы очереди
      for (var i = 1; i <= renderQueue.numItems; i++) {
        var it = renderQueue.item(i);
        Utils.log("  Элемент " + i + ": " + it.comp.name);

        // Убеждаемся что элемент в статусе QUEUED
        if (it.status !== RQItemStatus.QUEUED) {
          it.render = true;
        }
      }

      Utils.log("\nНачинаем рендер (это может занять время)...\n");

      // ЗАПУСКАЕМ РЕНДЕР
      renderQueue.render();

      Utils.log("\n✓✓✓ РЕНДЕР ЗАВЕРШЕН ✓✓✓");

      // Показываем созданные файлы
      for (var i = 1; i <= renderQueue.numItems; i++) {
        var item = renderQueue.item(i);
        var om = item.outputModule(1);
        if (om.file && om.file.exists) {
          Utils.log("  ✓ Создан файл: " + om.file.fsName);
        }
      }

      return true;
    } catch (e) {
      Utils.log("ОШИБКА РЕНДЕРА: " + e.toString(), "ERROR");
      Utils.log("  Line: " + e.line, "ERROR");
      return false;
    }
  }

  // Очистка очереди рендера
  function clearRenderQueue() {
    var count = renderQueue.numItems;
    while (renderQueue.numItems > 0) {
      renderQueue.item(1).remove();
    }
    if (count > 0) {
      Utils.log("Очередь рендера очищена (" + count + " элементов)");
    }
  }

  // Генерация безопасного пути к выходному файлу
  function getSafeOutputPath(comp, ext) {
    var projectFile = app.project.file;
    var baseFolder = projectFile ? projectFile.parent : Folder.desktop;

    // Создаем папку output
    var outputFolder = new Folder(baseFolder.fsName + CONFIG.OUTPUT_FOLDER);
    if (!outputFolder.exists) {
      if (!outputFolder.create()) {
        throw new Error("Не удалось создать папку output");
      }
      Utils.log("Создана папка: " + outputFolder.fsName);
    }

    // Генерируем безопасное имя файла
    var timestamp = Utils.getFileTimestamp();
    var safeName = comp.name.replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = safeName + "_" + timestamp + (ext || "");

    var filePath = Folder.decode(outputFolder.fsName + "/" + fileName);

    Utils.log("  Путь вывода: " + filePath);

    return new File(filePath);
  }

  // Экспорт функций модуля
  return {
    setupRender: setupRender,
    startRender: startRender,
    clearRenderQueue: clearRenderQueue,
    exportFrame: exportFrame,
  };
})();
