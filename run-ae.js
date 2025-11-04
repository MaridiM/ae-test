import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// LOAD CONFIGURATION
// ========================================
function loadConfig() {
  const configPath = path.join(__dirname, "config.json");

  if (!fs.existsSync(configPath)) {
    console.error("❌ ERROR: config.json not found!");
    console.error(
      "📝 Please copy config.example.json to config.json and configure your paths."
    );
    process.exit(1);
  }

  try {
    const configData = fs.readFileSync(configPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("❌ ERROR: Failed to parse config.json:", error.message);
    process.exit(1);
  }
}

const config = loadConfig();

// Extract paths from config
const aePath = config.paths.afterEffects;
const jsxPath = config.paths.startup;
const logPath = path.join(__dirname, config.logging.nodeLogFile);

// ========================================
// VALIDATE PATHS
// ========================================
function validatePaths() {
  const errors = [];

  if (!fs.existsSync(aePath)) {
    errors.push(`After Effects not found: ${aePath}`);
  }

  if (!fs.existsSync(jsxPath)) {
    errors.push(`Startup script not found: ${jsxPath}`);
  }

  if (errors.length > 0) {
    console.error("❌ PATH VALIDATION ERRORS:");
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error("\n📝 Please check your config.json file.");
    process.exit(1);
  }

  console.log("✓ All paths validated successfully");
}

// ========================================
// LAUNCH FUNCTION
// ========================================
function runAfterEffects() {
  console.log("=== Launching After Effects ===");
  console.log(`AE Path: ${aePath}`);
  console.log(`Script: ${jsxPath}`);

  const args = ["-r", jsxPath];

  const proc = spawn(aePath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false,
  });

  // AE streams are often in CP1251, so convert to UTF-8
  const decoder = new TextDecoder("windows-1251");

  const writeLog = (data, type = "OUT") => {
    const text = decoder.decode(data);
    const line = `[${type}] ${text}`;
    process.stdout.write(line);

    // Ensure log directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(logPath, line);
  };

  proc.stdout.on("data", (d) => writeLog(d, "OUT"));
  proc.stderr.on("data", (d) => writeLog(d, "ERR"));

  proc.on("close", (code) => {
    console.log(`\n=== AE finished with code ${code} ===`);
  });

  proc.on("error", (err) => {
    console.error("❌ Failed to start After Effects:", err.message);
  });
}

// ========================================
// ENTRY POINT
// ========================================
try {
  // Ensure log directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.writeFileSync(logPath, "=== New launch ===\n", "utf8");

  validatePaths();
  runAfterEffects();
} catch (err) {
  console.error("❌ Launch error:", err);
  process.exit(1);
}
