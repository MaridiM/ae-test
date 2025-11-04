// ============================================
// ГЛАВНЫЙ ФАЙЛ СКРИПТА
// After Effects Automation Script
// ============================================

// Подключение модулей (порядок важен!)
//@include "utils.jsx"
//@include "analyzer.jsx"
//@include "modifier.jsx"
//@include "renderer.jsx"

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

function main() {
  var startTime = new Date();

  // Инициализируем логирование
  Utils.initLog();
  Utils.log("========================================");
  Utils.log("  After Effects Automation Script");
  Utils.log("========================================\n");

  // Проверяем проект
  if (!Utils.checkProject()) {
    return;
  }

  try {
    // === ШАГ 1: Поиск композиций ===
    Utils.log("\n--- ШАГ 1: Поиск композиций ---");

    var renderComp = Utils.getComp(CONFIG.RENDER_COMP);
    var customizeComp = Utils.getComp(CONFIG.CUSTOMIZE_COMP);

    if (!renderComp) {
      throw new Error("Не найдена композиция: " + CONFIG.RENDER_COMP);
    }
    if (!customizeComp) {
      throw new Error("Не найдена композиция: " + CONFIG.CUSTOMIZE_COMP);
    }

    Utils.log("✓ Найдена: " + renderComp.name);
    Utils.log("✓ Найдена: " + customizeComp.name);

    // === ШАГ 2: Анализ ===
    Utils.log("\n--- ШАГ 2: Анализ связей ---");

    var connections = Analyzer.analyzeComposition(renderComp);
    Utils.log("Найдено слоев со связями: " + connections.length);

    var precomps = Analyzer.findPrecomps(customizeComp);
    Utils.log("Найдено прекомпозиций: " + precomps.length);

    // Выводим детали
    for (var i = 0; i < precomps.length; i++) {
      Utils.log("  • " + precomps[i].layerName + " → " + precomps[i].compName);
    }

    // === ШАГ 3: Модификация ===
    Utils.log("\n--- ШАГ 3: Модификация контента ---");

    app.beginUndoGroup("Автоматизация AE");

    // Замена текста
    var textChanged = Modifier.replaceAllText(customizeComp, "Changed");
    Utils.log("✓ Изменено текстовых слоев: " + textChanged);

    // Замена видео
    var videosReplaced = Modifier.replaceVideosInPrecomps(precomps);
    Utils.log("✓ Заменено видео: " + videosReplaced);

    // === ШАГ 4: Рендер ===
    Utils.log("\n--- ШАГ 4: Рендер ---");

    Renderer.clearRenderQueue();

    var renderSetup = Renderer.setupRender(renderComp);

    if (!renderSetup.ready) {
      throw new Error("Не удалось настроить рендер: " + renderSetup.error);
    }

    var renderSuccess = Renderer.startRender();

    if (!renderSuccess) {
      throw new Error("Рендер завершился с ошибкой");
    }

    app.endUndoGroup();

    // === ЗАВЕРШЕНИЕ ===
    var endTime = new Date();

    // ИСПРАВЛЕНО: используем .getTime() для вычисления разницы
    var duration = (endTime.getTime() - startTime.getTime()) / 1000;

    Utils.log("\n========================================");
    Utils.log("  УСПЕШНО ЗАВЕРШЕНО");
    Utils.log("========================================");
    Utils.log("Время выполнения: " + duration.toFixed(2) + " сек");

    Utils.saveLogs();

    alert(
      "Скрипт выполнен успешно!\n\n" +
        "Время: " +
        duration.toFixed(2) +
        " сек\n\n" +
        "Проверьте папку output."
    );
  } catch (error) {
    app.endUndoGroup();

    Utils.log("\n!!! КРИТИЧЕСКАЯ ОШИБКА !!!", "ERROR");
    Utils.log("Ошибка: " + error.toString(), "ERROR");
    if (error.line) {
      Utils.log("Строка: " + error.line, "ERROR");
    }

    Utils.saveLogs();

    alert("ОШИБКА!\n\n" + error.toString() + "\n\nПроверьте лог-файл.");
  }
}

// ============================================
// ЗАПУСК
// ============================================

if (typeof app === "undefined") {
  alert("Этот скрипт должен быть запущен в Adobe After Effects!");
} else {
  main();
}
