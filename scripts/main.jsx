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
    Utils.log("\n┌─ STEP 1: Finding compositions ────────┐");

    var renderComp = Utils.getComp(CONFIG.RENDER_COMP);
    var customizeComp = Utils.getComp(CONFIG.CUSTOMIZE_COMP);

    // Validation
    if (!renderComp) {
      throw new Error("Composition not found: " + CONFIG.RENDER_COMP);
    }
    if (!customizeComp) {
      throw new Error("Composition not found: " + CONFIG.CUSTOMIZE_COMP);
    }

    Utils.log("  ✓ Found: " + renderComp.name);
    Utils.log("  ✓ Found: " + customizeComp.name);
    Utils.log("└────────────────────────────────────────┘");

    // ========================================
    // STEP 2: CONNECTION ANALYSIS
    // ========================================
    Utils.log("\n┌─ STEP 2: Analyzing connections ───────┐");

    // Basic analysis
    var connections = Analyzer.analyzeComposition(renderComp);
    Utils.log("  Found layers with connections: " + connections.length);

    // Precomposition search
    var precomps = Analyzer.findPrecomps(customizeComp);
    Utils.log("  Found precompositions: " + precomps.length);

    // Output details
    for (var i = 0; i < precomps.length; i++) {
      Utils.log(
        "    • " + precomps[i].layerName + " → " + precomps[i].compName
      );
    }

    // Detailed report
    Utils.log("\n  📊 Detailed report:");
    var detailedReport = Analyzer.generateConnectionReport(renderComp);

    // Effect parameter analysis
    Utils.log("\n  🔍 Effect parameters in Customize Scene:");
    for (var i = 1; i <= customizeComp.numLayers; i++) {
      var layer = customizeComp.layer(i);
      var effectParams = Analyzer.analyzeEffectParameters(layer);

      if (effectParams.length > 0) {
        Utils.log("\n    Layer: " + layer.name);
        for (var j = 0; j < effectParams.length; j++) {
          var eff = effectParams[j];
          Utils.log("      Effect: " + eff.effectName);

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
    Utils.log("\n┌─ STEP 3: Modifying content ───────────┐");

    // START THE UNDO GROUP (only before modification)
    app.beginUndoGroup("AE Automation");
    undoGroupStarted = true; // Set the flag

    Utils.log("  🔄 Undo Group started");

    // 3.1 Text replacement
    Utils.log("\n  📝 Replacing text...");
    var textChanged = Modifier.replaceAllText(customizeComp, "Changed");
    Utils.log("  ✓ Changed text layers: " + textChanged);

    // 3.2 Video replacement
    Utils.log("\n  🎬 Replacing videos...");
    var videosReplaced = Modifier.replaceVideosInPrecomps(precomps);
    Utils.log("  ✓ Replaced videos: " + videosReplaced);

    // 3.3 Additional modifications (optional)
    Utils.log("\n  🎨 Additional features:");
    Utils.log("    • Change colors (changeLayerLabelColor)");
    Utils.log("    • Change positions (changeLayerPosition)");
    Utils.log("    • Change effects (changeEffectParameter)");
    Utils.log("    • Modify animation (modifyAnimation)");
    Utils.log("    • Change timing (changeLayerTiming)");
    Utils.log("    See examples in docs/EXAMPLES.md");

    Utils.log("\n└────────────────────────────────────────┘");

    // ========================================
    // STEP 4: RENDER
    // ========================================
    Utils.log("\n┌─ STEP 4: Rendering ───────────────────┐");

    // Clear the queue
    Renderer.clearRenderQueue();

    // Configure the render
    var renderSetup = Renderer.setupRender(renderComp);

    if (!renderSetup.ready) {
      throw new Error("Failed to setup render: " + renderSetup.error);
    }

    // Start the render
    var renderSuccess = Renderer.startRender();

    if (!renderSuccess) {
      throw new Error("Render failed");
    }

    Utils.log("└────────────────────────────────────────┘");

    // CLOSE THE UNDO GROUP (only if it was opened)
    if (undoGroupStarted) {
      app.endUndoGroup();
      undoGroupStarted = false;
      Utils.log("  🔄 Undo Group completed");
    }

    // ========================================
    // FINALIZATION
    // ========================================
    var endTime = new Date();
    var duration = (endTime.getTime() - startTime.getTime()) / 1000;

    Utils.log("\n╔════════════════════════════════════════╗");
    Utils.log("║       COMPLETED SUCCESSFULLY ✓✓✓       ║");
    Utils.log("╚════════════════════════════════════════╝");
    Utils.log("⏱  Execution time: " + duration.toFixed(2) + " sec");
    Utils.log("📁 Results in folder: output/");
    Utils.log("📄 Logs in folder: logs/");

    // Save logs
    Utils.saveLogs();

    // Final notification
    alert(
      "✓ Script completed successfully!\n\n" +
        "⏱  Time: " +
        duration.toFixed(2) +
        " sec\n" +
        "📁 Check output/ folder\n" +
        "📄 Logs in logs/ folder"
    );
  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================

    // IMPORTANT: close the undo group ONLY if it was opened
    if (undoGroupStarted) {
      try {
        app.endUndoGroup();
        Utils.log("  🔄 Undo Group closed due to error", "WARN");
      } catch (undoError) {
        // Ignore undo group closure errors
        Utils.log(
          "  ⚠ Error closing Undo Group: " + undoError.toString(),
          "WARN"
        );
      }
    }

    Utils.log("\n╔════════════════════════════════════════╗", "ERROR");
    Utils.log("║        CRITICAL ERROR ✗✗✗              ║", "ERROR");
    Utils.log("╚════════════════════════════════════════╝", "ERROR");
    Utils.log("❌ Error: " + error.toString(), "ERROR");

    if (error.line) {
      Utils.log("📍 Line: " + error.line, "ERROR");
    }

    // Output stack trace if present
    if (error.stack) {
      Utils.log("\nStack trace:", "ERROR");
      Utils.log(error.stack, "ERROR");
    }

    Utils.saveLogs();

    alert(
      "❌ ERROR!\n\n" +
        error.toString() +
        "\n\n" +
        "Check log file in logs/ folder for details."
    );
  }
}

// ========================================
// EXECUTION
// ========================================

// Environment check
if (typeof app === "undefined") {
  alert("❌ This script must be run in Adobe After Effects!");
} else {
  main();
}
