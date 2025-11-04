// ============================================
// ANALYZER MODULE - Модуль аналізу
// ============================================
// Аналізує зв'язки між шарами через Expressions
// Знаходить прекомпозиції та параметри ефектів
// ============================================

var Analyzer = (function () {
  // ========================================
  // РЕГУЛЯРНІ ВИРАЗИ ДЛЯ ПАРСИНГУ
  // ========================================
  var PATTERNS = {
    // comp("Name").layer("Name")
    compLayer:
      /comp\s*\(\s*["']([^"']+)["']\s*\)\s*\.layer\s*\(\s*["']([^"']+)["']\s*\)/g,

    // layer("Name")
    layer: /layer\s*\(\s*["']([^"']+)["']\s*\)/g,

    // effect("Name")
    effect: /effect\s*\(\s*["']([^"']+)["']\s*\)/g,

    // .effect("Year")("Slider")
    effectParam:
      /\.effect\s*\(\s*["']([^"']+)["']\s*\)\s*\(\s*["']([^"']+)["']\s*\)/g,
  };

  // ========================================
  // ОСНОВНІ ФУНКЦІЇ АНАЛІЗУ
  // ========================================

  /**
   * Аналізує всі expressions в композиції
   * @param {CompItem} comp - Композиція для аналізу
   * @returns {Array} Масив знайдених зв'язків
   */
  function analyzeComposition(comp) {
    Utils.log("Аналіз композиції: " + comp.name);
    var connections = [];

    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        var layerConnections = analyzeLayer(layer);

        if (layerConnections.length > 0) {
          connections.push({
            layerName: layer.name,
            layerIndex: i,
            connections: layerConnections,
          });
        }
      }
    } catch (e) {
      Utils.log("Помилка аналізу композиції: " + e.toString(), "ERROR");
    }

    return connections;
  }

  /**
   * Аналізує окремий шар
   * @param {Layer} layer - Шар для аналізу
   * @returns {Array} Знайдені зв'язки
   */
  function analyzeLayer(layer) {
    var connections = [];

    try {
      // Рекурсивно перевіряємо всі властивості
      connections = connections.concat(analyzeProperty(layer, layer));

      // Окремо перевіряємо текстовий шар
      if (layer.property("Source Text")) {
        var textProp = layer.property("Source Text");
        if (textProp.expressionEnabled) {
          connections.push({
            type: "text",
            expression: textProp.expression,
            parsed: parseExpression(textProp.expression),
          });
        }
      }
    } catch (e) {
      Utils.log(
        "Помилка аналізу шару " + layer.name + ": " + e.toString(),
        "WARN"
      );
    }

    return connections;
  }

  /**
   * Рекурсивно аналізує властивості
   * @param {Property} prop - Властивість
   * @param {Layer} layer - Батьківський шар
   * @returns {Array} Знайдені зв'язки
   */
  function analyzeProperty(prop, layer) {
    var connections = [];
    if (!prop) return connections;

    try {
      // Перевіряємо наявність expression
      if (prop.expressionEnabled && prop.expression) {
        connections.push({
          type: "property",
          propertyName: prop.name,
          expression: prop.expression,
          parsed: parseExpression(prop.expression),
        });
      }

      // Рекурсивно перевіряємо вкладені властивості
      if (prop.numProperties) {
        for (var i = 1; i <= prop.numProperties; i++) {
          connections = connections.concat(
            analyzeProperty(prop.property(i), layer)
          );
        }
      }
    } catch (e) {
      // Деякі властивості можуть бути недоступні - це нормально
    }

    return connections;
  }

  // ========================================
  // ПАРСИНГ EXPRESSIONS
  // ========================================

  /**
   * Парсить expression та витягує всі посилання
   * @param {string} expr - Expression код
   * @returns {Object} Структура з посиланнями
   */
  function parseExpression(expr) {
    var result = {
      compositions: [],
      layers: [],
      effects: [],
      effectParameters: [],
    };

    try {
      var match;

      // Шукаємо comp().layer()
      PATTERNS.compLayer.lastIndex = 0;
      while ((match = PATTERNS.compLayer.exec(expr)) !== null) {
        if (!Utils.arrayContains(result.compositions, match[1])) {
          result.compositions.push(match[1]);
        }
        if (!Utils.arrayContains(result.layers, match[2])) {
          result.layers.push(match[2]);
        }
      }

      // Шукаємо layer()
      PATTERNS.layer.lastIndex = 0;
      while ((match = PATTERNS.layer.exec(expr)) !== null) {
        if (!Utils.arrayContains(result.layers, match[1])) {
          result.layers.push(match[1]);
        }
      }

      // Шукаємо effect()
      PATTERNS.effect.lastIndex = 0;
      while ((match = PATTERNS.effect.exec(expr)) !== null) {
        if (!Utils.arrayContains(result.effects, match[1])) {
          result.effects.push(match[1]);
        }
      }

      // Шукаємо .effect()("parameter")
      PATTERNS.effectParam.lastIndex = 0;
      while ((match = PATTERNS.effectParam.exec(expr)) !== null) {
        result.effectParameters.push({
          effect: match[1],
          parameter: match[2],
        });
      }
    } catch (e) {
      Utils.log("Помилка парсингу expression: " + e.toString(), "WARN");
    }

    return result;
  }

  // ========================================
  // ПОШУК ПРЕКОМПОЗИЦІЙ
  // ========================================

  /**
   * Знаходить всі прекомпозиції в композиції
   * @param {CompItem} comp - Композиція
   * @returns {Array} Масив прекомпозицій
   */
  function findPrecomps(comp) {
    Utils.log("Пошук прекомпозицій в: " + comp.name);
    var precomps = [];

    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);

        if (layer.source && layer.source instanceof CompItem) {
          precomps.push({
            layerName: layer.name,
            layerIndex: i,
            compName: layer.source.name,
            comp: layer.source,
          });
          Utils.log(
            "  Знайдено прекомпозицію: " +
              layer.name +
              " -> " +
              layer.source.name
          );
        }
      }
    } catch (e) {
      Utils.log("Помилка пошуку прекомпозицій: " + e.toString(), "ERROR");
    }

    return precomps;
  }

  // ========================================
  // АНАЛІЗ ПАРАМЕТРІВ ЕФЕКТІВ
  // ========================================

  /**
   * Детально аналізує параметри ефектів на шарі
   * @param {Layer} layer - Шар
   * @returns {Array} Масив параметрів ефектів
   */
  function analyzeEffectParameters(layer) {
    var effectParams = [];

    try {
      var effects = layer.property("Effects");
      if (!effects) return effectParams;

      for (var i = 1; i <= effects.numProperties; i++) {
        var effect = effects.property(i);
        var params = [];

        for (var j = 1; j <= effect.numProperties; j++) {
          try {
            var param = effect.property(j);
            var paramInfo = {
              name: param.name,
              matchName: param.matchName,
              value: null,
              type: "unknown",
            };

            // Визначаємо тип параметра
            if (param.matchName === "ADBE Slider Control-0001") {
              paramInfo.type = "slider";
              paramInfo.value = param.value;
            } else if (param.matchName === "ADBE Checkbox Control-0001") {
              paramInfo.type = "checkbox";
              paramInfo.value = param.value;
            } else if (param.matchName === "ADBE Color Control-0001") {
              paramInfo.type = "color";
              paramInfo.value = param.value;
            } else if (param.value !== undefined) {
              paramInfo.value = param.value;
            }

            params.push(paramInfo);
          } catch (e) {
            // Деякі параметри недоступні
          }
        }

        effectParams.push({
          effectName: effect.name,
          matchName: effect.matchName,
          parameters: params,
        });
      }
    } catch (e) {
      Utils.log("Помилка аналізу параметрів ефектів: " + e.toString(), "WARN");
    }

    return effectParams;
  }

  // ========================================
  // ГЕНЕРАЦІЯ ЗВІТІВ
  // ========================================

  /**
   * Створює детальний звіт про зв'язки
   * @param {CompItem} comp - Композиція
   * @returns {Object} Структурований звіт
   */
  function generateConnectionReport(comp) {
    Utils.log("\n=== ДЕТАЛЬНИЙ ЗВІТ ПРО ЗВ'ЯЗКИ ===");

    var report = {
      composition: comp.name,
      layers: [],
      totalConnections: 0,
    };

    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        var layerReport = {
          name: layer.name,
          index: i,
          expressions: [],
          effectParameters: [],
        };

        var connections = analyzeLayer(layer);
        if (connections.length > 0) {
          layerReport.expressions = connections;
          report.totalConnections += connections.length;
        }

        var effectParams = analyzeEffectParameters(layer);
        if (effectParams.length > 0) {
          layerReport.effectParameters = effectParams;
        }

        if (
          layerReport.expressions.length > 0 ||
          layerReport.effectParameters.length > 0
        ) {
          report.layers.push(layerReport);
        }
      }

      // Виводимо звіт
      Utils.log("Композиція: " + report.composition);
      Utils.log("Шарів зі зв'язками: " + report.layers.length);
      Utils.log("Всього з'єднань: " + report.totalConnections);

      for (var i = 0; i < report.layers.length; i++) {
        var lr = report.layers[i];
        Utils.log("\n  [" + lr.index + "] " + lr.name);

        for (var j = 0; j < lr.expressions.length; j++) {
          var expr = lr.expressions[j];
          Utils.log("    Expression: " + expr.propertyName);
          if (expr.parsed.layers.length > 0) {
            Utils.log("      → Шари: " + expr.parsed.layers.join(", "));
          }
          if (expr.parsed.effects.length > 0) {
            Utils.log("      → Ефекти: " + expr.parsed.effects.join(", "));
          }
        }
      }
    } catch (e) {
      Utils.log("Помилка генерації звіту: " + e.toString(), "ERROR");
    }

    return report;
  }

  return {
    analyzeComposition: analyzeComposition,
    findPrecomps: findPrecomps,
    parseExpression: parseExpression,
    analyzeEffectParameters: analyzeEffectParameters,
    generateConnectionReport: generateConnectionReport,
  };
})();
