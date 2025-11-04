# After Effects Automation Script

Automate After Effects: analyze compositions, replace text/videos, and render automatically.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Configuration

```bash
# Copy config template
npm run setup
```

This creates `config.json` from `config.example.json`.

### 3. Edit `config.json`

```json
{
  "paths": {
    "afterEffects": "C:\\Program Files\\Adobe\\Adobe After Effects 2024\\Support Files\\AfterFX.com",
    "project": "C:/path/to/your/project.aep",
    "startup": "C:/path/to/this/folder/startup.jsx",
    "mainScript": "C:/path/to/this/folder/scripts/main.jsx"
  },
  "logging": {
    "nodeLogFile": "logs/node_run.log"
  }
}
```

**Update these paths:**
- `afterEffects` - Path to AfterFX.com executable
- `project` - Your .aep project file
- `startup` - Path to startup.jsx (in this folder)
- `mainScript` - Path to scripts/main.jsx (in this folder)

### 4. Prepare Your Project

Your AE project needs:
- A composition named **"Render"** (for final output)
- A composition named **"Customize Scene"** (to modify)
- Videos in folder: `[Project Folder]/Footage/Material/Video 1.mp4`, `Video 2.mp4`, etc.

### 5. Run

```bash
npm start
```

---

## 📁 File Structure

```
your-project/
├── config.json              ← Your settings (create from example)
├── config.example.json      ← Template
├── package.json
├── run-ae.js               ← Launcher
├── scripts/
│   ├── startup.jsx             ← AE startup
│   ├── config.jsx          ← Script settings
│   ├── main.jsx            ← Main automation
│   └── modules/
│       ├── analyzer.jsx
│       ├── modifier.jsx
│       ├── renderer.jsx
│       └── utils.jsx
├── output/                  ← Rendered files (auto-created)
└── logs/                    ← Log files (auto-created)
```

---

## ⚙️ Configuration Options

### `scripts/config.jsx`

Change these if needed:

```javascript
var CONFIG = {
  OUTPUT_FOLDER: "/output",           // Where to save renders
  VIDEO_FOLDER: "/Footage/Material",  // Where to find videos
  LOG_FOLDER: "/logs",                // Where to save logs

  RENDER_COMP: "Render",              // Name of render composition
  CUSTOMIZE_COMP: "Customize Scene",  // Name of composition to modify

  RENDER_FORMAT: ".avi",              // Output format
};
```

---

## 🎯 What It Does

1. ✅ Opens your After Effects project
2. ✅ Finds compositions "Render" and "Customize Scene"
3. ✅ Analyzes layer connections
4. ✅ Replaces all text with "Changed"
5. ✅ Replaces videos in precompositions
6. ✅ Renders "Render" composition to `output/` folder
7. ✅ Saves logs to `logs/` folder

---

## ❌ Common Issues

### "config.json not found"
Run `npm run setup`, then edit `config.json`

### "After Effects not found"
Check `afterEffects` path in `config.json`. Common locations:
- **Windows**: `C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\AfterFX.com`
- **Mac**: `/Applications/Adobe After Effects 2024/Adobe After Effects 2024.app/Contents/MacOS/After Effects`

### "Project not saved"
Save your .aep file first, then update `project` path in `config.json`

### "Video folder not found"
Create folder structure: `[Your Project Folder]/Footage/Material/`
Add videos: `Video 1.mp4`, `Video 2.mp4`, etc.

### "Composition not found"
Rename your compositions to:
- "Render"
- "Customize Scene"

Or change names in `scripts/config.jsx`

---

## 📝 Logs

Check logs if something goes wrong:
- Node.js logs: `logs/node_run.log`
- Script logs: `logs/script_log_[timestamp].txt`

---

## 🔧 Customize

To change what the script does, edit `scripts/main.jsx` in **STEP 3: Modifying content** section.

Example - change text to something else:

```javascript
// Change this line:
var textChanged = Modifier.replaceAllText(customizeComp, "Changed");

// To this:
var textChanged = Modifier.replaceAllText(customizeComp, "My Custom Text");
```

---

## **Bonus: Quick Setup Checklist**

Create `SETUP_CHECKLIST.md`:

```markdown
# Setup Checklist

## ☑️ Before First Run

- [ ] Run `npm install`
- [ ] Run `npm run setup`
- [ ] Open `config.json`
- [ ] Set `afterEffects` path (where AfterFX.com is located)
- [ ] Set `project` path (your .aep file)
- [ ] Set `startup` path (this folder's startup.jsx)
- [ ] Set `mainScript` path (this folder's scripts/main.jsx)
- [ ] Save `config.json`

## ☑️ Project Setup

- [ ] Open your AE project
- [ ] Rename/create composition: "Render"
- [ ] Rename/create composition: "Customize Scene"
- [ ] Create folder: `[Project Folder]/Footage/Material/`
- [ ] Add videos: `Video 1.mp4`, `Video 2.mp4`, etc.
- [ ] Save project

## ☑️ Run

- [ ] Run `npm start`
- [ ] Check `output/` folder for rendered video
- [ ] Check `logs/` folder if errors occur

## ✅ Done!