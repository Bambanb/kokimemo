/** ========= 設定 ========= */
const CONFIG = {
  showMemosOnTop: true,
  autosaveMs: 600,
  storageKey: "memoTreeV2_notaUI"
};

/** ========= データ ========= */
function newNode(){ return { folders:{}, memos:{} }; }
function now(){ return Date.now(); }
function uid(){ return "m_" + Math.random().toString(36).slice(2) + "_" + now().toString(36); }

const TAGS = ["健全", "R18", "完成", "未完成", "短編", "長編", "プロット", "メモ"];

let root = load() || newNode();
let path = [];
let editingId = null;
let autosaveTimer = null;
let selectedTags = [];
let sortMode = "updatedDesc";

const el = (id)=>document.getElementById(id);

function load(){
  try{
    const s = localStorage.getItem(CONFIG.storageKey);
    if(!s) return null;
    return JSON.parse(s);
  }catch(e){ return null; }
}
function persist(){
  try{
    localStorage.setItem(CONFIG.storageKey+"_bak", JSON.stringify(root));
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(root));
  }catch(e){
    alert("保存出来ませんでした");
  }
}
function getNode(p = path){
  let node = root;
  for(const name of p){
    if(!node.folders[name]) node.folders[name] = newNode();
    node = node.folders[name];
  }
  return node;
}
function getParentNode(){
  return getNode(path.slice(0, -1));
}
function folderCharSum(node){
  let sum = 0;
  for(const id in node.memos){
    sum += (node.memos[id].text || "").length;
  }
  for(const fname in node.folders){
    sum += folderCharSum(node.folders[fname]);
  }
  return sum;
}
function setCrumb(){
  el("headTitle").textContent = path.length ? path[path.length-1] : t("ホーム");
  el("breadcrumb").textContent = "/" + path.join("/");
  el("backBtn").disabled = path.length === 0;
}

function sortMemos(memos){
  const withOrder = memos.filter(m => m.sortOrder !== undefined);
  const withoutOrder = memos.filter(m => m.sortOrder === undefined);
  
  if(sortMode === "manual"){
    withOrder.sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));
    withoutOrder.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    return [...withOrder, ...withoutOrder];
  }
  
  const all = [...memos];
  
  switch(sortMode){
    case "updatedDesc":
      return all.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    case "updatedAsc":
      return all.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0));
    case "lengthDesc":
      return all.sort((a,b) => (b.text||"").length - (a.text||"").length);
    case "lengthAsc":
      return all.sort((a,b) => (a.text||"").length - (b.text||"").length);
    case "titleAsc":
      return all.sort((a,b) => (a.title||"").localeCompare(b.title||"", "ja"));
    case "titleDesc":
      return all.sort((a,b) => (b.title||"").localeCompare(a.title||"", "ja"));
    default:
      return all.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  }
}

function render(){
  setCrumb();
  const node = getNode();
  const q = (el("qInput").value || "").trim().toLowerCase();

  // folders
  const folders = Object.keys(node.folders).sort((a,b)=>a.localeCompare(b,"ja"));
  const foldersList = el("foldersList");
  foldersList.innerHTML = "";
  let folderShown = 0;
  
  for(const name of folders){
    if(q){
      const sub = node.folders[name];
      const hit = hasHitInFolder(sub, q);
      if(!hit) continue;
    }
    folderShown++;

    const sub = node.folders[name];
    const memoCount = Object.keys(sub.memos).length;
    const charSum = folderCharSum(sub);

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="left" style="min-width:0">
        <div class="ico"></div>
        <div class="name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      </div>
      <div class="meta">
        <span>〆 ${memoCount}</span>
        <span>✔ ${charSum}</span>
        <span class="arrow">›</span>
      </div>
    `;
    
    // menuShownをループ内で定義
    let pressTimer;
    let menuShown = false;

    const showFolderMenu = async ()=>{
      if(menuShown) return;
      menuShown = true;
      
      const choice = await showDialog(
        name,
        t("操作を選んでください"),
        [
          { text: t("改名"), value: "rename" },
          { text: t("並替"), value: "sort" },
          { text: t("戻る"), value: "cancel" },
          { text: t("削除"), value: "delete", danger: true }
        ]
      );
      
      menuShown = false;
      
      if(choice === "rename"){
        const nu = await showInputDialog(t("フォルダ名を変更します"), t("新しいフォルダ名"), name);
        if(!nu || nu === name) return;
        const node = getNode();
        if(node.folders[nu]){ alert(t("同名フォルダがあります")); return;
          
        }
        node.folders[nu] = node.folders[name];
        delete node.folders[name];
        persist();
        render();
      } else if(choice === "sort"){
        await showFolderSortMenu(name);
      } else if(choice === "delete"){
        await deleteFolder(name);
      }
    };

    div.addEventListener("touchstart", (e)=>{
      menuShown = false;
      pressTimer = setTimeout(showFolderMenu, 500);
    });

    div.addEventListener("touchend", ()=>{
      clearTimeout(pressTimer);
    });

    div.addEventListener("touchcancel", ()=>{
      clearTimeout(pressTimer);
    });

    div.addEventListener("click", ()=>{
      if(!menuShown){
        path.push(name);
        render();
      }
    });
    
    foldersList.appendChild(div);
  }
  el("foldersEmpty").style.display = folderShown ? "none" : "block";

  // memos
  el("memosPanel").style.display = CONFIG.showMemosOnTop ? "block" : "none";
  if(CONFIG.showMemosOnTop){
    let memos = Object.values(node.memos);
    
    if(q){
      memos = memos.filter(m => {
        const titleLower = (m.title||"").toLowerCase();
        const x = (m.text||"").toLowerCase();
        return titleLower.includes(q) || x.includes(q);
      });
    }
    
    if(selectedTags.length > 0){
      memos = memos.filter(m => {
        if(!m.tags) m.tags = [];
        return selectedTags.some(tag => m.tags.includes(tag));
      });
    }
    
    memos = sortMemos(memos);
    
    const memosList = el("memosList");
    memosList.innerHTML = "";
    let memoShown = memos.length;

    for(const m of memos){
      const preview = (m.text||"").replace(/\s+/g," ").slice(0,30);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="left" style="min-width:0">
          <div class="ico"></div>
          <div style="min-width:0">
            <div class="name" title="${escapeHtml(m.title||"(無題)")}">${escapeHtml(m.title||"(無題)")}</div>
            <div class="hint" style="margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:52vw;">
              ${escapeHtml(preview)}
            </div>
          </div>
        </div>
        <div class="meta">
          <span>${(m.text||"").length}${t("字")}</span>
          <span class="arrow">›</span>
        </div>
      `;

let shortPressTimer;
      let longPressTimer;
      let menuShown = false;
      
      const showNormalMenu = async ()=>{
        if(menuShown) return;
        menuShown = true;
        
        const buttons = [
          { text: t("複製"), value: "duplicate" },
          { text: t("並替"), value: "sort" },
          { text: t("戻る"), value: "cancel" },
          { text: t("削除"), value: "delete", danger: true }
        ];
        
        const choice = await showDialog(
          m.title || t("(無題)"),
          t("操作を選んでください"),
          buttons
        );
        
        menuShown = false;
        
        if(choice === "duplicate"){
          duplicateMemo(m.id);
        } else if(choice === "delete"){
          await deleteMemo(m.id);
        } else if(choice === "sort"){
          await showMemoSortMenu(m.id);
        }
      };
      
      const showKillMenu = async ()=>{
        if(menuShown) return;
        menuShown = true;
        
        const choice = await showDialog(
          m.title || t("(無題)"),
          t("操作を選んでください"),
          [
            { text: t("戻る"), value: "cancel" },
            { text: t("削除"), value: "delete", danger: true }
          ]
        );

menuShown = false;
        
        if(choice === "delete"){
          await deleteMemo(m.id);
        }
      };
      
      div.addEventListener("touchstart", (e)=>{
        menuShown = false;
        shortPressTimer = setTimeout(showNormalMenu, 500);
        longPressTimer = setTimeout(showKillMenu, 1500);
      });
      
      div.addEventListener("touchend", ()=>{
        clearTimeout(shortPressTimer);
        clearTimeout(longPressTimer);
      });
      
      div.addEventListener("touchcancel", ()=>{
        clearTimeout(shortPressTimer);
        clearTimeout(longPressTimer);
      });
      
      div.addEventListener("click", (e)=>{
        if(!menuShown){
          openEditor(m.id);
        }
      });
      
      memosList.appendChild(div);
    }
    el("memosEmpty").style.display = memoShown ? "none" : "block";
  }
  
  renderTagFilter();
}

async function showFolderSortMenu(folderName){
  return new Promise((resolve)=>{
    const dialog = el("customDialog");
    const dialogTitle = el("dialogTitle");
    const dialogMessage = el("dialogMessage");
    const dialogButtons = el("dialogButtons");

    dialogTitle.textContent = t("並替");
    dialogMessage.textContent = t("並び順を選んでください");
    dialogButtons.innerHTML = "";

dialogButtons.style.flexDirection = "column";
    dialogButtons.style.gap = "8px";

    const options = [
      { text: t("更新日時(新→古)"), value: "updatedDesc" },
      { text: t("更新日時(古→新)"), value: "updatedAsc" },
      { text: t("文字数(多→少)"), value: "lengthDesc" },
      { text: t("文字数(少→多)"), value: "lengthAsc" },
      { text: t("タイトル(あいうえお)"), value: "titleAsc" },
      { text: t("タイトル(逆順)"), value: "titleDesc" },
      { text: t("一番上へ"), value: "top" },
      { text: t("ひとつ上"), value: "up" },
      { text: t("ひとつ下"), value: "down" },
      { text: t("一番下へ"), value: "bottom" },
      { text: t("戻る"), value: "cancel" }
    ];

    options.forEach(opt=>{
      const button = document.createElement("button");
      button.className = "btn";
      button.textContent = opt.text;
      button.style.width = "100%";
      button.addEventListener("click", ()=>{
        dialog.style.display = "none";
        dialogButtons.style.flexDirection = "";
        dialogButtons.style.gap = "";
        
        if(opt.value !== "cancel"){
          if(opt.value.startsWith("updated") || opt.value.startsWith("length") || opt.value.startsWith("title")){
            sortMode = opt.value;
            render();
          } else {
            reorderFolder(folderName, opt.value);
          }
        }
        resolve();
      });
      dialogButtons.appendChild(button);
    });

    dialog.style.display = "flex";
  });
}

async function showMemoSortMenu(memoId){
return new Promise((resolve)=>{
    const dialog = el("customDialog");
    const dialogTitle = el("dialogTitle");
    const dialogMessage = el("dialogMessage");
    const dialogButtons = el("dialogButtons");

    dialogTitle.textContent = t("並替");
    dialogMessage.textContent = t("並び順を選んでください");
    dialogButtons.innerHTML = "";
    
    dialogButtons.style.flexDirection = "column";
    dialogButtons.style.gap = "8px";

    const options = [
      { text: t("更新日時(新→古)"), value: "updatedDesc" },
      { text: t("更新日時(古→新)"), value: "updatedAsc" },
      { text: t("文字数(多→少)"), value: "lengthDesc" },
      { text: t("文字数(少→多)"), value: "lengthAsc" },
      { text: t("タイトル(あいうえお)"), value: "titleAsc" },
      { text: t("タイトル(逆順)"), value: "titleDesc" },
      { text: t("一番上へ"), value: "top" },
      { text: t("ひとつ上"), value: "up" },
      { text: t("ひとつ下"), value: "down" },
      { text: t("一番下へ"), value: "bottom" },
      { text: t("戻る"), value: "cancel" }
    ];

    options.forEach(opt=>{
      const button = document.createElement("button");
      button.className = "btn";
      button.textContent = opt.text;
      button.style.width = "100%";
      button.addEventListener("click", ()=>{
        dialog.style.display = "none";
        dialogButtons.style.flexDirection = "";
        dialogButtons.style.gap = "";
        
        if(opt.value !== "cancel"){
          if(opt.value.startsWith("updated") || opt.value.startsWith("length") || opt.value.startsWith("title")){
            sortMode = opt.value;
            render();
          } else {
            reorderMemo(memoId, opt.value);
          }
        }
        resolve();
 });
      dialogButtons.appendChild(button);
    });

    dialog.style.display = "flex";
  });
}

function reorderFolder(folderName, direction){
  // フォルダの並び替えは名前順固定なので何もしない
  alert("フォルダは名前順で固定です");
}

function reorderMemo(memoId, direction){
  const node = getNode();
  const memos = Object.values(node.memos);
  
  memos.forEach((m, idx) => {
    if(m.sortOrder === undefined){
      m.sortOrder = idx;
    }
  });
  
  const targetMemo = node.memos[memoId];
  if(!targetMemo) return;
  
  sortMode = "manual";
  const sorted = sortMemos(memos);
  const currentIndex = sorted.findIndex(m => m.id === memoId);
  
  if(currentIndex === -1) return;
  
  switch(direction){
    case "top":
      targetMemo.sortOrder = (sorted[0].sortOrder || 0) - 1;
      break;
    case "up":
      if(currentIndex > 0){
        const prevMemo = sorted[currentIndex - 1];
        const temp = targetMemo.sortOrder;
        targetMemo.sortOrder = prevMemo.sortOrder;
        prevMemo.sortOrder = temp;
      }
break;
    case "down":
      if(currentIndex < sorted.length - 1){
        const nextMemo = sorted[currentIndex + 1];
        const temp = targetMemo.sortOrder;
        targetMemo.sortOrder = nextMemo.sortOrder;
        nextMemo.sortOrder = temp;
      }
      break;
    case "bottom":
      targetMemo.sortOrder = (sorted[sorted.length - 1].sortOrder || 0) + 1;
      break;
  }
  
  persist();
  render();
}

function exportMemos(){
  const node = getNode();
  const memos = Object.values(node.memos);
  
  const filtered = memos.filter(m=>{
    if(!m.tags) return false;
    return selectedTags.some(tag => m.tags.includes(tag));
  });
  
  if(filtered.length === 0){
    alert(t("エクスポートするメモがありません"));
    return;
  }
  
  let text = "";
  filtered.forEach((m, i)=>{
    text += `========== ${m.title || "(無題)"} ==========\n\n`;
    text += m.text + "\n\n";
    if(i < filtered.length - 1) text += "\n";
  });
  
  const date = new Date().toISOString().split('T')[0];
const filename = `SS_text_${date}.txt`;
  const blob = new Blob([text], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hasHitInFolder(node, q){
  for(const id in node.memos){
    const m = node.memos[id];
    const titleLower = (m.title||"").toLowerCase();
    const x = (m.text||"").toLowerCase();
    if(titleLower.includes(q) || x.includes(q)) return true;
  }
  for(const name in node.folders){
    if(hasHitInFolder(node.folders[name], q)) return true;
  }
  return false;
}

function escapeHtml(s){
  return (s??"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

function goUp(){
  if(path.length>0){ path.pop(); render(); }
}

async function addFolder(){
  const name = await showInputDialog(t("新規フォルダを作成します"), t("新規フォルダ名"));
  if(!name) return;
const node = getNode();
  if(node.folders[name]){ alert(t("同名フォルダがあります")); return; }
  node.folders[name] = newNode();
  persist();
  render();
}

function addMemo(){
  const node = getNode();
  const id = uid();
  node.memos[id] = { id, title:"", text:"", updatedAt: now(), tags:[], history:[] };
  persist();
  openEditor(id);
}

async function renameCurrentFolder(){
  if(path.length===0){ alert(t("ホームは変更出来ません")); return; }
  const parent = getParentNode();
  const old = path[path.length-1];
  const nu = await showInputDialog(t("フォルダ名を変更します"), t("新しいフォルダ名"), old);
  if(!nu || nu===old) return;
  if(parent.folders[nu]){ alert(t("同名フォルダがあります")); return; }
  parent.folders[nu] = parent.folders[old];
  delete parent.folders[old];
  path[path.length-1] = nu;
  persist();
  render();
}

async function deleteCurrentFolder(){
  if(path.length===0){ alert(t("ホームは削除出来ません")); return; }
  const parent = getParentNode();
  const name = path[path.length-1];
  const ok = await showDialog(
name,
    t("フォルダを削除しますか？"),
    [
      { text: t("戻る"), value: false },
      { text: t("削除"), value: true, danger: true }
    ]
  );
  if(!ok) return;
  delete parent.folders[name];
  path.pop();
  persist();
  render();
}

async function deleteMemo(id){
  const node = getNode();
  const m = node.memos[id];
  if(!m){ alert(t("メモが見付かりません")); return; }
  
  const ok = await showDialog(
    m.title || t("(無題)"),
    t("メモを削除しますか？"),
    [
      { text: t("戻る"), value: false },
      { text: t("削除"), value: true, danger: true }
    ]
  );
  if(!ok) return;
  delete node.memos[id];
  persist();
  render();
}

async function deleteFolder(name){
  const node = getNode();
  if(!node.folders[name]) return;
  
  const ok = await showDialog(
    name,
    t("フォルダを削除しますか？"),
    [
      { text: t("戻る"), value: false },
      { text: t("削除"), value: true, danger: true }
    ]
  );
  if(!ok) return;
  delete node.folders[name];
  persist();
  render();
}

function duplicateMemo(id){
  const node = getNode();
  const m = node.memos[id];
  if(!m){ alert(t("メモが見付かりません")); return; }
  
  let newTitle = m.title || "";
  const match = newTitle.match(/^(.+?)_(\d+)$/);
  if(match){
    newTitle = match[1] + "_" + (parseInt(match[2]) + 1);
  } else {
    newTitle = newTitle + "_2";
  }

  const newId = uid();
  node.memos[newId] = {
    id: newId,
    title: newTitle,
    text: m.text,
    updatedAt: now(),
    tags: [...(m.tags || [])],
    sortOrder: m.sortOrder
  };
  persist();
  render();
}

function openEditor(id){
  editingId = id;
  const node = getNode();
  const m = node.memos[id];
  if(!m){ alert(t("メモが見付かりません")); return; }
  
  el("titleInput").value = m.title || "";
  el("bodyInput").value = m.text || "";
  updateCharCount();
  
  renderTagSelector(m);

  el("editorView").style.display = "flex";

  clearInterval(autosaveTimer);
  autosaveTimer = setInterval(()=>saveMemo(true), CONFIG.autosaveMs);
  setTimeout(()=>el("bodyInput").focus(), 60);
}

function closeEditor(){
  saveMemo(true);
  clearInterval(autosaveTimer);
  autosaveTimer = null;
  el("editorView").style.display = "none";
  editingId = null;
  render();
}

function updateCharCount(){
  el("charCount").textContent = "文字数 " + (el("bodyInput").value || "").length;
}

function showSaving(){
  const status = el("saveStatus");
  if(status) status.textContent = t("保存中");
}

function showSaved(){
  const status = el("saveStatus");
  if(status) status.textContent = t("保存済み");
}

function renderTagSelector(m){
  const selector = el("tagSelector");
  if(!selector) return;
  selector.innerHTML = "";
  
  if(!m.tags) m.tags = [];
  
  TAGS.forEach(tag=>{
    const span = document.createElement("span");
    span.className = "tag";
    if(m.tags.includes(tag)) span.classList.add("selected");
    span.textContent = tag;
    span.addEventListener("click", ()=>{
      toggleTag(m, tag);
      renderTagSelector(m);
      saveMemo(true);
    });
    selector.appendChild(span);
  });
}

function toggleTag(m, tag){
  if(!m.tags) m.tags = [];
  const idx = m.tags.indexOf(tag);
  if(idx >= 0){
    m.tags.splice(idx, 1);
  } else {
    m.tags.push(tag);
  }
}

function renderTagFilter(){
  const filter = el("tagFilter");
  if(!filter) return;
  filter.innerHTML = "";

TAGS.forEach(tag=>{
    const span = document.createElement("span");
    span.className = "tag";
    if(selectedTags.includes(tag)) span.classList.add("active");
    span.textContent = tag;
    span.addEventListener("click", ()=>{
      const idx = selectedTags.indexOf(tag);
      if(idx >= 0){
        selectedTags.splice(idx, 1);
      } else {
        selectedTags.push(tag);
      }
      renderTagFilter();
      render();
    });
    filter.appendChild(span);
  });

  const exportBtn = el("exportBtn");
  if(exportBtn){
    exportBtn.style.display = selectedTags.length > 0 ? "block" : "none";
  }
}

function showDialog(title, message, buttons){
  return new Promise((resolve)=>{
    const dialog = el("customDialog");
    const dialogTitle = el("dialogTitle");
    const dialogMessage = el("dialogMessage");
    const dialogButtons = el("dialogButtons");

    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogButtons.innerHTML = "";

    buttons.forEach(btn=>{
      const button = document.createElement("button");
      button.className = btn.danger ? "btn danger" : "btn";
      button.textContent = btn.text;
      button.addEventListener("click", ()=>{
        dialog.style.display = "none";
        resolve(btn.value);
      });
dialogButtons.appendChild(button);
    });

    dialog.style.display = "flex";
  });
}

function saveMemo(silent=false){
  if(!editingId) return;
  const node = getNode();
  const m = node.memos[editingId];
  if(!m) return;

  m.title = el("titleInput").value || "";
  m.text  = el("bodyInput").value || "";
  m.updatedAt = now();

  persist();
  showSaved();
  if(!silent) render();
}

function showInputDialog(title, message, defaultValue = ""){
  return new Promise((resolve)=>{
    const dialog = el("customDialog");
    const dialogTitle = el("dialogTitle");
    const dialogMessage = el("dialogMessage");
    const dialogInput = el("dialogInput");
    const dialogButtons = el("dialogButtons");

    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogInput.style.display = "block";
    dialogInput.value = defaultValue;
    dialogButtons.innerHTML = "";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = t("キャンセル");
    cancelBtn.addEventListener("click", ()=>{
      dialog.style.display = "none";
      dialogInput.style.display = "none";
      resolve(null);
    });

    const okBtn = document.createElement("button");
 okBtn.className = "btn accent";
    okBtn.textContent = t("OK");
    okBtn.addEventListener("click", ()=>{
      const value = dialogInput.value.trim();
      dialog.style.display = "none";
      dialogInput.style.display = "none";
      resolve(value || null);
    });

    dialogButtons.appendChild(cancelBtn);
    dialogButtons.appendChild(okBtn);

    dialog.style.display = "flex";
    setTimeout(()=>dialogInput.focus(), 100);
  });
}

function saveHistory(){
  if(!editingId) return;
  const node = getNode();
  const m = node.memos[editingId];
  if(!m) return;
  
  if(!m.history) m.history = [];
  
  const snapshot = {
    title: m.title,
    text: m.text,
    savedAt: now()
  };
  
  m.history.push(snapshot);
  
  if(m.history.length > 10){
    m.history.shift();
  }
  
  persist();
  alert(t("バックアップしました"));
}

async function showHistory(){
  if(!editingId) return;
  const node = getNode();
  const m = node.memos[editingId];
  if(!m || !m.history || m.history.length === 0){
alert(t("履歴がありません"));
    return;
  }
  
  const buttons = m.history.map((h, idx)=>{
    const date = new Date(h.savedAt);
    const dateStr = date.toLocaleString("ja-JP");
    return {
      text: `${idx+1}. ${dateStr} (${h.text.length}文字)`,
      value: idx
    };
  }).reverse();
  
  buttons.push({ text: t("戻る"), value: -1 });
  
  const choice = await showDialog(
    t("履歴から復元"),
    t("復元するメモを選んでください"),
    buttons
  );
  
  if(choice >= 0){
    const h = m.history[choice];
    el("titleInput").value = h.title;
    el("bodyInput").value = h.text;
    updateCharCount();
    saveMemo(true);
    alert(t("復元しました"));
  }
}

el("backBtn")?.addEventListener("click", goUp);
el("addFolderBtn")?.addEventListener("click", addFolder);
el("addMemoBtn")?.addEventListener("click", addMemo);

el("closeEditorBtn")?.addEventListener("click", closeEditor);
el("backToListBtn")?.addEventListener("click", closeEditor);
el("qInput")?.addEventListener("input", ()=>render());
el("titleInput")?.addEventListener("input", showSaving);
el("bodyInput")?.addEventListener("input", ()=>{ updateCharCount(); showSaving(); });

el("exportBtn")?.addEventListener("click", exportMemos);

el("saveHistoryBtn")?.addEventListener("click", saveHistory);
el("showHistoryBtn")?.addEventListener("click", showHistory);

const MODE_KEY = "memoTree_mode_kouki";
let koukiMode = localStorage.getItem(MODE_KEY) === "1";

const DICT_NORMAL = {};
const DICT_KOUKI = {
  "ホーム":"解体現場",
  "保存":"処理完了",
  "戻る":"退く",
  "取消":"見逃す",
  "決定":"嬲り殺す",
  "閉じる":"撤収",
  "検索":"索敵",
  "フォルダ名変更":"標的変更",
  "フォルダ名を変更します":"解体し直す",
  "新規フォルダを作成します":"息の根を止める",
  "削除":"屠る",
  "フォルダ":"獲物",
  "新しいフォルダ名":"気が変わった",
  "メモ":"肉片",
  "フォルダなし":"欠品中",
  "メモなし":"空腹",
  "＋メモ":"＋解体",
  "＋フォルダ":"＋仕留める",
  "文字数":"重量",
  "タイトル":"味付け",
  "ここに本文を書く。":"解体ショーの始まりだ",
  "タイトル/本文の一部（任意）":"索敵（照準を合わせる）",
  "(無題)":"(無味)",
  "名前を変更":"風味を調整",
  "名前を変更しました":"味を調整した",
  "上書きしました":"仕込み完了だ",
  "変更が競合しています":"オーダーが重複した",
  "保存中":"俺の獲物だ",
  "保存済み":"熟成させる",
  "フォルダ名":"獲物名",
  "＋エクスポート":"＋納品",
  "新規フォルダ名":"血祭りに上げてやる",
  "メモを削除しますか?":"生贄はこいつか？",
  "フォルダを削除しますか？":"皆殺しだ",
  "本当に削除しますか？":"覚悟は出来てるんだろうな？",
  "保存出来ませんでした":"熟成が足りねえ",
  "同名フォルダがあります":"弱肉強食だ",
  "エクスポートするメモがありません":"納品する肉片がねえ",
  "ホームは変更出来ません":"縄張りを荒らすな",
  "ホームは削除出来ません":"生きて帰れると思うな",
  "メモが見付かりません":"仕入れ前だ",
  "複製":"裂く",
  "字":"kg",
  "操作を選んでください":"お前が選べ",
  "履歴":"残骸",
  "バックアップ":"冷蔵",
  "バックアップしました":"冷蔵保管完了",
"履歴がありません":"捌いた記憶はねえ",
  "履歴から復元":"過去の獲物",
  "復元するメモを選んでください":"どの獲物が目的だ？",
  "復元しました":"取引成立だ",
  "このページの内容":"身の程を弁えろ",
  "キャンセル":"断る",
  "OK":"上等だ",
  "並び替え":"刺す",
  "並び順を選んでください":"さっさとやれ",
  "更新日時(新→古)":"鮮度順(新鮮→腐敗)",
  "更新日時(古→新)":"鮮度順(腐敗→新鮮)",
  "文字数(多→少)":"重量順(重→軽)",
  "文字数(少→多)":"重量順(軽→重)",
  "タイトル(あいうえお)":"産地順(あいうえお)",
  "タイトル(逆順)":"産地順(逆順)",
  "手動":"俺に指図するな",
  "一番上へ":"晒す",
  "ひとつ上":"吊るす",
  "ひとつ下":"沈める",
  "一番下へ":"埋める",
  "改名":"調整",
};

function dict(){
  return koukiMode ? DICT_KOUKI : DICT_NORMAL;
}
function t(s){
  const d = dict();
  return d[s] ?? s;
}

function toggleMode(){
  koukiMode = !koukiMode;
  localStorage.setItem(MODE_KEY, koukiMode ? "1" : "0");
  renderModeBtn();
  applyDict();
  render();
}

function applyDict(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-ph]").forEach(el=>{
    const key = el.getAttribute("data-ph");
    el.setAttribute("placeholder", t(key));
  });
document.querySelectorAll("[data-i18n-title]").forEach(el=>{
    const key = el.getAttribute("data-i18n-title");
    el.setAttribute("title", t(key));
  });
}

function renderModeBtn(){
  const btn = el("modeBtn");
  if(btn){
    btn.textContent = koukiMode ? "皇" : "待";
    btn.title = koukiMode ? "通常モードへ" : "皇紀モードへ";
  }
}

if(el("modeBtn")) el("modeBtn").addEventListener("click", toggleMode);

renderModeBtn();
applyDict();
render();
