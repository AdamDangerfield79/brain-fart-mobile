const STORAGE_KEY = "brainFartPwaIdeas.v001";
const STAGES = ["Idea", "Test Piece Done", "In Production"];

const state = {
  ideas: [],
  selectedIdeaId: null,
  listSketchIndex: 0,
  editingIdea: null,
  editorSketchIndex: 0,
};

const screen = document.getElementById("screen");
const homeBtn = document.getElementById("homeBtn");
const newBtn = document.getElementById("newBtn");

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadIdeas() {
  try {
    state.ideas = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    state.ideas = [];
  }
}

function saveIdeas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ideas));
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mainSketch(idea) {
  if (!idea?.sketches?.length) return null;
  return idea.sketches.find(s => s.id === idea.mainSketchId) || idea.sketches[0];
}

function selectedIdea() {
  return state.ideas.find(i => i.id === state.selectedIdeaId) || null;
}

function upsertIdea(idea) {
  const index = state.ideas.findIndex(i => i.id === idea.id);
  if (index === -1) state.ideas.push(idea);
  else state.ideas[index] = idea;
  saveIdeas();
}

function removeIdea(id) {
  state.ideas = state.ideas.filter(i => i.id !== id);
  if (state.selectedIdeaId === id) {
    state.selectedIdeaId = state.ideas[0]?.id || null;
    state.listSketchIndex = 0;
  }
  saveIdeas();
}

function renderList() {
  homeBtn.classList.add("active");
  const tpl = document.getElementById("listTemplate");
  screen.replaceChildren(tpl.content.cloneNode(true));

  screen.querySelector('[data-action="new"]').addEventListener("click", () => renderEditor());

  const list = document.getElementById("ideasList");
  list.innerHTML = "";

  if (!state.ideas.length) {
    const empty = document.createElement("div");
    empty.className = "paper-panel";
    empty.style.padding = "22px";
    empty.textContent = "No ideas yet. Tap Add New Idea.";
    list.appendChild(empty);
  }

  const sorted = [...state.ideas].sort((a, b) => (a.ideaName || "").localeCompare(b.ideaName || ""));

  if (!state.selectedIdeaId && sorted.length) {
    state.selectedIdeaId = sorted[0].id;
  }

  for (const idea of sorted) {
    const rowTpl = document.getElementById("ideaRowTemplate");
    const row = rowTpl.content.firstElementChild.cloneNode(true);
    row.dataset.id = idea.id;
    if (idea.id === state.selectedIdeaId) row.classList.add("selected");

    const thumbImg = row.querySelector(".thumb img");
    const thumbText = row.querySelector(".thumb span");
    const sketch = mainSketch(idea);
    if (sketch?.dataUrl) {
      thumbImg.src = sketch.dataUrl;
      thumbImg.style.display = "block";
      thumbText.style.display = "none";
    }

    row.querySelector("h3").textContent = idea.ideaName || "Untitled idea";
    row.querySelector("p").textContent = idea.description || "";
    row.querySelector("small").textContent = idea.stage || "Idea";

    row.addEventListener("click", () => {
      state.selectedIdeaId = idea.id;
      state.listSketchIndex = 0;
      renderList();
    });

    row.addEventListener("dblclick", () => renderEditor(idea));
    row.addEventListener("touchend", (event) => {
      if (event.detail === 2) renderEditor(idea);
    });

    list.appendChild(row);
  }

  wireListSketchPanel();
}

function wireListSketchPanel() {
  const prev = screen.querySelector('[data-action="prevListSketch"]');
  const next = screen.querySelector('[data-action="nextListSketch"]');
  prev.addEventListener("click", () => {
    const idea = selectedIdea();
    if (!idea?.sketches?.length) return;
    state.listSketchIndex = (state.listSketchIndex - 1 + idea.sketches.length) % idea.sketches.length;
    updateListSketch();
  });
  next.addEventListener("click", () => {
    const idea = selectedIdea();
    if (!idea?.sketches?.length) return;
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
    img.removeAttribute("src");
    img.style.display = "none";
    empty.style.display = "block";
    empty.textContent = idea ? "No sketches yet" : "Select an idea";
    count.textContent = "0 / 0";
    return;
  }

  state.listSketchIndex = Math.max(0, Math.min(state.listSketchIndex, idea.sketches.length - 1));
  const sketch = idea.sketches[state.listSketchIndex];

  img.src = sketch.dataUrl;
  img.style.display = "block";
  empty.style.display = "none";
  count.textContent = `${state.listSketchIndex + 1} / ${idea.sketches.length}${sketch.id === idea.mainSketchId ? " · MAIN" : ""}`;
}

function newIdea() {
  return {
    id: uid(),
    ideaName: "",
    description: "",
    materials: "",
    stage: "Idea",
    sketches: [],
    mainSketchId: null,
    updatedAt: new Date().toISOString(),
  };
}

function renderEditor(existingIdea = null) {
  homeBtn.classList.remove("active");
  state.editingIdea = existingIdea ? clone(existingIdea) : newIdea();
  state.editorSketchIndex = 0;

  const tpl = document.getElementById("editorTemplate");
  screen.replaceChildren(tpl.content.cloneNode(true));

  const idea = state.editingIdea;
  const form = document.getElementById("ideaForm");
  const ideaName = document.getElementById("ideaName");
  const description = document.getElementById("description");
  const materials = document.getElementById("materials");
  const stage = document.getElementById("stage");
  const dropZone = document.getElementById("dropZone");
  const input = document.getElementById("sketchInput");

  document.getElementById("editorTitle").textContent = idea.ideaName || "New Idea";

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

  form.addEventListener("input", applyFields);
  stage.addEventListener("change", applyFields);

  screen.querySelector('[data-action="back"]').addEventListener("click", () => {
    applyFields();
    renderList();
  });

  screen.querySelector('[data-action="delete"]').addEventListener("click", () => {
    if (!confirm("Delete this idea?")) return;
    removeIdea(idea.id);
    renderList();
  });

  screen.querySelector('[data-action="prevSketch"]').addEventListener("click", () => {
    if (!idea.sketches.length) return;
    state.editorSketchIndex = (state.editorSketchIndex - 1 + idea.sketches.length) % idea.sketches.length;
    updateEditorSketch();
  });

  screen.querySelector('[data-action="nextSketch"]').addEventListener("click", () => {
    if (!idea.sketches.length) return;
    state.editorSketchIndex = (state.editorSketchIndex + 1) % idea.sketches.length;
    updateEditorSketch();
  });

  screen.querySelector('[data-action="markMain"]').addEventListener("click", () => {
    const sketch = idea.sketches[state.editorSketchIndex];
    if (!sketch) return;
    idea.mainSketchId = sketch.id;
    applyFields();
    updateEditorSketch();
  });

  screen.querySelector('[data-action="removeSketch"]').addEventListener("click", () => {
    const sketch = idea.sketches[state.editorSketchIndex];
    if (!sketch) return;
    idea.sketches.splice(state.editorSketchIndex, 1);
    if (idea.mainSketchId === sketch.id) {
      idea.mainSketchId = idea.sketches[0]?.id || null;
    }
    state.editorSketchIndex = Math.max(0, state.editorSketchIndex - 1);
    applyFields();
    updateEditorSketch();
  });

  dropZone.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    await addFilesToIdea([...input.files], idea);
    input.value = "";
    applyFields();
    updateEditorSketch();
  });

  dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

  dropZone.addEventListener("drop", async event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    await addFilesToIdea([...event.dataTransfer.files], idea);
    applyFields();
    updateEditorSketch();
  });

  updateEditorSketch();
}

async function addFilesToIdea(files, idea) {
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await fileToCompressedDataUrl(file);
    const sketch = {
      id: uid(),
      name: file.name,
      dataUrl,
      addedAt: new Date().toISOString(),
    };
    idea.sketches.push(sketch);
    if (!idea.mainSketchId) idea.mainSketchId = sketch.id;
    state.editorSketchIndex = idea.sketches.length - 1;
  }
}

function fileToCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const max = 1600;
        let { width, height } = img;
        if (width > max || height > max) {
          const scale = Math.min(max / width, max / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff7e6";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function updateEditorSketch() {
  const idea = state.editingIdea;
  const img = document.getElementById("editorSketchImg");
  const empty = document.getElementById("editorSketchEmpty");
  const count = document.getElementById("editorSketchCount");

  if (!idea?.sketches?.length) {
    img.removeAttribute("src");
    img.style.display = "none";
    empty.style.display = "block";
    count.textContent = "0 / 0";
    return;
  }

  state.editorSketchIndex = Math.max(0, Math.min(state.editorSketchIndex, idea.sketches.length - 1));
  const sketch = idea.sketches[state.editorSketchIndex];

  img.src = sketch.dataUrl;
  img.style.display = "block";
  empty.style.display = "none";
  count.textContent = `${state.editorSketchIndex + 1} / ${idea.sketches.length}${sketch.id === idea.mainSketchId ? " · MAIN" : ""}`;
}

homeBtn.addEventListener("click", renderList);
newBtn.addEventListener("click", () => renderEditor());

window.addEventListener("beforeunload", () => {
  if (state.editingIdea && (state.editingIdea.ideaName || state.editingIdea.description || state.editingIdea.materials || state.editingIdea.sketches?.length)) {
    upsertIdea(state.editingIdea);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

loadIdeas();
renderList();
