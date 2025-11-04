// ============================================
// UTILS MODULE - Utilities and configuration
// ============================================
// Contains:
// - Global configuration (CONFIG)
// - Logging functions
// - Helper functions for the AE API
// ============================================

// ============================================
// PROJECT CONFIGURATION
// ============================================
var CONFIG = {
  // Paths relative to the project file
  OUTPUT_FOLDER: "/output",
  VIDEO_FOLDER: "/Footage/Material",
  LOG_FOLDER: "/logs",

  // Key composition names
  RENDER_COMP: "Render",
  CUSTOMIZE_COMP: "Customize Scene",

  // Render settings
  RENDER_FORMAT: ".avi",

  // Logging options
  LOG_TO_FILE: true,
  LOG_TO_CONSOLE: true,
};

var Utils = (function () {
  var logFile = null;
  var logBuffer = [];

  // ========================================
  // FORMATTING HELPERS
  // ========================================

  /**
   * Adds leading zeros to a number
   * @param {number} num - Number to format
   * @param {number} size - Desired string length
   * @returns {string} Formatted string
   */
  function pad(num, size) {
    size = size || 2;
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  /**
   * Creates a timestamp for logs (ISO format)
   * @returns {string} YYYY-MM-DDTHH:MM:SS
   */
  function getTimestamp() {
    var now = new Date();
    return (
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1, 2) +
      "-" +
      pad(now.getDate(), 2) +
      "T" +
      pad(now.getHours(), 2) +
      ":" +
      pad(now.getMinutes(), 2) +
      ":" +
      pad(now.getSeconds(), 2)
    );
  }

  /**
   * Creates a timestamp for filenames (no special characters)
   * @returns {string} YYYYMMDD_HHMMSS
   */
  function getFileTimestamp() {
    var now = new Date();
    return (
      now.getFullYear() +
      pad(now.getMonth() + 1, 2) +
      pad(now.getDate(), 2) +
      "_" +
      pad(now.getHours(), 2) +
      pad(now.getMinutes(), 2) +
      pad(now.getSeconds(), 2)
    );
  }

  // ========================================
  // LOGGING SYSTEM
  // ========================================

  /**
   * Initializes the log file
   * @returns {boolean} Whether initialization succeeded
   */
  function initLog() {
    if (!CONFIG.LOG_TO_FILE) {
      log("File logging is disabled");
      return false;
    }

    try {
      var projectFile = app.project.file;
      var logFolderPath;

      if (!projectFile) {
        logFolderPath = Folder.desktop.fsName + CONFIG.LOG_FOLDER;
        log("Project not saved, logs will be on desktop", "WARN");
      } else {
        logFolderPath = projectFile.path + CONFIG.LOG_FOLDER;
      }

      var logFolder = ensureFolder(logFolderPath);
      var timestamp = getFileTimestamp();
      var logFileName = "script_log_" + timestamp + ".txt";
      logFile = new File(logFolder.fsName + "/" + logFileName);

      logFile.encoding = "UTF-8";
      if (logFile.open("w")) {
        logFile.writeln("===========================================");
        logFile.writeln("  After Effects Automation Script Log");
        logFile.writeln("===========================================");
        logFile.writeln("Started: " + new Date().toString());
        logFile.writeln("===========================================\n");
        logFile.close();

        log("Log file created: " + logFile.fsName);
        return true;
      }

      log("Failed to open log file", "ERROR");
      return false;
    } catch (e) {
      log("Error initializing log: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Logs a message to the console and file
   * @param {string} message - Message to log
   * @param {string} type - Type: INFO, WARN, ERROR
   * @returns {string} Formatted message
   */
  function log(message, type) {
    type = type || "INFO";
    var timestamp = getTimestamp();
    var logMessage = "[" + timestamp + "] [" + type + "] " + message;

    // Console output
    if (CONFIG.LOG_TO_CONSOLE) {
      $.writeln(logMessage);
    }

    // Store in buffer
    logBuffer.push(logMessage);

    // Write to file
    if (CONFIG.LOG_TO_FILE && logFile && logFile.exists) {
      try {
        if (logFile.open("a")) {
          logFile.writeln(logMessage);
          logFile.close();
        }
      } catch (e) {
        // Ignore write errors to avoid infinite loops
      }
    }

    return logMessage;
  }

  /**
   * Saves the final logs when finishing execution
   * @returns {boolean} Whether saving succeeded
   */
  function saveLogs() {
    if (!logFile || !logFile.exists) return false;

    try {
      if (logFile.open("a")) {
        logFile.writeln("\n===========================================");
        logFile.writeln("Session ended: " + new Date().toString());
        logFile.writeln("Total log entries: " + logBuffer.length);
        logFile.writeln("===========================================");
        logFile.close();

        $.writeln(">>> Logs saved to: " + logFile.fsName);
        return true;
      }
    } catch (e) {
      $.writeln("Error saving logs: " + e.toString());
      return false;
    }
  }

  // ========================================
  // PROJECT HELPERS
  // ========================================

  /**
   * Verifies that the project is open and saved
   * @returns {boolean} Whether the project is valid
   */
  function checkProject() {
    if (!app.project) {
      log("Project is not open!", "ERROR");
      alert("Error: project is not open!");
      return false;
    }

    if (!app.project.file) {
      log("Project is not saved to disk", "ERROR");
      alert(
        "Please save the project before running the script!\n\n" +
          "The script uses the project file path to find videos and create output."
      );
      return false;
    }

    log("Project: " + app.project.file.fsName);
    return true;
  }

  /**
   * Finds a composition by name
   * @param {string} compName - Composition name
   * @returns {CompItem|null} The composition or null
   */
  function getComp(compName) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === compName) {
        return item;
      }
    }
    return null;
  }

  /**
   * Finds a layer by name inside a composition
   * @param {CompItem} comp - Composition
   * @param {string} layerName - Layer name
   * @returns {Layer|null} Layer or null
   */
  function findLayer(comp, layerName) {
    try {
      return comp.layer(layerName);
    } catch (e) {
      return null;
    }
  }

  /**
   * Retrieves an effect by name
   * @param {Layer} layer - Layer
   * @param {string} effectName - Effect name
   * @returns {Property|null} Effect or null
   */
  function getEffect(layer, effectName) {
    try {
      var effects = layer.property("Effects");
      if (!effects) return null;

      for (var i = 1; i <= effects.numProperties; i++) {
        var effect = effects.property(i);
        if (effect.name === effectName) {
          return effect;
        }
      }
      return null;
    } catch (e) {
      log("Error getting effect: " + e.toString(), "ERROR");
      return null;
    }
  }

  // ========================================
  // FILE SYSTEM
  // ========================================

  /**
   * Creates a folder if it does not exist
   * @param {string} folderPath - Folder path
   * @returns {Folder} Folder object
   */
  function ensureFolder(folderPath) {
    var folder = new Folder(folderPath);
    if (!folder.exists) {
      if (folder.create()) {
        log("Created folder: " + folderPath);
      } else {
        log("Failed to create folder: " + folderPath, "ERROR");
      }
    }
    return folder;
  }

  // ========================================
  // ADDITIONAL UTILITIES
  // ========================================

  /**
   * Checks whether a value exists in an array
   * @param {Array} arr - Array to search
   * @param {*} val - Value to find
   * @returns {boolean}
   */
  function arrayContains(arr, val) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) return true;
    }
    return false;
  }

  return {
    // Logging
    log: log,
    initLog: initLog,
    saveLogs: saveLogs,

    // Project helpers
    checkProject: checkProject,
    getComp: getComp,
    findLayer: findLayer,
    getEffect: getEffect,

    // File system
    ensureFolder: ensureFolder,

    // Utilities
    arrayContains: arrayContains,
    getTimestamp: getTimestamp,
    getFileTimestamp: getFileTimestamp,
  };
})();
