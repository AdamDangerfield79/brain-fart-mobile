// Brain Fart Mobile Web v0.05
// VERIFIED FEATURES: icon-only sketch buttons below canvas + undoSketch handler
const STORAGE_KEY="brainFartPwaIdeas.v005";
const state={ideas:[],selectedIdeaId:null,listSketchIndex:0,editingIdea:null,editorSketchIndex:0};
const screen=document.getElementById("screen");

const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
const load=()=>{try{state.ideas=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{state.ideas=[]}};
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state.ideas));
const clone=o=>JSON.parse(JSON.stringify(o));
const mainSketch=i=>!i?.sketches?.length?null:(i.sketches.find(s=>s.id===i.mainSketchId)||i.sketches[0]);
const selected=()=>state.ideas.find(i=>i.id===state.selectedIdeaId)||null;

function upsert(idea){let n=state.ideas.findIndex(i=>i.id===idea.id);if(n<0)state.ideas.push(idea);else state.ideas[n]=idea;save()}
function removeIdea(id){state.ideas=state.ideas.filter(i=>i.id!==id);save();state.selectedIdeaId=state.ideas[0]?.id||null}
function newIdea(){return{id:uid(),ideaName:"",description:"",materials:"",stage:"Idea",sketches:[],mainSketchId:null}}
function addBlankSketch(idea){let s={id:uid(),kind:"drawing",dataUrl:"",addedAt:new Date().toISOString()};idea.sketches.push(s);if(!idea.mainSketchId)idea.mainSketchId=s.id;return s}

function renderList(){
  screen.replaceChildren(document.getElementById("listTemplate").content.cloneNode(true));
  screen.querySelector('[data-action="new"]').onclick=()=>renderEditor();
  const list=document.getElementById("ideasList");
  if(!state.ideas.length){let e=document.createElement("div");e.className="paper-panel";e.style.padding="22px";e.textContent="No ideas yet. Tap Add New Idea.";list.appendChild(e)}
  const sorted=[...state.ideas].sort((a,b)=>(a.ideaName||"").localeCompare(b.ideaName||""));
  if(!state.selectedIdeaId&&sorted.length)state.selectedIdeaId=sorted[0].id;
  for(const idea of sorted){
    const row=document.getElementById("rowTemplate").content.firstElementChild.cloneNode(true);
    if(idea.id===state.selectedIdeaId)row.classList.add("selected");
    const sk=mainSketch(idea),img=row.querySelector(".thumb img"),sp=row.querySelector(".thumb span");
    if(sk?.dataUrl){img.src=sk.dataUrl;img.style.display="block";sp.style.display="none"}
    row.querySelector("h3").textContent=idea.ideaName||"Untitled idea";
    row.querySelector("p").textContent=idea.description||"";
    row.querySelector("small").textContent=idea.stage||"Idea";
    row.onclick=()=>{state.selectedIdeaId=idea.id;state.listSketchIndex=0;renderList()};
    row.ondblclick=()=>renderEditor(idea);
    list.appendChild(row)
  }
  screen.querySelector('[data-action="prevListSketch"]').onclick=()=>{let i=selected();if(!i?.sketches?.length)return;state.listSketchIndex=(state.listSketchIndex-1+i.sketches.length)%i.sketches.length;updateListSketch()};
  screen.querySelector('[data-action="nextListSketch"]').onclick=()=>{let i=selected();if(!i?.sketches?.length)return;state.listSketchIndex=(state.listSketchIndex+1)%i.sketches.length;updateListSketch()};
  updateListSketch()
}

function updateListSketch(){
  const img=document.getElementById("listSketchImg"),empty=document.getElementById("listSketchEmpty"),count=document.getElementById("listSketchCount"),idea=selected();
  if(!idea?.sketches?.length){img.style.display="none";empty.style.display="block";empty.textContent=idea?"No sketches yet":"Select an idea";count.textContent="0 / 0";return}
  state.listSketchIndex=Math.max(0,Math.min(state.listSketchIndex,idea.sketches.length-1));
  const sk=idea.sketches[state.listSketchIndex];
  img.src=sk.dataUrl;img.style.display="block";empty.style.display="none";
  count.textContent=`${state.listSketchIndex+1} / ${idea.sketches.length}${sk.id===idea.mainSketchId?" · MAIN":""}`
}

function renderEditor(existing=null){
  state.editingIdea=existing?clone(existing):newIdea();
  state.editorSketchIndex=0;
  const idea=state.editingIdea;
  if(!idea.sketches.length)addBlankSketch(idea);

  screen.replaceChildren(document.getElementById("editorTemplate").content.cloneNode(true));

  const name=document.getElementById("ideaName");
  const desc=document.getElementById("description");
  const mat=document.getElementById("materials");
  const stage=document.getElementById("stage");
  const canvas=document.getElementById("sketchCanvas");
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  let undoStack=[];

  name.value=idea.ideaName||"";
  desc.value=idea.description||"";
  mat.value=idea.materials||"";
  stage.value=idea.stage||"Idea";

  function fields(){
    idea.ideaName=name.value.trim();
    idea.description=desc.value.trim();
    idea.materials=mat.value.trim();
    idea.stage=stage.value;
    upsert(idea);
    state.selectedIdeaId=idea.id;
    document.getElementById("editorTitle").textContent=idea.ideaName||"New Idea";
  }

  function count(){
    let sk=idea.sketches[state.editorSketchIndex];
    document.getElementById("editorSketchCount").textContent=`${state.editorSketchIndex+1} / ${idea.sketches.length}${sk?.id===idea.mainSketchId?" · MAIN":""}`;
  }

  function paper(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle="#fff7e6";
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  function drawImageFit(dataUrl){
    if(!dataUrl){paper();count();return}
    let im=new Image();
    im.onload=()=>{
      paper();
      let sc=Math.min(canvas.width/im.width,canvas.height/im.height);
      let w=im.width*sc,h=im.height*sc;
      ctx.drawImage(im,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      count();
    };
    im.src=dataUrl;
  }

  function loadCanvas(){
    let sk=idea.sketches[state.editorSketchIndex];
    drawImageFit(sk?.dataUrl||"");
    count();
  }

  function saveCanvas(){
    let sk=idea.sketches[state.editorSketchIndex];
    if(!sk)return;
    sk.dataUrl=canvas.toDataURL("image/png");
    if(!idea.mainSketchId)idea.mainSketchId=sk.id;
    fields();
  }

  function resize(){
    let r=canvas.getBoundingClientRect(),d=devicePixelRatio||1;
    canvas.width=Math.max(600,Math.floor(r.width*d));
    canvas.height=Math.max(420,Math.floor(r.height*d));
    loadCanvas();
  }

  function snapshot(){
    try{
      undoStack.push(canvas.toDataURL("image/png"));
      if(undoStack.length>25)undoStack.shift();
    }catch{}
  }

  function undoSketch(){
    let previous=undoStack.pop();
    if(!previous)return;
    drawImageFit(previous);
    setTimeout(saveCanvas,50);
  }

  document.getElementById("ideaForm").oninput=fields;
  stage.onchange=fields;

  screen.querySelector('[data-action="back"]').onclick=()=>{saveCanvas();renderList()};
  screen.querySelector('[data-action="delete"]').onclick=()=>{if(confirm("Delete this idea?")){removeIdea(idea.id);renderList()}};
  screen.querySelector('[data-action="prevSketch"]').onclick=()=>{saveCanvas();state.editorSketchIndex=(state.editorSketchIndex-1+idea.sketches.length)%idea.sketches.length;undoStack=[];loadCanvas()};
  screen.querySelector('[data-action="nextSketch"]').onclick=()=>{saveCanvas();state.editorSketchIndex=(state.editorSketchIndex+1)%idea.sketches.length;undoStack=[];loadCanvas()};
  screen.querySelector('[data-action="newSketch"]').onclick=()=>{saveCanvas();addBlankSketch(idea);state.editorSketchIndex=idea.sketches.length-1;undoStack=[];loadCanvas();fields()};
  screen.querySelector('[data-action="undoSketch"]').onclick=()=>undoSketch();
  screen.querySelector('[data-action="clearSketch"]').onclick=()=>{snapshot();paper();saveCanvas()};
  screen.querySelector('[data-action="markMain"]').onclick=()=>{idea.mainSketchId=idea.sketches[state.editorSketchIndex]?.id;saveCanvas();count()};
  screen.querySelector('[data-action="removeSketch"]').onclick=()=>{
    if(idea.sketches.length<=1){snapshot();paper();saveCanvas();return}
    let sk=idea.sketches[state.editorSketchIndex];
    idea.sketches.splice(state.editorSketchIndex,1);
    if(idea.mainSketchId===sk.id)idea.mainSketchId=idea.sketches[0]?.id||null;
    state.editorSketchIndex=Math.max(0,state.editorSketchIndex-1);
    undoStack=[];
    loadCanvas();
    fields();
  };

  let drawing=false,last=null,timer=null;
  const p=e=>{
    let r=canvas.getBoundingClientRect();
    return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};
  };
  const soon=()=>{clearTimeout(timer);timer=setTimeout(saveCanvas,300)};

  canvas.onpointerdown=e=>{
    e.preventDefault();
    snapshot();
    canvas.setPointerCapture(e.pointerId);
    drawing=true;
    last=p(e);
  };

  canvas.onpointermove=e=>{
    if(!drawing)return;
    e.preventDefault();
    let q=p(e);
    ctx.strokeStyle="#2b2118";
    ctx.lineWidth=Math.max(4,canvas.width/220);
    ctx.lineCap="round";
    ctx.lineJoin="round";
    ctx.beginPath();
    ctx.moveTo(last.x,last.y);
    ctx.lineTo(q.x,q.y);
    ctx.stroke();
    last=q;
    soon();
  };

  canvas.onpointerup=canvas.onpointercancel=canvas.onpointerleave=()=>{
    if(drawing){drawing=false;soon()}
  };

  requestAnimationFrame(resize);
}

if("serviceWorker"in navigator){
  addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=005").catch(()=>{}));
}
load();
renderList();
