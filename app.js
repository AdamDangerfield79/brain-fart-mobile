// Brain Fart Mobile Web v1.08 PINK
// STORAGE KEY KEPT AS v005 TO PRESERVE EXISTING DATA.
const STORAGE_KEY="brainFartPwaIdeas.v005";
const state={ideas:[],selectedIdeaId:null,listSketchIndex:0,editingIdea:null,editorSketchIndex:0,expandedFolders:{}};
const screen=document.getElementById("screen");
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
const load=()=>{try{state.ideas=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{state.ideas=[]}};
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state.ideas));
const clone=o=>JSON.parse(JSON.stringify(o));
const mainSketch=i=>!i?.sketches?.length?null:(i.sketches.find(s=>s.id===i.mainSketchId)||i.sketches[0]);
const selected=()=>state.ideas.find(i=>i.id===state.selectedIdeaId)||null;
const forceEditorTitle=()=>{const t=document.getElementById("editorTitle");if(t)t.textContent="IDEA"};
function upsert(idea){let n=state.ideas.findIndex(i=>i.id===idea.id);if(n<0)state.ideas.push(idea);else state.ideas[n]=idea;save()}
function removeIdea(id){state.ideas=state.ideas.filter(i=>i.id!==id);save();state.selectedIdeaId=state.ideas[0]?.id||null}
function newIdea(){return{id:uid(),ideaName:"",description:"",materials:"",stage:"Idea",folderName:"",sketches:[],mainSketchId:null}}
function addBlankSketch(idea){let s={id:uid(),kind:"drawing",dataUrl:"",addedAt:new Date().toISOString()};idea.sketches.push(s);if(!idea.mainSketchId)idea.mainSketchId=s.id;return s}

function renderList(){
  screen.replaceChildren(document.getElementById("listTemplate").content.cloneNode(true));
  screen.querySelector('[data-action="new"]').onclick=()=>renderEditor();
  const list=document.getElementById("ideasList");
  if(!state.ideas.length){let e=document.createElement("div");e.className="soft-card";e.style.padding="22px";e.textContent="No ideas yet. Tap + to add one.";list.appendChild(e);return}
  const sorted=[...state.ideas].sort((a,b)=>(a.ideaName||"").localeCompare(b.ideaName||""));
  if(!state.selectedIdeaId&&sorted.length)state.selectedIdeaId=sorted[0].id;
  const folders=[...new Set(sorted.map(i=>(i.folderName||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  function appendIdeaRow(idea,parent=list){
    const row=document.getElementById("rowTemplate").content.firstElementChild.cloneNode(true);
    if(idea.id===state.selectedIdeaId)row.classList.add("selected");
    const sk=mainSketch(idea),img=row.querySelector(".thumb img"),sp=row.querySelector(".thumb span");
    if(sk?.dataUrl){img.src=sk.dataUrl;img.style.display="block";sp.style.display="none"}
    row.querySelector("h3").textContent=idea.ideaName||"Untitled idea";
    row.querySelector("p").textContent=idea.description||"";
    row.querySelector("small").textContent=idea.stage||"Idea";
    row.onclick=()=>renderEditor(idea);
    parent.appendChild(row)
  }
  for(const folder of folders){
    const folderIdeas=sorted.filter(i=>(i.folderName||"").trim()===folder);
    const group=document.createElement("section");
    group.className="folder-group soft-card";
    const header=document.createElement("button");
    header.type="button";
    header.className="folder-header";
    const expanded=!!state.expandedFolders[folder];
    header.innerHTML=`<span>${folder}</span><small>${folderIdeas.length} idea${folderIdeas.length===1?"":"s"}</small><strong>${expanded?"−":"+"}</strong>`;
    header.onclick=()=>{state.expandedFolders[folder]=!expanded;renderList()};
    group.appendChild(header);
    if(expanded){
      const inner=document.createElement("div");
      inner.className="folder-ideas";
      folderIdeas.forEach(i=>appendIdeaRow(i,inner));
      group.appendChild(inner);
    }
    list.appendChild(group);
  }
  sorted.filter(i=>!(i.folderName||"").trim()).forEach(i=>appendIdeaRow(i));
}


function renderEditor(existing=null){
  state.editingIdea=existing?clone(existing):newIdea();state.editorSketchIndex=0;const idea=state.editingIdea;if(!idea.sketches.length)addBlankSketch(idea);
  screen.replaceChildren(document.getElementById("editorTemplate").content.cloneNode(true));forceEditorTitle();
  const name=document.getElementById("ideaName"),desc=document.getElementById("description"),mat=document.getElementById("materials"),stage=document.getElementById("stage"),folder=document.getElementById("folder"),canvas=document.getElementById("sketchCanvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
  let undoStack=[];
  name.value=idea.ideaName||"";desc.value=idea.description||"";mat.value=idea.materials||"";stage.value=idea.stage||"Idea";
  function populateFolders(){
    const current=(idea.folderName||"").trim();
    const folders=[...new Set(state.ideas.map(i=>(i.folderName||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    folder.innerHTML='<option value="">No folder</option>';
    folders.forEach(f=>{const o=document.createElement("option");o.value=f;o.textContent=f;folder.appendChild(o)});
    const add=document.createElement("option");add.value="__add_new_folder__";add.textContent="Add new folder";folder.appendChild(add);
    folder.value=folders.includes(current)?current:"";
  }
  populateFolders();
  function fields(){idea.ideaName=name.value.trim();idea.description=desc.value.trim();idea.materials=mat.value.trim();idea.stage=stage.value;idea.folderName=(folder.value||"").trim();upsert(idea);state.selectedIdeaId=idea.id;forceEditorTitle()}
  function count(){let sk=idea.sketches[state.editorSketchIndex];document.getElementById("editorSketchCount").textContent=`${state.editorSketchIndex+1} / ${idea.sketches.length}${sk?.id===idea.mainSketchId?" · MAIN":""}`;forceEditorTitle()}
  function paper(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height)}
  function drawImageFit(dataUrl){if(!dataUrl){paper();count();return}let im=new Image();im.onload=()=>{paper();let sc=Math.min(canvas.width/im.width,canvas.height/im.height),w=im.width*sc,h=im.height*sc;ctx.drawImage(im,(canvas.width-w)/2,(canvas.height-h)/2,w,h);count()};im.src=dataUrl}
  function loadCanvas(){let sk=idea.sketches[state.editorSketchIndex];drawImageFit(sk?.dataUrl||"");count()}
  function saveCanvas(){let sk=idea.sketches[state.editorSketchIndex];if(!sk)return;sk.dataUrl=canvas.toDataURL("image/png");if(!idea.mainSketchId)idea.mainSketchId=sk.id;fields()}
  function resize(){let r=canvas.getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=Math.max(600,Math.floor(r.width*d));canvas.height=Math.max(420,Math.floor(r.height*d));loadCanvas()}
  function snapshot(){try{undoStack.push(canvas.toDataURL("image/png"));if(undoStack.length>25)undoStack.shift()}catch{}}
  function undoSketch(){let previous=undoStack.pop();if(!previous)return;drawImageFit(previous);setTimeout(saveCanvas,50)}
  document.getElementById("ideaForm").oninput=fields;stage.onchange=fields;
  folder.onchange=()=>{
    if(folder.value==="__add_new_folder__"){
      const folderName=(prompt("Folder name")||"").trim();
      if(folderName){idea.folderName=folderName;upsert(idea);state.expandedFolders[folderName]=true;populateFolders();folder.value=folderName}
      else populateFolders();
    }
    fields();
  };
  screen.querySelector('[data-action="back"]').onclick=()=>{try{saveCanvas()}catch(e){console.warn('Could not save current sketch before leaving',e)}renderList()};
  screen.querySelector('[data-action="delete"]').onclick=()=>{if(confirm("Delete this idea?")){removeIdea(idea.id);renderList()}};
  screen.querySelector('[data-action="prevSketch"]').onclick=()=>{saveCanvas();state.editorSketchIndex=(state.editorSketchIndex-1+idea.sketches.length)%idea.sketches.length;undoStack=[];loadCanvas()};
  screen.querySelector('[data-action="nextSketch"]').onclick=()=>{saveCanvas();state.editorSketchIndex=(state.editorSketchIndex+1)%idea.sketches.length;undoStack=[];loadCanvas()};
  screen.querySelector('[data-action="newSketch"]').onclick=()=>{saveCanvas();addBlankSketch(idea);state.editorSketchIndex=idea.sketches.length-1;undoStack=[];loadCanvas();fields()};
  screen.querySelector('[data-action="undoSketch"]').onclick=()=>undoSketch();
  const cameraInput=document.getElementById("cameraInput"), photoLibraryInput=document.getElementById("photoLibraryInput");
  function canvasIsBlank(){
    try{
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=0;i<pixels.length;i+=16){
        const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        if(a>0&&(r<245||g<245||b<245))return false;
      }
      return true;
    }catch{return false}
  }
  function currentSketchIsEmpty(){
    const sk=idea.sketches[state.editorSketchIndex];
    if(!sk)return false;
    // Treat starter sketches from older versions as empty too: some saved
    // blank sketches have no kind, or have a white canvas dataUrl already.
    const isPhoto=sk.kind==="photo";
    if(isPhoto)return false;
    return !sk.dataUrl || canvasIsBlank();
  }
  function addPhotoFile(file,input){
    if(!file)return;
    const replaceCurrent=currentSketchIsEmpty();
    if(!replaceCurrent)saveCanvas();
    const reader=new FileReader();
    reader.onload=evt=>{
      const im=new Image();
      im.onload=()=>{
        const maxSide=1400;
        const scale=Math.min(1,maxSide/Math.max(im.width,im.height));
        const w=Math.max(1,Math.round(im.width*scale));
        const h=Math.max(1,Math.round(im.height*scale));
        const c=document.createElement("canvas");
        c.width=w;c.height=h;
        c.getContext("2d").drawImage(im,0,0,w,h);
        const dataUrl=c.toDataURL("image/jpeg",0.86);
        let sk={id:uid(),kind:"photo",dataUrl,addedAt:new Date().toISOString()};
        if(replaceCurrent){
          sk.id=idea.sketches[state.editorSketchIndex].id;
          idea.sketches[state.editorSketchIndex]=sk;
        }else{
          idea.sketches.push(sk);
          state.editorSketchIndex=idea.sketches.length-1;
        }
        if(!idea.mainSketchId||replaceCurrent)idea.mainSketchId=sk.id;
        undoStack=[];
        loadCanvas();
        fields();
        input.value="";
      };
      im.src=evt.target.result;
    };
    reader.readAsDataURL(file);
  }
  function choosePhotoSource(){
    const sheet=document.createElement("div");
    sheet.className="photo-source-sheet";
    sheet.innerHTML='<div class="photo-source-card"><button type="button" data-source="camera">Take new photo</button><button type="button" data-source="library">Choose existing photo</button><button type="button" data-source="cancel">Cancel</button></div>';
    sheet.onclick=e=>{
      const source=e.target?.dataset?.source;
      if(!source)return;
      sheet.remove();
      if(source==="camera")cameraInput.click();
      if(source==="library")photoLibraryInput.click();
    };
    document.body.appendChild(sheet);
  }
  screen.querySelector('[data-action="cameraSketch"]').onclick=choosePhotoSource;
  cameraInput.onchange=e=>addPhotoFile(e.target.files?.[0],cameraInput);
  photoLibraryInput.onchange=e=>addPhotoFile(e.target.files?.[0],photoLibraryInput);
  screen.querySelector('[data-action="markMain"]').onclick=()=>{idea.mainSketchId=idea.sketches[state.editorSketchIndex]?.id;saveCanvas();count()};
  screen.querySelector('[data-action="removeSketch"]').onclick=()=>{if(idea.sketches.length<=1){snapshot();paper();saveCanvas();return}let sk=idea.sketches[state.editorSketchIndex];idea.sketches.splice(state.editorSketchIndex,1);if(idea.mainSketchId===sk.id)idea.mainSketchId=idea.sketches[0]?.id||null;state.editorSketchIndex=Math.max(0,state.editorSketchIndex-1);undoStack=[];loadCanvas();fields()};
  let drawing=false,last=null,timer=null;const p=e=>{let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}};const soon=()=>{clearTimeout(timer);timer=setTimeout(saveCanvas,300)};
  canvas.onpointerdown=e=>{e.preventDefault();snapshot();canvas.setPointerCapture(e.pointerId);drawing=true;last=p(e)};
  canvas.onpointermove=e=>{if(!drawing)return;e.preventDefault();let q=p(e);ctx.strokeStyle="#e83f7c";ctx.lineWidth=Math.max(4,canvas.width/220);ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(q.x,q.y);ctx.stroke();last=q;soon()};
  canvas.onpointerup=canvas.onpointercancel=canvas.onpointerleave=()=>{if(drawing){drawing=false;soon()}};
  requestAnimationFrame(resize)
}
if("serviceWorker"in navigator){addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=108").catch(()=>{}))}
load();renderList();
