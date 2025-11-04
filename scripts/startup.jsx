// ============================================
// STARTUP SCRIPT - Configuration-based
// ============================================

(function () {
  // ========================================
  // LOAD CONFIGURATION
  // ========================================
  function loadConfig() {
    // Try to find config.json in script's directory
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;
    var configFile = new File(scriptFolder.fsName + "/../config.json");

    if (!configFile.exists) {
      alert(
        "❌ ERROR: config.json not found!\n\n" +
          "Expected location: " +
          configFile.fsName +
          "\n\n" +
          "Please copy config.example.json to config.json and configure your paths."
      );
      return null;
    }

    try {
      configFile.encoding = "UTF-8";
      if (!configFile.open("r")) {
        alert("❌ ERROR: Cannot open config.json");
        return null;
      }

      var content = configFile.read();
      configFile.close();

      var config = eval("(" + content + ")"); // Simple JSON parse for ExtendScript
      return config;
    } catch (e) {
      alert("❌ ERROR: Failed to parse config.json\n\n" + e.toString());
      return null;
    }
  }

  // ========================================
  // MAIN EXECUTION
  // ========================================
  var config = loadConfig();
  if (!config) return;

  var proj = config.paths.project;
  var main = config.paths.mainScript;

  // Validate project file
  var f = new File(proj);
  if (!f.exists) {
    alert(
      "❌ Project file not found!\n\n" +
        "Path from config: " +
        proj +
        "\n\n" +
        "Please update config.json with correct path."
    );
    f = File.openDialog("Select AEP project file", "*.aep");
    if (!f) {
      alert("Project not selected. Aborting.");
      return;
    }
  }

  // Open project
  try {
    app.open(f);
    $.sleep(800);
  } catch (e) {
    alert("❌ ERROR: Failed to open project\n\n" + e.toString());
    return;
  }

  // Validate main script
  var ms = new File(main);
  if (!ms.exists) {
    alert(
      "❌ Main script not found!\n\n" +
        "Path from config: " +
        main +
        "\n\n" +
        "Please update config.json with correct path."
    );
    ms = File.openDialog("Select main.jsx", "*.jsx");
    if (!ms) {
      alert("main.jsx not selected. Aborting.");
      return;
    }
  }

  // Execute main script
  try {
    $.evalFile(ms);
  } catch (e) {
    alert("❌ ERROR: Failed to execute main script\n\n" + e.toString());
  }
})();
