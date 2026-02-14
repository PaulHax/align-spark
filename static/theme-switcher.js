const THEMES = [
  {
    id: "kitware",
    label: "Kitware",
    colors: ["#0067c7", "#3eae2b"],
    accent: "#0067c7",
    accentLight: "rgba(0, 103, 199, 0.1)",
  },
  {
    id: "ocean",
    label: "Ocean",
    colors: ["#0b4a6e", "#1b7f7a"],
    accent: "#0b4a6e",
    accentLight: "rgba(11, 74, 110, 0.12)",
  },
  {
    id: "coral",
    label: "Coral",
    colors: ["#b91c1c", "#ef4444"],
    accent: "#dc2626",
    accentLight: "rgba(220, 38, 38, 0.1)",
  },
  {
    id: "violet",
    label: "Violet",
    colors: ["#5b21b6", "#8b5cf6"],
    accent: "#7c3aed",
    accentLight: "rgba(124, 58, 237, 0.1)",
  },
  {
    id: "forest",
    label: "Forest",
    colors: ["#065f46", "#10b981"],
    accent: "#059669",
    accentLight: "rgba(5, 150, 105, 0.1)",
  },
  {
    id: "ember",
    label: "Ember",
    colors: ["#9a3412", "#f97316"],
    accent: "#ea580c",
    accentLight: "rgba(234, 88, 12, 0.08)",
  },
];

const STORAGE_KEY = "align-showcase-theme";
const DEFAULT_THEME = "kitware";

function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-light", theme.accentLight);
  root.style.setProperty("--nav-from", theme.colors[0]);
  root.style.setProperty("--nav-to", theme.colors[1]);
}

export function initThemeSwitcher() {
  const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  applyTheme(saved);

  const nav = document.querySelector(".showcase-nav");
  if (!nav) return;

  const picker = document.createElement("div");
  picker.className = "theme-picker";
  picker.innerHTML = `
    <button class="theme-picker-btn" aria-label="Change color scheme" title="Color scheme">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" fill="currentColor" stroke="none" opacity="0.7"/>
        <circle cx="17.5" cy="10.5" r="2.5" fill="currentColor" stroke="none" opacity="0.5"/>
        <circle cx="8.5" cy="7.5" r="2.5" fill="currentColor" stroke="none" opacity="0.9"/>
        <circle cx="6.5" cy="12.5" r="2.5" fill="currentColor" stroke="none" opacity="0.6"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
    </button>
    <div class="theme-picker-dropdown">
      ${THEMES.map(
        (t) => `
        <button class="theme-option${t.id === saved ? " active" : ""}" data-theme="${t.id}">
          <span class="theme-swatch" style="background: linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})"></span>
          <span class="theme-name">${t.label}</span>
        </button>`
      ).join("")}
    </div>
  `;

  nav.appendChild(picker);

  picker.querySelector(".theme-picker-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    picker.classList.toggle("open");
  });

  picker.addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-option");
    if (!btn) return;
    const id = btn.dataset.theme;
    applyTheme(id);
    localStorage.setItem(STORAGE_KEY, id);
    picker
      .querySelectorAll(".theme-option")
      .forEach((b) => b.classList.toggle("active", b.dataset.theme === id));
    picker.classList.remove("open");
  });

  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target)) picker.classList.remove("open");
  });
}
