// ============================================================
// app.js — main application logic
// ============================================================

// --- State ---------------------------------------------------

let character = null;

function initCharacter() {
  // Deep clone default, then populate skill entries
  character = JSON.parse(JSON.stringify(DEFAULT_CHARACTER));
  RT_SKILLS.forEach(skill => {
    if (!(skill.name in character.skills)) {
      character.skills[skill.name] = 0; // 0 = untrained
    }
  });
}

function boot() {
  const saved = loadCharacter();
  if (saved) {
    character = saved;
    // Ensure any new skills added to data.js are present
    RT_SKILLS.forEach(skill => {
      if (!(skill.name in character.skills)) character.skills[skill.name] = 0;
    });
  } else {
    initCharacter();
  }
  renderAll();
  navigate("sheet");
}

// --- Navigation ----------------------------------------------

function navigate(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  document.querySelector(`.nav-btn[data-tab="${tab}"]`).classList.add("active");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (btn) navigate(btn.dataset.tab);
});

// --- Render --------------------------------------------------

function renderAll() {
  renderHeader();
  renderStats();
  renderSkills();
  renderVitals();
  renderTalents();
  renderEquipment();
}

function renderHeader() {
  document.getElementById("char-name").textContent = character.name;
  document.getElementById("char-role").textContent = `${character.role}${character.homeworld ? " · " + character.homeworld : ""}`;
}

function renderStats() {
  const grid = document.getElementById("stats-grid");
  grid.innerHTML = "";
  RT_STATS.forEach(stat => {
    const val = character.stats[stat.abbr] ?? "—";
    const div = document.createElement("div");
    div.className = "stat-box";
    div.innerHTML = `
      <span class="stat-val">${val}</span>
      <span class="stat-abbr">${stat.abbr}</span>
    `;
    div.title = stat.name;
    div.addEventListener("click", () => openStatModal(stat));
    grid.appendChild(div);
  });
}

function renderSkills() {
  const list = document.getElementById("skills-list");
  list.innerHTML = "";
  RT_SKILLS.forEach(skill => {
    const level = character.skills[skill.name] || 0;
    const statVal = character.stats[skill.stat] ?? 0;
    const bonus = level >= 3 ? (level - 2) * 10 : 0;
    const total = level === 1 ? Math.floor(statVal / 2) : statVal + bonus;
    const item = document.createElement("div");
    item.className = "skill-item";
    item.innerHTML = `
      <div class="skill-info">
        <span class="skill-name">${skill.name}</span>
        <span class="skill-stat">${skill.stat}</span>
      </div>
      <div class="skill-right">
        <span class="skill-total ${level > 0 ? "trained" : "untrained"}">${level > 0 ? total : "—"}</span>
        <span class="skill-level">${skillLevelLabel(level)}</span>
      </div>
    `;
    item.addEventListener("click", () => openSkillModal(skill, level, total));
    list.appendChild(item);
  });
}

function skillLevelLabel(level) {
  return ["", "Basic", "Trained", "+10", "+20"][level] || "";
}

function renderVitals() {
  const v = character.vitals;

  renderTracker("hp", v.hp.current, v.hp.max);
  renderTracker("wounds", v.wounds.current, v.wounds.max);
  renderTracker("corruption", v.corruption.current, v.corruption.max);
  renderTracker("insanity", v.insanity.current, v.insanity.max);
  renderTracker("fate", v.fate.current, v.fate.max);

  document.getElementById("xp-earned").textContent = v.xp.earned;
  document.getElementById("xp-spent").textContent = v.xp.spent;
  document.getElementById("xp-remaining").textContent = v.xp.earned - v.xp.spent;
}

function renderTracker(key, current, max) {
  const cur = document.getElementById(`${key}-current`);
  const maxEl = document.getElementById(`${key}-max`);
  const bar = document.getElementById(`${key}-bar`);
  if (cur) cur.textContent = current;
  if (maxEl) maxEl.textContent = max;
  if (bar) bar.style.width = `${Math.min(100, Math.round((current / max) * 100))}%`;
}

// --- Vitals controls -----------------------------------------

function adjustVital(key, subkey, delta) {
  const v = character.vitals[key];
  if (subkey === 'max') {
    v.max = Math.max(1, (v.max ?? 1) + delta);
    v.current = Math.min(v.current, v.max);
  } else {
    v[subkey] = Math.max(0, Math.min(v.max ?? 999, v[subkey] + delta));
  }
  renderVitals();
  saveCharacter(character);
}

function adjustXP(key, delta) {
  character.vitals.xp[key] = Math.max(0, character.vitals.xp[key] + delta);
  renderVitals();
  saveCharacter(character);
}

// Expose to HTML buttons
window.adjustVital = adjustVital;
window.adjustXP = adjustXP;

// --- Modals --------------------------------------------------

function openSkillModal(skill, level, total) {
  const statVal = character.stats[skill.stat] ?? 0;
  document.getElementById("modal-title").textContent = skill.name;
  document.getElementById("modal-body").innerHTML = `
    <p class="modal-desc">${skill.desc}</p>
    <div class="modal-stats">
      <div class="modal-stat-row">
        <span>Governing stat</span><strong>${skill.stat} (${statVal})</strong>
      </div>
      <div class="modal-stat-row">
        <span>Training level</span><strong>${skillLevelLabel(level) || "Untrained"}</strong>
      </div>
      ${level > 0 ? `<div class="modal-stat-row"><span>Roll target</span><strong>${total}</strong></div>` : ""}
    </div>
    <div class="modal-level-btns">
      <span class="modal-label">Change level:</span>
      ${[0,1,2,3,4].map(l => `
        <button class="level-btn ${level === l ? "active" : ""}" onclick="setSkillLevel('${skill.name}', ${l})">
          ${skillLevelLabel(l) || "None"}
        </button>
      `).join("")}
    </div>
  `;
  document.getElementById("modal-overlay").classList.add("visible");
}

function openStatModal(stat) {
  const val = character.stats[stat.abbr] ?? 0;
  document.getElementById("modal-title").textContent = stat.name;
  document.getElementById("modal-body").innerHTML = `
    <p class="modal-desc">${stat.desc}</p>
    <div class="modal-stats">
      <div class="modal-stat-row">
        <span>Current value</span><strong>${val}</strong>
      </div>
    </div>
    <div class="modal-edit-row">
      <button onclick="adjustStat('${stat.abbr}', -5)">−5</button>
      <button onclick="adjustStat('${stat.abbr}', -1)">−1</button>
      <span id="stat-edit-val">${val}</span>
      <button onclick="adjustStat('${stat.abbr}', 1)">+1</button>
      <button onclick="adjustStat('${stat.abbr}', 5)">+5</button>
    </div>
  `;
  document.getElementById("modal-overlay").classList.add("visible");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("visible");
  renderAll();
}

window.closeModal = closeModal;

document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
});

function setSkillLevel(skillName, level) {
  character.skills[skillName] = level;
  saveCharacter(character);
  // Re-open modal to reflect changes
  const skill = RT_SKILLS.find(s => s.name === skillName);
  const statVal = character.stats[skill.stat] ?? 0;
  const total = statVal + level * 10;
  openSkillModal(skill, level, total);
  renderSkills();
}
window.setSkillLevel = setSkillLevel;

function adjustStat(abbr, delta) {
  character.stats[abbr] = Math.max(1, Math.min(100, (character.stats[abbr] ?? 0) + delta));
  document.getElementById("stat-edit-val").textContent = character.stats[abbr];
  saveCharacter(character);
}
window.adjustStat = adjustStat;

// --- Dice roller ---------------------------------------------

function rollD100() {
  const result = Math.floor(Math.random() * 100) + 1;
  const display = document.getElementById("dice-result");
  const label = document.getElementById("dice-label");

  display.textContent = result;
  display.classList.remove("roll-anim");
  void display.offsetWidth; // force reflow to restart animation
  display.classList.add("roll-anim");

  // Compare against selected stat if one is chosen
  const statSelect = document.getElementById("dice-stat-select");
  const chosenStat = statSelect.value;
  if (chosenStat) {
    const target = character.stats[chosenStat] ?? 0;
    const pass = result <= target;
    const deg = pass ? Math.floor((target - result) / 10) : Math.floor((result - target - 1) / 10);
    label.textContent = pass
      ? `Pass vs ${chosenStat} ${target} — ${deg} degree${deg !== 1 ? "s" : ""} of success`
      : `Fail vs ${chosenStat} ${target} — ${deg} degree${deg !== 1 ? "s" : ""} of failure`;
    label.className = pass ? "dice-pass" : "dice-fail";
  } else {
    label.textContent = "";
    label.className = "";
  }
}

function populateDiceStatSelect() {
  const sel = document.getElementById("dice-stat-select");
  RT_STATS.forEach(stat => {
    const opt = document.createElement("option");
    opt.value = stat.abbr;
    opt.textContent = `${stat.abbr} — ${stat.name}`;
    sel.appendChild(opt);
  });
}

window.rollD100 = rollD100;

// --- Character editing ---------------------------------------

function openEditCharacter() {
  document.getElementById("edit-name").value = character.name;
  document.getElementById("edit-role").value = character.role;
  document.getElementById("edit-homeworld").value = character.homeworld || "";
  document.getElementById("edit-background").value = character.background || "";
  document.getElementById("edit-notes").value = character.notes || "";
  document.getElementById("edit-modal-overlay").classList.add("visible");
}

function saveEditCharacter() {
  character.name = document.getElementById("edit-name").value || "Unnamed Character";
  character.role = document.getElementById("edit-role").value || "Rogue Trader";
  character.homeworld = document.getElementById("edit-homeworld").value;
  character.background = document.getElementById("edit-background").value;
  character.notes = document.getElementById("edit-notes").value;
  saveCharacter(character);
  renderAll();
  document.getElementById("edit-modal-overlay").classList.remove("visible");
}

function closeEditModal() {
  document.getElementById("edit-modal-overlay").classList.remove("visible");
}

window.openEditCharacter = openEditCharacter;
window.saveEditCharacter = saveEditCharacter;
window.closeEditModal = closeEditModal;

// --- Export / Import -----------------------------------------

document.getElementById("export-btn").addEventListener("click", () => exportCharacter(character));

document.getElementById("import-btn").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importCharacter(file, (err, data) => {
    if (err) { alert(err); return; }
    character = data;
    saveCharacter(character);
    renderAll();
    alert("Character imported!");
  });
  e.target.value = "";
});

// --- Boot ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  populateDiceStatSelect();
  boot();
});

// ============================================================
// TALENTS
// ============================================================

function renderTalents() {
  const list = document.getElementById("talents-list");
  list.innerHTML = "";
  const talents = character.talents || [];
  if (talents.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted); font-size:14px; padding:8px 0;">No talents yet. Add one below.</p>`;
    return;
  }
  talents.forEach((t, i) => {
    const item = document.createElement("div");
    item.className = "talent-item";
    item.innerHTML = `
      <div class="talent-header" onclick="toggleTalent(${i})">
        <span class="talent-name">${t.name}</span>
        <span class="talent-chevron">▼</span>
      </div>
      <div class="talent-body">
        <div class="talent-desc">${t.desc || "No description."}</div>
        <div class="talent-actions">
          <button class="talent-action-btn" onclick="openEditTalent(${i})">Edit</button>
          <button class="talent-action-btn danger" onclick="deleteTalent(${i})">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function toggleTalent(i) {
  const items = document.querySelectorAll(".talent-item");
  items[i].classList.toggle("open");
}

function openAddTalent() {
  document.getElementById("talent-modal-title").textContent = "Add Talent";
  document.getElementById("talent-edit-index").value = -1;
  document.getElementById("talent-name").value = "";
  document.getElementById("talent-desc").value = "";
  document.getElementById("talent-modal-overlay").classList.add("visible");
}
window.openAddTalent = openAddTalent;

function openEditTalent(i) {
  const t = character.talents[i];
  document.getElementById("talent-modal-title").textContent = "Edit Talent";
  document.getElementById("talent-edit-index").value = i;
  document.getElementById("talent-name").value = t.name;
  document.getElementById("talent-desc").value = t.desc || "";
  document.getElementById("talent-modal-overlay").classList.add("visible");
}
window.openEditTalent = openEditTalent;

function saveTalent() {
  const name = document.getElementById("talent-name").value.trim();
  if (!name) { alert("Please enter a talent name."); return; }
  const desc = document.getElementById("talent-desc").value.trim();
  const idx = parseInt(document.getElementById("talent-edit-index").value);
  if (!character.talents) character.talents = [];
  if (idx >= 0) {
    character.talents[idx] = { name, desc };
  } else {
    character.talents.push({ name, desc });
  }
  saveCharacter(character);
  renderTalents();
  closeTalentModal();
}
window.saveTalent = saveTalent;

function deleteTalent(i) {
  if (!confirm("Delete this talent?")) return;
  character.talents.splice(i, 1);
  saveCharacter(character);
  renderTalents();
}
window.deleteTalent = deleteTalent;

function closeTalentModal() {
  document.getElementById("talent-modal-overlay").classList.remove("visible");
}
window.closeTalentModal = closeTalentModal;

// ============================================================
// EQUIPMENT
// ============================================================

function renderEquipment() {
  renderItemList("weapons-list", character.weapons || [], "weapon");
  renderItemList("gear-list", character.gear || [], "gear");
}

function renderItemList(containerId, items, type) {
  const list = document.getElementById(containerId);
  list.innerHTML = "";
  if (items.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted); font-size:14px; padding:8px 0;">None yet.</p>`;
    return;
  }
  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "item-card";
    const isWeapon = type === "weapon";
    card.innerHTML = `
      <div class="item-header" onclick="toggleItem('${containerId}', ${i})">
        <span class="item-name">${item.name}</span>
        ${isWeapon && item.damage ? `<span class="item-tag">${item.damage}</span>` : ""}
        <span class="item-chevron">▼</span>
      </div>
      <div class="item-body">
        ${isWeapon ? `
          <div style="background:var(--surface2); border-radius:8px; padding:10px; margin-top:12px;">
            ${item.damage  ? `<div class="item-stat-row"><span>Damage</span><strong>${item.damage}</strong></div>` : ""}
            ${item.range   ? `<div class="item-stat-row"><span>Range</span><strong>${item.range}</strong></div>` : ""}
            ${item.special ? `<div class="item-stat-row"><span>Special</span><strong>${item.special}</strong></div>` : ""}
          </div>
        ` : ""}
        ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ""}
        <div class="item-actions">
          <button class="talent-action-btn" onclick="openEditItem('${type}', ${i})">Edit</button>
          <button class="talent-action-btn danger" onclick="deleteItem('${type}', ${i})">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

function toggleItem(containerId, i) {
  const cards = document.querySelectorAll(`#${containerId} .item-card`);
  cards[i].classList.toggle("open");
}
window.toggleItem = toggleItem;

function openAddItem(type) {
  document.getElementById("item-modal-title").textContent = type === "weapon" ? "Add Weapon" : "Add Item";
  document.getElementById("item-edit-index").value = -1;
  document.getElementById("item-edit-type").value = type;
  document.getElementById("item-name").value = "";
  document.getElementById("item-damage").value = "";
  document.getElementById("item-range").value = "";
  document.getElementById("item-special").value = "";
  document.getElementById("item-notes").value = "";
  document.getElementById("weapon-fields").style.display = type === "weapon" ? "block" : "none";
  document.getElementById("item-modal-overlay").classList.add("visible");
}
window.openAddItem = openAddItem;

function openEditItem(type, i) {
  const arr = type === "weapon" ? character.weapons : character.gear;
  const item = arr[i];
  document.getElementById("item-modal-title").textContent = type === "weapon" ? "Edit Weapon" : "Edit Item";
  document.getElementById("item-edit-index").value = i;
  document.getElementById("item-edit-type").value = type;
  document.getElementById("item-name").value = item.name || "";
  document.getElementById("item-damage").value = item.damage || "";
  document.getElementById("item-range").value = item.range || "";
  document.getElementById("item-special").value = item.special || "";
  document.getElementById("item-notes").value = item.notes || "";
  document.getElementById("weapon-fields").style.display = type === "weapon" ? "block" : "none";
  document.getElementById("item-modal-overlay").classList.add("visible");
}
window.openEditItem = openEditItem;

function saveItem() {
  const name = document.getElementById("item-name").value.trim();
  if (!name) { alert("Please enter a name."); return; }
  const type = document.getElementById("item-edit-type").value;
  const idx  = parseInt(document.getElementById("item-edit-index").value);
  const entry = {
    name,
    damage:  document.getElementById("item-damage").value.trim(),
    range:   document.getElementById("item-range").value.trim(),
    special: document.getElementById("item-special").value.trim(),
    notes:   document.getElementById("item-notes").value.trim(),
  };
  if (!character.weapons) character.weapons = [];
  if (!character.gear)    character.gear    = [];
  const arr = type === "weapon" ? character.weapons : character.gear;
  if (idx >= 0) arr[idx] = entry; else arr.push(entry);
  saveCharacter(character);
  renderEquipment();
  closeItemModal();
}
window.saveItem = saveItem;

function deleteItem(type, i) {
  if (!confirm("Delete this item?")) return;
  const arr = type === "weapon" ? character.weapons : character.gear;
  arr.splice(i, 1);
  saveCharacter(character);
  renderEquipment();
}
window.deleteItem = deleteItem;

function closeItemModal() {
  document.getElementById("item-modal-overlay").classList.remove("visible");
}
window.closeItemModal = closeItemModal;
