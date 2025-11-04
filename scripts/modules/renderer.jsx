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
    Utils.log("--- Setting up render ---");

    // Validation
    if (!comp) {
      Utils.log("Composition not provided", "ERROR");
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
      Utils.log("  Composition: " + comp.name);
      Utils.log("  Size: " + comp.width + "x" + comp.height);
      Utils.log("  FPS: " + comp.frameRate);
      Utils.log("  Duration: " + comp.duration.toFixed(2) + "s");
      Utils.log("  Output: " + om.file.fsName);
      Utils.log("  ✓ Render setup successful");

      return {
        renderItem: renderItem,
        outputPath: outputFile,
        ready: true,
      };
    } catch (e) {
      Utils.log("Error setting up render: " + e.toString(), "ERROR");
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
        Utils.log("  Applied template: " + templates[i]);
        return;
      } catch (e) {
        // Try the next template
      }
    }

    Utils.log("  Template not found, using default settings", "WARN");
  }

  // ========================================
  // RENDER EXECUTION
  // ========================================

  /**
   * Starts rendering the entire queue
   * @returns {boolean} Whether rendering succeeded
   */
  function startRender() {
    Utils.log("\n=== STARTING RENDER ===");

    // Ensure there are items
    if (renderQueue.numItems === 0) {
      Utils.log("Render queue is empty", "ERROR");
      return false;
    }

    Utils.log("Items in queue: " + renderQueue.numItems);

    try {
      // Check the status of each item
      for (var i = 1; i <= renderQueue.numItems; i++) {
        var item = renderQueue.item(i);
        Utils.log("  Item " + i + ": " + item.comp.name);

        // Ensure the item is ready
        if (item.status !== RQItemStatus.QUEUED) {
          item.render = true;
        }
      }

      Utils.log("\nStarting render (this may take a while)...\n");

      // START THE RENDER
      renderQueue.render();

      Utils.log("\n✓✓✓ RENDER COMPLETE ✓✓✓");

      // Verify the generated files
      var createdFiles = checkRenderedFiles();
      if (createdFiles.length > 0) {
        Utils.log("\nCreated files: " + createdFiles.length);
        for (var i = 0; i < createdFiles.length; i++) {
          var fileInfo = createdFiles[i];
          Utils.log("  ✓ " + fileInfo.name + " (" + fileInfo.sizeMB + " MB)");
        }
      }

      return true;
    } catch (e) {
      Utils.log("RENDER ERROR: " + e.toString(), "ERROR");
      if (e.line) {
        Utils.log("  Line: " + e.line, "ERROR");
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
      Utils.log("Error checking files: " + e.toString(), "WARN");
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
    Utils.log("Exporting frame from: " + comp.name);

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
        Utils.log("  PNG template not found", "WARN");
      }

      om.file = pngPath;
      renderItem.render = true;

      Utils.log("  Frame output: " + om.file.fsName);
      return renderItem;
    } catch (e) {
      Utils.log("Error exporting frame: " + e.toString(), "ERROR");
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
        Utils.log("Render queue cleared (" + count + " items)");
      }
    } catch (e) {
      Utils.log("Error clearing queue: " + e.toString(), "ERROR");
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
        throw new Error("Failed to create output folder");
      }
      Utils.log("Created folder: " + outputFolder.fsName);
    }

    // Generate a safe filename
    var timestamp = Utils.getFileTimestamp();
    var safeName = comp.name.replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = safeName + "_" + timestamp + (ext || "");

    var filePath = Folder.decode(outputFolder.fsName + "/" + fileName);

    Utils.log("  Output path: " + filePath);

    return new File(filePath);
  }

  return {
    setupRender: setupRender,
    startRender: startRender,
    clearRenderQueue: clearRenderQueue,
    exportFrame: exportFrame,
  };
})();
