const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const API_URL=(window.CLASSCONNECT_CONFIG?.apiUrl||"").trim();
const API_READY=API_URL&&!API_URL.includes("PASTE_YOUR");
const PAGE_SIZE=20;
const WELCOME_SKIP_KEY="cc_skip_intro_until";
let classmates=[],messages=[],filtered=[],page=1,viewMode="list",deferredPrompt=null,profilePhotoData="";

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const initials=name=>String(name||"").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"76";

function enterApp(skipHours=0){
  if(skipHours>0)localStorage.setItem(WELCOME_SKIP_KEY,String(Date.now()+skipHours*60*60*1000));
  $("#introScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
}
function navTo(id){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  $$("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===id));
  $(".sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
function avatar(c,cls="person-avatar"){
  if(/^https?:\/\//i.test(String(c.profilePhoto||""))) return `<div class="${cls}"><img src="${esc(c.profilePhoto)}" alt="${esc(c.name)}"></div>`;
  return `<div class="${cls}">${esc(initials(c.name))}</div>`;
}
function showWelcome(){localStorage.removeItem(WELCOME_SKIP_KEY);$("#appShell").classList.add("hidden");$("#introScreen").classList.remove("hidden");window.scrollTo({top:0})}
function safeBirthday(value){if(!value)return "";const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleDateString(undefined,{month:"long",day:"numeric"})}
function renderDirectory(reset=false){
  if(reset)page=1;
  const q=$("#directorySearch").value.trim().toLowerCase();
  filtered=classmates.filter(c=>[c.name,c.city,c.state,c.career,c.favoriteMemory,c.bio].join(" ").toLowerCase().includes(q));
  const start=(page-1)*PAGE_SIZE;
  const items=filtered.slice(start,start+PAGE_SIZE);
  const d=$("#directoryGrid");
  d.className="directory "+(viewMode==="list"?"list-mode":"grid-mode");
  d.innerHTML=items.map((c,i)=>`<article class="person" id="person-${start+i}">
    <div class="person-summary">
      ${avatar(c)}
      <div class="person-main">
        <h3>${esc(c.name)}</h3>
        <p>📍 ${esc([c.city,c.state].filter(Boolean).join(", ")||"Location not listed")}</p>
        ${c.career?`<p>💼 ${esc(c.career)}</p>`:""}
      </div>
      <button onclick="togglePerson('person-${start+i}')">Read story</button>
    </div>
    <div class="person-details">
      ${c.favoriteMemory?`<div class="memory-quote">${esc(c.favoriteMemory)}</div>`:""}
      <p class="bio-copy">${esc(c.bio||"Their story is waiting to be shared.")}</p>
      ${safeBirthday(c.birthday)?`<p>🎂 ${safeBirthday(c.birthday)}</p>`:""}
      <div class="contacts">
        ${c.showEmail&&c.email?`<a href="mailto:${encodeURIComponent(c.email)}">✉️ Email</a>`:""}
        ${c.showPhone&&c.phone?`<a href="tel:${esc(c.phone)}">📞 Call</a>`:""}
      </div>
    </div>
  </article>`).join("");
  $("#directoryEmpty").hidden=items.length>0;
  renderPagination();
  $("#classmateCount").textContent=classmates.length;
}
window.togglePerson=id=>document.getElementById(id).classList.toggle("open");
function renderPagination(){
  const pages=Math.ceil(filtered.length/PAGE_SIZE);
  $("#pagination").innerHTML=pages<=1?"":Array.from({length:pages},(_,i)=>`<button class="${page===i+1?"active":""}" onclick="goPage(${i+1})">${i+1}</button>`).join("");
}
window.goPage=n=>{page=n;renderDirectory(false);window.scrollTo({top:0,behavior:"smooth"})};

function renderNew(){
  $("#newClassmates").innerHTML=[...classmates].reverse().slice(0,3).map(c=>`
    <div class="new-row">
      ${avatar(c,"initial-avatar")}
      <div>
        <strong>${esc(c.name)}</strong>
        <small>${esc([c.city,c.state].filter(Boolean).join(", ")||"Location not listed")}</small>
        ${c.career?`<small>${esc(c.career)}</small>`:""}
      </div>
    </div>`).join("")||"<p>No classmates yet.</p>";
}
function renderMessages(){
  const list=[...messages].reverse();
  $("#messageFeed").innerHTML=list.map(m=>`<article class="feed-card"><header><strong>${esc(m.author)}</strong><time>${new Date(m.date).toLocaleDateString()}</time></header><p>${esc(m.text)}</p></article>`).join("")||"<p>No messages yet.</p>";
  $("#homeFeed").innerHTML=list.slice(0,3).map(m=>`
    <div class="feed-row">
      <div class="initial-avatar">${esc(initials(m.author))}</div>
      <div><strong>${esc(m.author)}</strong><small>${esc(m.text)}</small></div>
    </div>`).join("")||"<p>No messages yet.</p>";
  $("#messageCount").textContent=messages.length;
}
function renderBirthdays(){
  const month=new Date().getMonth();
  $("#birthdayCount").textContent=classmates.filter(c=>{const d=new Date(c.birthday);return c.birthday&&!Number.isNaN(d.getTime())&&d.getMonth()===month}).length;
}
function toast(t){
  const e=$("#toast");e.textContent=t;e.classList.add("show");
  setTimeout(()=>e.classList.remove("show"),2800);
}
function jsonp(action){
  return new Promise((resolve,reject)=>{
    const cb="cc_"+Date.now()+"_"+Math.floor(Math.random()*9999);
    const s=document.createElement("script");
    const timer=setTimeout(()=>{cleanup();reject(new Error("Timeout"))},12000);
    function cleanup(){clearTimeout(timer);delete window[cb];s.remove()}
    window[cb]=d=>{cleanup();resolve(d)};
    s.onerror=()=>{cleanup();reject(new Error("Load failed"))};
    s.src=API_URL+"?"+new URLSearchParams({action,callback:cb});
    document.body.appendChild(s);
  });
}
async function postData(action,payload){
  await fetch(API_URL,{
    method:"POST",
    mode:"no-cors",
    headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
    body:new URLSearchParams({action,payload:JSON.stringify(payload)})
  });
}
async function loadData(){
  if(!API_READY)return toast("Add your Apps Script URL to config.js.");
  try{
    const[c,m]=await Promise.all([jsonp("getClassmates"),jsonp("getMessages")]);
    classmates=c.items||[];
    messages=m.items||[];
    renderDirectory(true);
    renderNew();
    renderMessages();
    renderBirthdays();
  }catch(e){
    console.error(e);
    toast("Could not load shared data.");
  }
}

$("#enterAppBtn").onclick=()=>enterApp(0);
$("#skipIntroBtn").onclick=()=>enterApp(24);
$("#showWelcomeBtn").onclick=showWelcome;
if(Number(localStorage.getItem(WELCOME_SKIP_KEY)||0)>Date.now())enterApp(0);

$("#menuBtn").onclick=()=>$(".sidebar").classList.toggle("open");
$$("[data-nav]").forEach(b=>b.onclick=()=>navTo(b.dataset.nav));
$$("[data-open]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.open).classList.add("open"));
$$("[data-close]").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("open"));
$$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});

$("#directorySearch").oninput=()=>renderDirectory(true);
$("#globalSearch").oninput=e=>{
  navTo("peopleView");
  $("#directorySearch").value=e.target.value;
  renderDirectory(true);
};
$("#listViewBtn").onclick=()=>{
  viewMode="list";
  $("#listViewBtn").classList.add("active");
  $("#gridViewBtn").classList.remove("active");
  renderDirectory(false);
};
$("#gridViewBtn").onclick=()=>{
  viewMode="grid";
  $("#gridViewBtn").classList.add("active");
  $("#listViewBtn").classList.remove("active");
  renderDirectory(false);
};


async function resizePhoto(file){
  if(!file)return "";
  if(!file.type.startsWith("image/"))throw new Error("Please choose an image file.");
  if(file.size>12*1024*1024)throw new Error("Please choose a photo smaller than 12 MB.");
  const bitmap=await createImageBitmap(file),max=800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return canvas.toDataURL("image/jpeg",.82);
}
$("#profilePhotoInput").onchange=async e=>{try{profilePhotoData=await resizePhoto(e.target.files[0]);$("#photoPreview").innerHTML=profilePhotoData?`<img src="${profilePhotoData}" alt="Profile preview">`:"";$("#photoPreview").classList.toggle("hidden",!profilePhotoData)}catch(error){profilePhotoData="";e.target.value="";$("#photoPreview").classList.add("hidden");toast(error.message)}};

$("#profileForm").onsubmit=async e=>{
  e.preventDefault();
  if(!API_READY)return toast("Connect Apps Script first.");
  const f=new FormData(e.target);
  await postData("addClassmate",{
    name:f.get("name").trim(),
    city:f.get("city").trim(),
    state:f.get("state").trim(),
    birthday:f.get("birthday"),
    career:f.get("career").trim(),
    favoriteMemory:f.get("favoriteMemory").trim(),
    email:f.get("email").trim(),
    phone:f.get("phone").trim(),
    bio:f.get("bio").trim(),
    showEmail:f.get("showEmail")==="on",
    showPhone:f.get("showPhone")==="on",
    profilePhotoData
  });
  e.target.reset();
  profilePhotoData="";
  $("#photoPreview").classList.add("hidden");
  e.target.closest(".modal").classList.remove("open");
  toast("Your story was added.");
  setTimeout(loadData,1200);
};

$("#messageForm").onsubmit=async e=>{
  e.preventDefault();
  if(!API_READY)return toast("Connect Apps Script first.");
  const f=new FormData(e.target);
  await postData("addMessage",{author:f.get("author").trim(),text:f.get("text").trim()});
  e.target.reset();
  e.target.closest(".modal").classList.remove("open");
  toast("Message posted.");
  setTimeout(loadData,1200);
};

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferredPrompt=e;
  $("#installBtn").hidden=false;
});
$("#installBtn").onclick=async()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
    $("#installBtn").hidden=true;
  }
};

const hour=new Date().getHours();
$("#greeting").textContent=hour<12?"GOOD MORNING":hour<18?"WELCOME BACK":"GOOD EVENING";

if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
renderDirectory();
renderMessages();
loadData();