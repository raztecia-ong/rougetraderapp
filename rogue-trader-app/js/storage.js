// ============================================================
// storage.js — save and load character data
// ============================================================

const STORAGE_KEY = "rt_character";

function saveCharacter(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Failed to save character:", e);
    return false;
  }
}

function loadCharacter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load character:", e);
    return null;
  }
}

function clearCharacter() {
  localStorage.removeItem(STORAGE_KEY);
}

function exportCharacter(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.name || "character"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCharacter(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      callback(null, data);
    } catch (err) {
      callback("Invalid character file.");
    }
  };
  reader.readAsText(file);
}
