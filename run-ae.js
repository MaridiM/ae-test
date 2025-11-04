import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Пути
const aePath = `E:\\Program Files\\Adobe\\Adobe After Effects 2025\\Support Files\\AfterFX.com`;
const jsxPath = `G:\\Job\\test\\ТЗ\\TZ Collect\\startup.jsx`;
const logPath = path.join(path.dirname(jsxPath), "node_run.log");

// Функция запуска
function runAfterEffects() {
  console.log("=== Запуск After Effects ===");
  const args = ["-r", jsxPath];

  const proc = spawn(aePath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false,
  });

  // Потоки AE часто в CP1251 → конвертируем в UTF-8
  const decoder = new TextDecoder("windows-1251");

  const writeLog = (data, type = "OUT") => {
    const text = decoder.decode(data);
    const line = `[${type}] ${text}`;
    process.stdout.write(line);
    fs.appendFileSync(logPath, line);
  };

  proc.stdout.on("data", (d) => writeLog(d, "OUT"));
  proc.stderr.on("data", (d) => writeLog(d, "ERR"));

  proc.on("close", (code) => {
    console.log(`\n=== AE завершил работу (код ${code}) ===`);
  });
}

// Точка входа
try {
  fs.writeFileSync(logPath, "=== Новый запуск ===\n", "utf8");
  runAfterEffects();
} catch (err) {
  console.error("Ошибка запуска:", err);
}
