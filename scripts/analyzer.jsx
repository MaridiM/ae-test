var Analyzer = (function () {
  // Регулярные выражения для поиска связей
  var PATTERNS = {
    // Ищем comp("Customize Scene").layer("Something")
    compLayer:
      /comp\s*\(\s*["']([^"']+)["']\s*\)\s*\.layer\s*\(\s*["']([^"']+)["']\s*\)/g,
    // Ищем layer("Something")
    layer: /layer\s*\(\s*["']([^"']+)["']\s*\)/g,
    // Ищем effect("Effect Name")
    effect: /effect\s*\(\s*["']([^"']+)["']\s*\)/g,
    // Ищем обращение к параметрам типа ("Slider")
    param: /\(\s*["']([^"']+)["']\s*\)/g,
  };

  // Анализ всех expressions в композиции
  function analyzeComposition(comp) {
    Utils.log("Анализ композиции: " + comp.name);
    var connections = [];

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

    return connections;
  }

  // Анализ отдельного слоя
  function analyzeLayer(layer) {
    var connections = [];

    // Проверяем все свойства слоя
    connections = connections.concat(analyzeProperty(layer, layer));

    // Если это текстовый слой
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

    return connections;
  }

  // Рекурсивный анализ свойств
  function analyzeProperty(prop, layer) {
    var connections = [];

    if (!prop) return connections;

    try {
      // Если у свойства есть expression
      if (prop.expressionEnabled && prop.expression) {
        connections.push({
          type: "property",
          propertyName: prop.name,
          expression: prop.expression,
          parsed: parseExpression(prop.expression),
        });
      }

      // Рекурсивно проверяем вложенные свойства
      if (prop.numProperties) {
        for (var i = 1; i <= prop.numProperties; i++) {
          connections = connections.concat(
            analyzeProperty(prop.property(i), layer)
          );
        }
      }
    } catch (e) {
      Utils.log("Ошибка анализа свойства: " + e.toString(), "WARN");
    }

    return connections;
  }

  // Парсинг expression
  function parseExpression(expr) {
    var result = {
      compositions: [],
      layers: [],
      effects: [],
      parameters: [],
    };

    // Ищем композиции и слои
    var match;
    PATTERNS.compLayer.lastIndex = 0;
    while ((match = PATTERNS.compLayer.exec(expr)) !== null) {
      result.compositions.push(match[1]);
      result.layers.push(match[2]);
    }

    // Ищем просто layer()
    PATTERNS.layer.lastIndex = 0;
    while ((match = PATTERNS.layer.exec(expr)) !== null) {
      // Проверяем дубликаты
      if (!Utils.arrayContains(result.layers, match[1])) {
        result.layers.push(match[1]);
      }
    }

    // Ищем эффекты
    PATTERNS.effect.lastIndex = 0;
    while ((match = PATTERNS.effect.exec(expr)) !== null) {
      result.effects.push(match[1]);
    }

    return result;
  }

  // Поиск прекомпозиций
  function findPrecomps(comp) {
    Utils.log("Поиск прекомпозиций в: " + comp.name);
    var precomps = [];

    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);

      // Проверяем является ли source композицией
      if (layer.source && layer.source instanceof CompItem) {
        precomps.push({
          layerName: layer.name,
          layerIndex: i,
          compName: layer.source.name,
          comp: layer.source,
        });
        Utils.log(
          "  Найдена прекомпозиция: " + layer.name + " -> " + layer.source.name
        );
      }
    }

    return precomps;
  }

  return {
    analyzeComposition: analyzeComposition,
    findPrecomps: findPrecomps,
    parseExpression: parseExpression,
  };
})();
