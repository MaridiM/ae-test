// ============================================
// ANALYZER MODULE - Analysis module
// ============================================
// Analyzes layer links via expressions
// Finds precompositions and effect parameters
// ============================================

var Analyzer = (function () {
  // ========================================
  // REGEX PATTERNS FOR PARSING
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
  // CORE ANALYSIS FUNCTIONS
  // ========================================

  /**
   * Analyzes every expression inside a composition
   * @param {CompItem} comp - Composition to analyze
   * @returns {Array} List of detected connections
   */
  function analyzeComposition(comp) {
    Utils.log("Analyzing composition: " + comp.name);
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
      Utils.log("Error analyzing composition: " + e.toString(), "ERROR");
    }

    return connections;
  }

  /**
   * Analyzes a single layer
   * @param {Layer} layer - Layer to inspect
   * @returns {Array} Discovered connections
   */
  function analyzeLayer(layer) {
    var connections = [];

    try {
      // Recursively inspect every property
      connections = connections.concat(analyzeProperty(layer, layer));

      // Check the text layer separately
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
        "Error analyzing layer " + layer.name + ": " + e.toString(),
        "WARN"
      );
    }

    return connections;
  }

  /**
   * Recursively analyzes properties
   * @param {Property} prop - Property to inspect
   * @param {Layer} layer - Parent layer
   * @returns {Array} Discovered connections
   */
  function analyzeProperty(prop, layer) {
    var connections = [];
    if (!prop) return connections;

    try {
      // Detect expressions
      if (prop.expressionEnabled && prop.expression) {
        connections.push({
          type: "property",
          propertyName: prop.name,
          expression: prop.expression,
          parsed: parseExpression(prop.expression),
        });
      }

      // Recursively check nested properties
      if (prop.numProperties) {
        for (var i = 1; i <= prop.numProperties; i++) {
          connections = connections.concat(
            analyzeProperty(prop.property(i), layer)
          );
        }
      }
    } catch (e) {
      // Some properties may be inaccessible — that's expected
    }

    return connections;
  }

  // ========================================
  // EXPRESSION PARSING
  // ========================================

  /**
   * Parses an expression and extracts all references
   * @param {string} expr - Expression code
   * @returns {Object} Structure with references
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

      // Look for comp().layer()
      PATTERNS.compLayer.lastIndex = 0;
      while ((match = PATTERNS.compLayer.exec(expr)) !== null) {
        if (!Utils.arrayContains(result.compositions, match[1])) {
          result.compositions.push(match[1]);
        }
        if (!Utils.arrayContains(result.layers, match[2])) {
          result.layers.push(match[2]);
        }
      }

      // Look for layer()
      PATTERNS.layer.lastIndex = 0;
      while ((match = PATTERNS.layer.exec(expr)) !== null) {
        if (!Utils.arrayContains(result.layers, match[1])) {
          result.layers.push(match[1]);
        }
      }

      // Look for effect()
      PATTERNS.effect.lastIndex = 0;
      while ((match = PATTERNS.effect.exec(expr)) !== null) {
        if (!Utils.arrayContains(result.effects, match[1])) {
          result.effects.push(match[1]);
        }
      }

      // Look for .effect()("parameter")
      PATTERNS.effectParam.lastIndex = 0;
      while ((match = PATTERNS.effectParam.exec(expr)) !== null) {
        result.effectParameters.push({
          effect: match[1],
          parameter: match[2],
        });
      }
    } catch (e) {
      Utils.log("Error parsing expression: " + e.toString(), "WARN");
    }

    return result;
  }

  // ========================================
  // PRECOMPOSITION DISCOVERY
  // ========================================

  /**
   * Finds all precompositions within a composition
   * @param {CompItem} comp - Composition
   * @returns {Array} Array of precompositions
   */
  function findPrecomps(comp) {
    Utils.log("Searching for precompositions in: " + comp.name);
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
            "  Found precomposition: " + layer.name + " -> " + layer.source.name
          );
        }
      }
    } catch (e) {
      Utils.log("Error searching precompositions: " + e.toString(), "ERROR");
    }

    return precomps;
  }

  // ========================================
  // EFFECT PARAMETER ANALYSIS
  // ========================================

  /**
   * Provides a detailed analysis of effect parameters on a layer
   * @param {Layer} layer - Layer to analyze
   * @returns {Array} Array of effect parameters
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

            // Determine the parameter type
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
            // Some parameters might be unavailable
          }
        }

        effectParams.push({
          effectName: effect.name,
          matchName: effect.matchName,
          parameters: params,
        });
      }
    } catch (e) {
      Utils.log("Error analyzing effect parameters: " + e.toString(), "WARN");
    }

    return effectParams;
  }

  // ========================================
  // REPORT GENERATION
  // ========================================

  /**
   * Builds a detailed report about connections
   * @param {CompItem} comp - Composition
   * @returns {Object} Structured report
   */
  function generateConnectionReport(comp) {
    Utils.log("\n=== DETAILED CONNECTION REPORT ===");

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

      // Output the report
      Utils.log("Composition: " + report.composition);
      Utils.log("Layers with connections: " + report.layers.length);
      Utils.log("Total connections: " + report.totalConnections);

      for (var i = 0; i < report.layers.length; i++) {
        var lr = report.layers[i];
        Utils.log("\n  [" + lr.index + "] " + lr.name);

        for (var j = 0; j < lr.expressions.length; j++) {
          var expr = lr.expressions[j];
          Utils.log("    Expression: " + expr.propertyName);
          if (expr.parsed.layers.length > 0) {
            Utils.log("      → Layers: " + expr.parsed.layers.join(", "));
          }
          if (expr.parsed.effects.length > 0) {
            Utils.log("      → Effects: " + expr.parsed.effects.join(", "));
          }
        }
      }
    } catch (e) {
      Utils.log("Error generating report: " + e.toString(), "ERROR");
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
