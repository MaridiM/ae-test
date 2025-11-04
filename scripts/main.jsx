// ============================================
// MAIN SCRIPT - Primary automation script
// ============================================
// After Effects Automation Script
// Automatically analyzes, modifies, and renders the AE project
// ============================================

// ========================================
// MODULE IMPORTS
// ========================================
//@include "config.jsx"
//@include "modules/utils.jsx"
//@include "modules/analyzer.jsx"
//@include "modules/modifier.jsx"
//@include "modules/renderer.jsx"

// ========================================
// MAIN FUNCTION
// ========================================

/**
 * Main entry point for the script
 * Performs all steps: analysis → modification → render
 */
function main() {
  var startTime = new Date();
  var undoGroupStarted = false; // IMPORTANT: flag for tracking the undo group

  // ========================================
  // INITIALIZATION
  // ========================================
  Utils.initLog();
  Utils.log("╔════════════════════════════════════════╗");
  Utils.log("║  After Effects Automation Script       ║");
  Utils.log("╚════════════════════════════════════════╝\n");

  // Project validation
  if (!Utils.checkProject()) {
    return;
  }

  try {
    // ========================================
    // STEP 1: FIND COMPOSITIONS
    // ========================================
    Utils.log("\n┌─ КРОК 1: Пошук композицій ────────────┐");

    var renderComp = Utils.getComp(CONFIG.RENDER_COMP);
    var customizeComp = Utils.getComp(CONFIG.CUSTOMIZE_COMP);

    // Validation
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
    // STEP 2: CONNECTION ANALYSIS
    // ========================================
    Utils.log("\n┌─ КРОК 2: Аналіз зв'язків ─────────────┐");

    // Basic analysis
    var connections = Analyzer.analyzeComposition(renderComp);
    Utils.log("  Знайдено шарів зі зв'язками: " + connections.length);

    // Precomposition search
    var precomps = Analyzer.findPrecomps(customizeComp);
    Utils.log("  Знайдено прекомпозицій: " + precomps.length);

    // Output details
    for (var i = 0; i < precomps.length; i++) {
      Utils.log(
        "    • " + precomps[i].layerName + " → " + precomps[i].compName
      );
    }

    // Detailed report
    Utils.log("\n  📊 Детальний звіт:");
    var detailedReport = Analyzer.generateConnectionReport(renderComp);

    // Effect parameter analysis
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
    // STEP 3: CONTENT MODIFICATION
    // ========================================
    Utils.log("\n┌─ КРОК 3: Модифікація контенту ────────┐");

    // START THE UNDO GROUP (only before modification)
    app.beginUndoGroup("Автоматизація AE");
    undoGroupStarted = true; // Set the flag

    Utils.log("  🔄 Undo Group розпочато");

    // 3.1 Text replacement
    Utils.log("\n  📝 Заміна тексту...");
    var textChanged = Modifier.replaceAllText(customizeComp, "Changed");
    Utils.log("  ✓ Змінено текстових шарів: " + textChanged);

    // 3.2 Video replacement
    Utils.log("\n  🎬 Заміна відео...");
    var videosReplaced = Modifier.replaceVideosInPrecomps(precomps);
    Utils.log("  ✓ Замінено відео: " + videosReplaced);

    // 3.3 Additional modifications (optional)
    Utils.log("\n  🎨 Додаткові можливості:");
    Utils.log("    • Зміна кольорів (changeLayerLabelColor)");
    Utils.log("    • Зміна позицій (changeLayerPosition)");
    Utils.log("    • Зміна ефектів (changeEffectParameter)");
    Utils.log("    • Зміна анімації (modifyAnimation)");
    Utils.log("    • Зміна таймінгу (changeLayerTiming)");
    Utils.log("    Див. приклади в docs/EXAMPLES.md");

    Utils.log("\n└────────────────────────────────────────┘");

    // ========================================
    // STEP 4: RENDER
    // ========================================
    Utils.log("\n┌─ КРОК 4: Рендер ──────────────────────┐");

    // Clear the queue
    Renderer.clearRenderQueue();

    // Configure the render
    var renderSetup = Renderer.setupRender(renderComp);

    if (!renderSetup.ready) {
      throw new Error("Не вдалося налаштувати рендер: " + renderSetup.error);
    }

    // Start the render
    var renderSuccess = Renderer.startRender();

    if (!renderSuccess) {
      throw new Error("Рендер завершився з помилкою");
    }

    Utils.log("└────────────────────────────────────────┘");

    // CLOSE THE UNDO GROUP (only if it was opened)
    if (undoGroupStarted) {
      app.endUndoGroup();
      undoGroupStarted = false;
      Utils.log("  🔄 Undo Group завершено");
    }

    // ========================================
    // FINALIZATION
    // ========================================
    var endTime = new Date();
    var duration = (endTime.getTime() - startTime.getTime()) / 1000;

    Utils.log("\n╔════════════════════════════════════════╗");
    Utils.log("║       ВИКОНАНО УСПІШНО ✓✓✓            ║");
    Utils.log("╚════════════════════════════════════════╝");
    Utils.log("⏱  Час виконання: " + duration.toFixed(2) + " сек");
    Utils.log("📁 Результат в папці: output/");
    Utils.log("📄 Логи в папці: logs/");

    // Save logs
    Utils.saveLogs();

    // Final notification
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
    // ERROR HANDLING
    // ========================================

    // IMPORTANT: close the undo group ONLY if it was opened
    if (undoGroupStarted) {
      try {
        app.endUndoGroup();
        Utils.log("  🔄 Undo Group закрито через помилку", "WARN");
      } catch (undoError) {
        // Ignore undo group closure errors
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

    // Output stack trace if present
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
// EXECUTION
// ========================================

// Environment check
if (typeof app === "undefined") {
  alert("❌ Цей скрипт повинен бути запущений в Adobe After Effects!");
} else {
  main();
}
