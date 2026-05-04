const STORAGE_KEY = "brainFartPwaIdeas.v002";
const state = { ideas: [], selectedIdeaId: null, listSketchIndex: 0, editingIdea: null, editorSketchIndex: 0 };

const screen = document.getElementById("screen");

function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function loadIdeas() { try { state.ideas = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { state.ideas = []; } }
function saveIdeas() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ideas)); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function mainSketch(idea) { if (!idea?.sketches?.length) return null; return idea.sketches.find(s => s.id === idea.mainSketchId) || idea.sketches[0]; }
function selectedIdea() { return state.ideas.find(i => i.id === state.selectedIdeaId) || null; }
function upsertIdea(idea) { const i = state.ideas.findIndex(x => x.id === idea.id); if (i === -1) state.ideas.push(idea); else state.ideas[i] = idea; saveIdeas(); }
function removeIdea(id) { state.ideas = state.ideas.filter(i => i.id !== id); if (state.selectedIdeaId === id) state.selectedIdeaId = state.ideas[0]?.id || null; saveIdeas(); }

function renderList() {
  const tpl = document.getElementById("listTemplate");
  screen.replaceChildren(tpl.content.cloneNode(true));
  screen.querySelector('[data-action="new"]').addEventListener("click", () => renderEditor());

  const list = document.getElementById("ideasList");
  if (!state.ideas.length) {
    const empty = document.createElement("div");
    empty.className = "paper-panel";
    empty.style.padding = "22px";
    empty.textContent = "No ideas yet. Tap Add New Idea.";
    list.appendChild(empty);
  }

  const sorted = [...state.ideas].sort((a, b) => (a.ideaName || "").localeCompare(b.ideaName || ""));
  if (!state.selectedIdeaId && sorted.length) state.selectedIdeaId = sorted[0].id;

  for (const idea of sorted) {
    const row = document.getElementById("ideaRowTemplate").content.firstElementChild.cloneNode(true);
    if (idea.id === state.selectedIdeaId) row.classList.add("selected");
    const sketch = mainSketch(idea);
    const img = row.querySelector(".thumb img");
    const span = row.querySelector(".thumb span");
    if (sketch?.dataUrl) { img.src = sketch.dataUrl; img.style.display = "block"; span.style.display = "none"; }
    row.querySelector("h3").textContent = idea.ideaName || "Untitled idea";
    row.querySelector("p").textContent = idea.description || "";
    row.querySelector("small").textContent = idea.stage || "Idea";
    row.addEventListener("click", () => { state.selectedIdeaId = idea.id; state.listSketchIndex = 0; renderList(); });
    row.addEventListener("dblclick", () => renderEditor(idea));
    list.appendChild(row);
  }

  screen.querySelector('[data-action="prevListSketch"]').addEventListener("click", () => {
    const idea = selectedIdea(); if (!idea?.sketches?.length) return;
    state.listSketchIndex = (state.listSketchIndex - 1 + idea.sketches.length) % idea.sketches.length;
    updateListSketch();
  });
  screen.querySelector('[data-action="nextListSketch"]').addEventListener("click", () => {
    const idea = selectedIdea(); if (!idea?.sketches?.length) return;
    state.listSketchIndex = (state.listSketchIndex + 1) % idea.sketches.length;
    updateListSketch();
  });
  updateListSketch();
}

function updateListSketch() {
  const img = document.getElementById("listSketchImg");
  const empty = document.getElementById("listSketchEmpty");
  const count = document.getElementById("listSketchCount");
  const idea = selectedIdea();
  if (!idea?.sketches?.length) {
    img.removeAttribute("src"); img.style.display = "none"; empty.style.display = "block";
    empty.textContent = idea ? "No sketches yet" : "Select an idea"; count.textContent = "0 / 0"; return;
  }
  state.listSketchIndex = Math.max(0, Math.min(state.listSketchIndex, idea.sketches.length - 1));
  const sketch = idea.sketches[state.listSketchIndex];
  img.src = sketch.dataUrl; img.style.display = "block"; empty.style.display = "none";
  count.textContent = `${state.listSketchIndex + 1} / ${idea.sketches.length}${sketch.id === idea.mainSketchId ? " · MAIN" : ""}`;
}

function newIdea() {
  return { id: uid(), ideaName: "", description: "", materials: "", stage: "Idea", sketches: [], mainSketchId: null, updatedAt: new Date().toISOString() };
}

function addBlankSketch(idea) {
  const sketch = { id: uid(), name: "Sketch", kind: "drawing", dataUrl: "", addedAt: new Date().toISOString() };
  idea.sketches.push(sketch);
  if (!idea.mainSketchId) idea.mainSketchId = sketch.id;
  return sketch;
}

function renderEditor(existingIdea = null) {
  state.editingIdea = existingIdea ? clone(existingIdea) : newIdea();
  state.editorSketchIndex = 0;
  const idea = state.editingIdea;
  for (const sketch of idea.sketches || []) if (!sketch.kind) sketch.kind = "drawing";
  if (!idea.sketches.length) addBlankSketch(idea);

  const tpl = document.getElementById("editorTemplate");
  screen.replaceChildren(tpl.content.cloneNode(true));

  const ideaName = document.getElementById("ideaName");
  const description = document.getElementById("description");
  const materials = document.getElementById("materials");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("sketchCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ideaName.value = idea.ideaName || "";
  description.value = idea.description || "";
  materials.value = idea.materials || "";
  stage.value = idea.stage || "Idea";

  function applyFields() {
    idea.ideaName = ideaName.value.trim();
    idea.description = description.value.trim();
    idea.materials = materials.value.trim();
    idea.stage = stage.value;
    idea.updatedAt = new Date().toISOString();
    if (idea.ideaName || idea.description || idea.materials || idea.sketches.length) {
      upsertIdea(idea);
      state.selectedIdeaId = idea.id;
    }
    document.getElementById("editorTitle").textContent = idea.ideaName || "New Idea";
  }

  function saveCanvas() {
    const sketch = idea.sketches[state.editorSketchIndex];
    if (!sketch) return;
    sketch.dataUrl = canvas.toDataURL("image/png");
    sketch.kind = "drawing";
    sketch.updatedAt = new Date().toISOString();
    if (!idea.mainSketchId) idea.mainSketchId = sketch.id;
    applyFields();
  }

  function updateCount() {
    const sketch = idea.sketches[state.editorSketchIndex];
    document.getElementById("editorSketchCount").textContent =
      `${state.editorSketchIndex + 1} / ${idea.sketches.length}${sketch?.id === idea.mainSketchId ? " · MAIN" : ""}`;
  }

  function loadCanvas() {
    paintPaperCanvas(ctx, canvas);
    const sketch = idea.sketches[state.editorSketchIndex];
    if (sketch?.dataUrl) {
      const img = new Image();
      img.onload = () => { paintPaperCanvas(ctx, canvas); fitImageToCanvas(ctx, canvas, img); };
      img.src = sketch.dataUrl;
    }
    updateCount();
  }

  function resizeCanvas() {
    const old = idea.sketches[state.editorSketchIndex]?.dataUrl || "";
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(600, Math.floor(rect.width * ratio));
    canvas.height = Math.max(420, Math.floor(rect.height * ratio));
    paintPaperCanvas(ctx, canvas);
    if (old) {
      const img = new Image();
      img.onload = () => { paintPaperCanvas(ctx, canvas); fitImageToCanvas(ctx, canvas, img); };
      img.src = old;
    }
  }

  document.getElementById("ideaForm").addEventListener("input", applyFields);
  stage.addEventListener("change", applyFields);

  screen.querySelector('[data-action="back"]').addEventListener("click", () => { saveCanvas(); renderList(); });
  screen.querySelector('[data-action="delete"]').addEventListener("click", () => { if (confirm("Delete this idea?")) { removeIdea(idea.id); renderList(); } });
  screen.querySelector('[data-action="prevSketch"]').addEventListener("click", () => { saveCanvas(); state.editorSketchIndex = (state.editorSketchIndex - 1 + idea.sketches.length) % idea.sketches.length; loadCanvas(); });
  screen.querySelector('[data-action="nextSketch"]').addEventListener("click", () => { saveCanvas(); state.editorSketchIndex = (state.editorSketchIndex + 1) % idea.sketches.length; loadCanvas(); });
  screen.querySelector('[data-action="newSketch"]').addEventListener("click", () => { saveCanvas(); addBlankSketch(idea); state.editorSketchIndex = idea.sketches.length - 1; loadCanvas(); applyFields(); });
  screen.querySelector('[data-action="clearSketch"]').addEventListener("click", () => { paintPaperCanvas(ctx, canvas); saveCanvas(); });
  screen.querySelector('[data-action="markMain"]').addEventListener("click", () => { const sketch = idea.sketches[state.editorSketchIndex]; if (sketch) { idea.mainSketchId = sketch.id; saveCanvas(); updateCount(); } });
  screen.querySelector('[data-action="removeSketch"]').addEventListener("click", () => {
    if (idea.sketches.length <= 1) { paintPaperCanvas(ctx, canvas); saveCanvas(); return; }
    const sketch = idea.sketches[state.editorSketchIndex];
    idea.sketches.splice(state.editorSketchIndex, 1);
    if (idea.mainSketchId === sketch.id) idea.mainSketchId = idea.sketches[0]?.id || null;
    state.editorSketchIndex = Math.max(0, state.editorSketchIndex - 1);
    loadCanvas(); applyFields();
  });

  setupDrawing(canvas, ctx, saveCanvas);
  requestAnimationFrame(() => { resizeCanvas(); loadCanvas(); });
}

function paintPaperCanvas(ctx, canvas) {
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = "#fff7e6"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "rgba(138,90,43,.035)";
  for (let i=0;i<90;i++) { const x=(i*97)%canvas.width, y=(i*53)%canvas.height; ctx.beginPath(); ctx.arc(x,y,1.4+(i%4),0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
function fitImageToCanvas(ctx, canvas, img) {
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
}
function setupDrawing(canvas, ctx, onSave) {
  let drawing = false, last = null, timer = null;
  const point = e => { const r = canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*(canvas.width/r.width), y:(e.clientY-r.top)*(canvas.height/r.height) }; };
  const saveSoon = () => { clearTimeout(timer); timer = setTimeout(onSave, 350); };
  canvas.addEventListener("pointerdown", e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); drawing = true; last = point(e); });
  canvas.addEventListener("pointermove", e => {
    if (!drawing) return; e.preventDefault();
    const p = point(e); ctx.strokeStyle = "#2b2118"; ctx.lineWidth = Math.max(4, canvas.width/220); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last = p; saveSoon();
  });
  const stop = () => { if (!drawing) return; drawing = false; last = null; saveSoon(); };
  canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointercancel", stop); canvas.addEventListener("pointerleave", stop);
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
loadIdeas();
renderList();
