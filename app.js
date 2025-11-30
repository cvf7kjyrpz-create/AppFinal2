// app.js - komplette Logik für die Lager-App

// ---------- Globals ----------
let articles = [];        // Array mit Artikel-Objekten
let editIndex = null;     // Index wenn editieren
let searchColumn = 'name';// Standard-Suchspalte

// ---------- Testartikel (10 Stück) ----------
function generateTestArticles() {
  const names = ["Plüschtier","Puzzle","Bausteine","Actionfigur","Brettspiel","Lernspiel","Helm","Knete","Malkasten","Sandform"];
  const places = ["Berlin","Hamburg","München","Köln","Stuttgart"];
  for (let i = 0; i < 10; i++) {
    const art = {
      nr: String(i+1).padStart(3,'0') + "-" + (new Date().getFullYear()),
      name: names[i % names.length] + " " + (i+1),
      qty: Math.floor(Math.random()*5)+1,
      price: Number((Math.random()*40+5).toFixed(2)),
      where: places[i % places.length],
      date: (("0"+(Math.floor(Math.random()*28)+1)).slice(-2)) + "-" + (("0"+(Math.floor(Math.random()*12)+1)).slice(-2)) + "-" + 2025,
      size: (Math.floor(Math.random()*30)+1) + " cm",
      image: "", // base64 or empty
      note: "Testnotiz " + (i+1),
      marked: false
    };
    articles.push(art);
  }
  saveToStorage();
}

// ---------- Storage ----------
function saveToStorage(){
  try {
    localStorage.setItem('lager_articles_v1', JSON.stringify(articles));
  } catch(e) {
    console.error("LocalStorage save failed:", e);
  }
}
function loadFromStorage(){
  const raw = localStorage.getItem('lager_articles_v1');
  if(raw){
    try {
      articles = JSON.parse(raw);
    } catch(e){
      console.error("Failed parsing stored data:", e);
      articles = [];
    }
  } else {
    articles = [];
  }
}

// ---------- Render Tabelle ----------
function renderTable(){
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  articles.forEach((a, idx) => {
    const tr = document.createElement('tr');

    // compact cells
    tr.innerHTML = `
      <td>${a.nr}</td>
      <td title="${escapeHtml(a.name)}">${a.name}</td>
      <td><input class="table-input" type="number" value="${a.qty}" min="0" onchange="onInlineQtyChange(${idx}, this.value)"></td>
      <td>${a.price.toFixed(2)}</td>
      <td>${a.where}</td>
      <td>${a.date}</td>
      <td>${a.size}</td>
      <td><button onclick="onViewImage(${idx})">${a.image ? '🔍' : '📷'}</button></td>
      <td><button onclick="onViewNote(${idx})">📝</button></td>
      <td><button onclick="onEdit(${idx})">✏️</button></td>
      <td><button onclick="onToggleMark(${idx})">${a.marked ? '⭐' : '☆'}</button></td>
      <td><button onclick="onDelete(${idx})">❌</button></td>
    `;
    if(a.marked) tr.style.background = 'rgba(255,215,0,0.08)';
    tbody.appendChild(tr);
  });
  updateCounters();
}

// ---------- Helpers ----------
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// ---------- Counters ----------
function updateCounters(){
  document.getElementById('countItems').innerText = articles.length;
  const totalQty = articles.reduce((s,a)=>s + (Number(a.qty)||0), 0);
  document.getElementById('countQty').innerText = totalQty;
  const valueNow = articles.reduce((s,a)=>s + (Number(a.qty)||0)*(Number(a.price)||0), 0);
  document.getElementById('valueNow').innerText = valueNow.toFixed(2) + " €";
  // bisher "gesamt" = aktuell
  document.getElementById('valueTotal').innerText = valueNow.toFixed(2) + " €";
}

// ---------- Inline Menge ändern ----------
function onInlineQtyChange(i, val){
  articles[i].qty = Number(val);
  saveToStorage();
  updateCounters();
}

// ---------- Image / Note / Edit / Mark / Delete ----------
function onViewNote(i){
  alert(articles[i].note || 'Keine Notiz');
}

function onViewImage(i){
  if(articles[i].image){
    const w = window.open('');
    const img = w.document.createElement('img');
    img.src = articles[i].image;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    w.document.body.style.background = '#000';
    w.document.body.style.margin = '0';
    w.document.body.appendChild(img);
  } else {
    alert('Kein Bild hinterlegt');
  }
}

function onEdit(i){
  editIndex = i;
  openAddPopup(true);
}

function onToggleMark(i){
  articles[i].marked = !articles[i].marked;
  saveToStorage();
  renderTable();
}

function onDelete(i){
  if(confirm('Artikel wirklich löschen?')){
    articles.splice(i,1);
    saveToStorage();
    renderTable();
  }
}

// ---------- Popups: Add / Search ----------
function openAddPopup(isEdit=false){
  // fill fields
  document.getElementById('popupOverlay').classList.remove('hidden');
  const nr = document.getElementById('addNr');
  const name = document.getElementById('addName');
  const qty = document.getElementById('addQty');
  const price = document.getElementById('addPrice');
  const where = document.getElementById('addWhere');
  const date = document.getElementById('addDate');
  const size = document.getElementById('addSize');
  const note = document.getElementById('addNote');
  const image = document.getElementById('addImage');

  if(isEdit && editIndex !== null){
    const a = articles[editIndex];
    nr.value = a.nr;
    name.value = a.name;
    qty.value = a.qty;
    price.value = a.price;
    where.value = a.where;
    date.value = toInputDate(a.date);
    size.value = a.size;
    note.value = a.note;
    image.value = '';
  } else {
    editIndex = null;
    nr.value = generateNextNr();
    name.value = '';
    qty.value = 1;
    price.value = '';
    where.value = '';
    date.value = '';
    size.value = '';
    note.value = '';
    image.value = '';
  }
}

function closePopup(){
  document.getElementById('popupOverlay').classList.add('hidden');
  editIndex = null;
}

// ---------- Save Article (with optional image reading) ----------
function saveArticle(){
  const nr = document.getElementById('addNr').value.trim();
  const name = document.getElementById('addName').value.trim();
  const qty = Number(document.getElementById('addQty').value) || 0;
  const price = Number(document.getElementById('addPrice').value) || 0;
  const where = document.getElementById('addWhere').value.trim();
  const date = document.getElementById('addDate').value;
  const size = document.getElementById('addSize').value.trim();
  const note = document.getElementById('addNote').value.trim();
  const fileInput = document.getElementById('addImage');

  if(!nr || !name){ alert('Artikelnummer und Name sind Pflicht'); return; }

  function pushArticle(b64){
    const artObj = {
      nr,
      name,
      qty,
      price,
      where,
      date: formatDateDisplay(date),
      size,
      image: b64 || "",
      note,
      marked: false
    };
    if(editIndex !== null){
      articles[editIndex] = artObj;
    } else {
      articles.push(artObj);
    }
    saveToStorage();
    renderTable();
    closePopup();
  }

  if(fileInput.files && fileInput.files[0]){
    const reader = new FileReader();
    reader.onload = function(e){
      pushArticle(e.target.result);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    pushArticle("");
  }
}

// ---------- Generate next article number ----------
function generateNextNr(){
  const year = new Date().getFullYear();
  // find highest numeric prefix
  let maxN = 0;
  articles.forEach(a=>{
    const parts = String(a.nr).split('-');
    const n = parseInt(parts[0],10);
    if(!isNaN(n) && n>maxN) maxN = n;
  });
  return String(maxN+1).padStart(3,'0') + "-" + year;
}

// ---------- Date helpers ----------
function toInputDate(display){ // "DD-MM-YYYY" -> "YYYY-MM-DD"
  if(!display) return '';
  const parts = display.split('-');
  if(parts.length!==3) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
function formatDateDisplay(inputISO){ // "YYYY-MM-DD" -> "DD-MM-YYYY"
  if(!inputISO) return '';
  const d = new Date(inputISO);
  if(isNaN(d)) return '';
  const dd = ("0"+d.getDate()).slice(-2);
  const mm = ("0"+(d.getMonth()+1)).slice(-2);
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ---------- Search Popup ----------
function openSearchPopup(){
  document.getElementById('searchOverlay').classList.remove('hidden');
}
function closeSearchPopup(){
  document.getElementById('searchOverlay').classList.add('hidden');
}
function selectSearchColumn(col){
  // col: 'nr'|'name'|'date'|'size'|'where'
  switch(col){
    case 'nr': searchColumn = 'nr'; break;
    case 'name': searchColumn = 'name'; break;
    case 'date': searchColumn = 'date'; break;
    case 'size': searchColumn = 'size'; break;
    case 'where': searchColumn = 'where'; break;
    default: searchColumn = 'name';
  }
  closeSearchPopup();
  // focus search input so user can type
  const searchInput = document.getElementById('searchOverlay') ? null : null;
  // We'll focus the top search input from index.html (button triggers)
  const searchField = document.getElementById('searchFieldProxy');
  if(searchField) searchField.focus();
  // Instead: prompt user to type in global search prompt:
  const term = prompt("Suchbegriff eingeben für " + searchColumn + ":", "");
  if(term !== null){
    doSearchTerm(term);
  }
}

// The app's UI uses the top "Suchen" button to open the popup; We implement a simpler search input flow:
function doSearchTerm(term){
  const q = String(term).toLowerCase();
  const tbody = document.getElementById('tableBody');
  Array.from(tbody.children).forEach((tr, i) => {
    const a = articles[i];
    let value = '';
    switch(searchColumn){
      case 'nr': value = a.nr; break;
      case 'name': value = a.name; break;
      case 'date': value = a.date; break;
      case 'size': value = a.size; break;
      case 'where': value = a.where; break;
      default: value = a.name;
    }
    tr.style.display = String(value).toLowerCase().includes(q) ? '' : 'none';
  });
}

// ---------- Export / Import / PDF ----------
function exportBackup(){
  try {
    const blob = new Blob([JSON.stringify(articles)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lager_backup.json';
    a.click();
  } catch(e) {
    alert('Export fehlgeschlagen: ' + e);
  }
}

function importBackup(){
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = e => {
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if(Array.isArray(data)){
          articles = data;
          saveToStorage();
          renderTable();
        } else alert('Datei enthält keine gültige Liste');
      } catch(err) {
        alert('Fehler beim Einlesen: ' + err);
      }
    };
    reader.readAsText(f);
  };
  inp.click();
}

function generatePDF(){
  // simple TSV export for Numbers/Excel
  let tsv = 'ArtNr\tName\tMenge\tNotiz\n';
  articles.forEach(a=>{
    tsv += `${a.nr}\t${a.name}\t${a.qty || a.qty === 0 ? a.qty : a.qty}\t${(a.note||'')}\n`;
  });
  const blob = new Blob([tsv], {type: 'text/tab-separated-values'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'inventur.tsv';
  link.click();
}

// ---------- Smooth, axis-locked touch scrolling & auto table top ----------
function adjustTableOffsetAuto(){
  const table = document.getElementById('tableContainer');
  // find the element directly above tableContainer (previousElementSibling)
  // in our index.html, topArea sits above tableContainer inside #appContainer
  const appContainer = document.getElementById('appContainer');
  // find topArea by measuring children above tableContainer
  const topArea = document.getElementById('topArea');
  if(topArea && table){
    const h = topArea.getBoundingClientRect().height;
    table.style.top = h + 'px';
  }
}

// axis-locked touch scrolling
function initTouchLocking(){
  const container = document.getElementById('tableContainer');
  if(!container) return;
  let startX = 0, startY = 0, lock = null;

  container.addEventListener('touchstart', function(e){
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    lock = null;
  }, {passive:true});

  container.addEventListener('touchmove', function(e){
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startX);
    const dy = Math.abs(t.clientY - startY);

    if(lock === null){
      lock = dy > dx ? 'vertical' : 'horizontal';
    }

    if(lock === 'vertical'){
      // allow vertical: scrollTop adjust, prevent horizontal movement
      container.scrollTop += (startY - t.clientY);
      startY = t.clientY;
      // prevent default to avoid diagonal/native interfering
      e.preventDefault();
    } else {
      // allow horizontal: scrollLeft adjust
      container.scrollLeft += (startX - t.clientX);
      startX = t.clientX;
      e.preventDefault();
    }
  }, {passive:false});
}

// ---------- Utilities ----------
function bindUI(){
  // wire top buttons that exist in index.html (#buttonRow used earlier)
  // The index.html buttons already use inline onclicks; nothing else to bind here.
  // But we bind resize/load events:
  window.addEventListener('resize', adjustTableOffsetAuto);
  window.addEventListener('load', adjustTableOffsetAuto);
  // init touch-lock
  initTouchLocking();
}

// ---------- Init ----------
function initApp(){
  loadFromStorage();
  if(!articles || articles.length === 0){
    generateTestArticles(); // creates and saves 10 test items
  }
  renderTable();
  bindUI();
}

// Start
initApp();

// Expose some functions to global scope for inline onclicks
window.openAddPopup = openAddPopup;
window.closePopup = closePopup;
window.saveArticle = saveArticle;
window.openSearchPopup = openSearchPopup;
window.closeSearchPopup = closeSearchPopup;
window.selectSearchColumn = selectSearchColumn;
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.generatePDF = generatePDF;

// small helpers referenced by HTML inline buttons for view/edit etc.
window.onViewImage = onViewImage;
window.onViewNote = onViewNote;
window.onEdit = onEdit;
window.onToggleMark = onToggleMark;
window.onDelete = onDelete;
window.onInlineQtyChange = onInlineQtyChange;
