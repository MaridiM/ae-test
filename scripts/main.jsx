// ============================================
// MAIN SCRIPT - Головний скрипт автоматизації
// ============================================
// After Effects Automation Script
// Автоматично аналізує, модифікує та рендерить проект AE
// ============================================

// ========================================
// ПІДКЛЮЧЕННЯ МОДУЛІВ
// ========================================
//@include "modules/utils.jsx"
//@include "modules/analyzer.jsx"
//@include "modules/modifier.jsx"
//@include "modules/renderer.jsx"

// ========================================
// ГОЛОВНА ФУНКЦІЯ
// ========================================

/**
 * Головна функція виконання скрипта
 * Виконує всі кроки: аналіз → модифікація → рендер
 */
function main() {
  var startTime = new Date();
  var undoGroupStarted = false; // ВАЖЛИВО: флаг для відслідковування undo group

  // ========================================
  // ІНІЦІАЛІЗАЦІЯ
  // ========================================
  Utils.initLog();
  Utils.log("╔════════════════════════════════════════╗");
  Utils.log("║  After Effects Automation Script       ║");
  Utils.log("╚════════════════════════════════════════╝\n");

  // Перевірка проекту
  if (!Utils.checkProject()) {
    return;
  }

  try {
    // ========================================
    // ШАГ 1: ПОШУК КОМПОЗИЦІЙ
    // ========================================
    Utils.log("\n┌─ КРОК 1: Пошук композицій ────────────┐");

    var renderComp = Utils.getComp(CONFIG.RENDER_COMP);
    var customizeComp = Utils.getComp(CONFIG.CUSTOMIZE_COMP);

    // Валідація
    if (!renderComp) {
      throw new Error("Не знайдено композицію: " + CONFIG.RENDER_COMP);
    }
    if (!customizeComp) {
      throw new Error("Не знайдено композицію: " + CONFIG.CUSTOMIZE_COMP);
    }

    Utils.log("  ✓ Знайдено: " + renderComp.name);
    Utils.log("  ✓ Знайдено: " + customizeComp.name);
    Utils.log("└────────────────────────────────────────┘");

    // ========================================
    // КРОК 2: АНАЛІЗ ЗВ'ЯЗКІВ
    // ========================================
    Utils.log("\n┌─ КРОК 2: Аналіз зв'язків ─────────────┐");

    // Базовий аналіз
    var connections = Analyzer.analyzeComposition(renderComp);
    Utils.log("  Знайдено шарів зі зв'язками: " + connections.length);

    // Пошук прекомпозицій
    var precomps = Analyzer.findPrecomps(customizeComp);
    Utils.log("  Знайдено прекомпозицій: " + precomps.length);

    // Виводимо деталі
    for (var i = 0; i < precomps.length; i++) {
      Utils.log(
        "    • " + precomps[i].layerName + " → " + precomps[i].compName
      );
    }

    // Детальний звіт
    Utils.log("\n  📊 Детальний звіт:");
    var detailedReport = Analyzer.generateConnectionReport(renderComp);

    // Аналіз параметрів ефектів
    Utils.log("\n  🔍 Параметри ефектів в Customize Scene:");
    for (var i = 1; i <= customizeComp.numLayers; i++) {
      var layer = customizeComp.layer(i);
      var effectParams = Analyzer.analyzeEffectParameters(layer);

      if (effectParams.length > 0) {
        Utils.log("\n    Шар: " + layer.name);
        for (var j = 0; j < effectParams.length; j++) {
          var eff = effectParams[j];
          Utils.log("      Ефект: " + eff.effectName);

          for (var k = 0; k < eff.parameters.length; k++) {
            var param = eff.parameters[k];
            if (
              param.type === "slider" ||
              param.type === "checkbox" ||
              param.type === "color"
            ) {
              Utils.log(
                "        • " +
                  param.name +
                  " [" +
                  param.type +
                  "] = " +
                  param.value
              );
            }
          }
        }
      }
    }

    Utils.log("\n└────────────────────────────────────────┘");

    // ========================================
    // КРОК 3: МОДИФІКАЦІЯ КОНТЕНТУ
    // ========================================
    Utils.log("\n┌─ КРОК 3: Модифікація контенту ────────┐");

    // ПОЧИНАЄМО UNDO GROUP (тільки перед модифікацією)
    app.beginUndoGroup("Автоматизація AE");
    undoGroupStarted = true; // Встановлюємо флаг

    Utils.log("  🔄 Undo Group розпочато");

    // 3.1 Заміна тексту
    Utils.log("\n  📝 Заміна тексту...");
    var textChanged = Modifier.replaceAllText(customizeComp, "Changed");
    Utils.log("  ✓ Змінено текстових шарів: " + textChanged);

    // 3.2 Заміна відео
    Utils.log("\n  🎬 Заміна відео...");
    var videosReplaced = Modifier.replaceVideosInPrecomps(precomps);
    Utils.log("  ✓ Замінено відео: " + videosReplaced);

    // 3.3 Додаткові модифікації (опціонально)
    Utils.log("\n  🎨 Додаткові можливості:");
    Utils.log("    • Зміна кольорів (changeLayerLabelColor)");
    Utils.log("    • Зміна позицій (changeLayerPosition)");
    Utils.log("    • Зміна ефектів (changeEffectParameter)");
    Utils.log("    • Зміна анімації (modifyAnimation)");
    Utils.log("    • Зміна таймінгу (changeLayerTiming)");
    Utils.log("    Див. приклади в docs/EXAMPLES.md");

    Utils.log("\n└────────────────────────────────────────┘");

    // ========================================
    // КРОК 4: РЕНДЕР
    // ========================================
    Utils.log("\n┌─ КРОК 4: Рендер ──────────────────────┐");

    // Очищаємо чергу
    Renderer.clearRenderQueue();

    // Налаштовуємо рендер
    var renderSetup = Renderer.setupRender(renderComp);

    if (!renderSetup.ready) {
      throw new Error("Не вдалося налаштувати рендер: " + renderSetup.error);
    }

    // Запускаємо рендер
    var renderSuccess = Renderer.startRender();

    if (!renderSuccess) {
      throw new Error("Рендер завершився з помилкою");
    }

    Utils.log("└────────────────────────────────────────┘");

    // ЗАКРИВАЄМО UNDO GROUP (тільки якщо він був відкритий)
    if (undoGroupStarted) {
      app.endUndoGroup();
      undoGroupStarted = false;
      Utils.log("  🔄 Undo Group завершено");
    }

    // ========================================
    // ЗАВЕРШЕННЯ
    // ========================================
    var endTime = new Date();
    var duration = (endTime.getTime() - startTime.getTime()) / 1000;

    Utils.log("\n╔════════════════════════════════════════╗");
    Utils.log("║       ВИКОНАНО УСПІШНО ✓✓✓            ║");
    Utils.log("╚════════════════════════════════════════╝");
    Utils.log("⏱  Час виконання: " + duration.toFixed(2) + " сек");
    Utils.log("📁 Результат в папці: output/");
    Utils.log("📄 Логи в папці: logs/");

    // Зберігаємо логи
    Utils.saveLogs();

    // Фінальне повідомлення
    alert(
      "✓ Скрипт виконано успішно!\n\n" +
        "⏱  Час: " +
        duration.toFixed(2) +
        " сек\n" +
        "📁 Перевірте папку output/\n" +
        "📄 Логи в папці logs/"
    );
  } catch (error) {
    // ========================================
    // ОБРОБКА ПОМИЛОК
    // ========================================

    // ВАЖЛИВО: закриваємо undo group ТІЛЬКИ якщо він був відкритий
    if (undoGroupStarted) {
      try {
        app.endUndoGroup();
        Utils.log("  🔄 Undo Group закрито через помилку", "WARN");
      } catch (undoError) {
        // Ігноруємо помилки закриття undo group
        Utils.log(
          "  ⚠ Помилка закриття Undo Group: " + undoError.toString(),
          "WARN"
        );
      }
    }

    Utils.log("\n╔════════════════════════════════════════╗", "ERROR");
    Utils.log("║        КРИТИЧНА ПОМИЛКА ✗✗✗           ║", "ERROR");
    Utils.log("╚════════════════════════════════════════╝", "ERROR");
    Utils.log("❌ Помилка: " + error.toString(), "ERROR");

    if (error.line) {
      Utils.log("📍 Рядок: " + error.line, "ERROR");
    }

    // Виводимо stack trace якщо є
    if (error.stack) {
      Utils.log("\nStack trace:", "ERROR");
      Utils.log(error.stack, "ERROR");
    }

    Utils.saveLogs();

    alert(
      "❌ ПОМИЛКА!\n\n" +
        error.toString() +
        "\n\n" +
        "Перевірте лог-файл в папці logs/ для деталей."
    );
  }
}

// ========================================
// ЗАПУСК
// ========================================

// Перевірка середовища
if (typeof app === "undefined") {
  alert("❌ Цей скрипт повинен бути запущений в Adobe After Effects!");
} else {
  main();
}
