const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const API_URL=(window.CLASSCONNECT_CONFIG?.apiUrl||"").trim();
const API_READY=API_URL && !API_URL.includes("PASTE_YOUR");
let classmates=[],messages=[],deferredPrompt=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function greeting(){
  const h=new Date().getHours();
  $("#greeting").textContent=h<12?"GOOD MORNING":"WELCOME HOME";
}

function enterApp(skip=false){
  if(skip) localStorage.setItem("cc_skip_intro","true");
  $("#introScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
}

function navTo(id){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.nav===id));
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderDirectory(filter=""){
  const q=filter.trim().toLowerCase();
  const list=classmates.filter(c=>[c.name,c.city,c.state].join(" ").toLowerCase().includes(q));
  $("#directoryGrid").innerHTML=list.map(c=>`
    <article class="yearbook-card">
      <div class="portrait-placeholder">🎓</div>
      <div class="yearbook-copy">
        <h3>${esc(c.name)}</h3>
        <p class="location">📍 ${esc([c.city,c.state].filter(Boolean).join(", ")||"Location not listed")}</p>
        <p>${esc(c.bio||"Their story is waiting to be shared.")}</p>
        <div class="contacts">
          ${c.showEmail&&c.email?`<a href="mailto:${encodeURIComponent(c.email)}">✉️ Email</a>`:""}
          ${c.showPhone&&c.phone?`<a href="tel:${esc(c.phone)}">📞 Call</a>`:""}
        </div>
      </div>
    </article>`).join("");
  $("#directoryEmpty").hidden=list.length>0;
  $("#classmateCount").textContent=classmates.length;
}

function renderMessages(){
  const list=[...messages].reverse();
  $("#messageFeed").innerHTML=list.map(m=>`
    <article class="feed-post">
      <header><strong>${esc(m.author)}</strong><time>${new Date(m.date).toLocaleDateString()}</time></header>
      <p>${esc(m.text)}</p>
    </article>`).join("")||"<p>No approved messages yet.</p>";
  $("#homeFeed").innerHTML=list.slice(0,3).map(m=>`
    <article class="home-post"><strong>${esc(m.author)}</strong><p>${esc(m.text)}</p></article>`).join("")||"<p>No approved messages yet.</p>";
  $("#messageCount").textContent=messages.length;
}

function toast(text){
  const t=$("#toast");t.textContent=text;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),3000);
}

function jsonp(action,params={}){
  return new Promise((resolve,reject)=>{
    const cb="cc_"+Date.now()+"_"+Math.floor(Math.random()*10000);
    const script=document.createElement("script");
    const timer=setTimeout(()=>{cleanup();reject(new Error("Timeout"));},12000);
    function cleanup(){clearTimeout(timer);delete window[cb];script.remove();}
    window[cb]=data=>{cleanup();resolve(data)};
    script.onerror=()=>{cleanup();reject(new Error("Load failed"))};
    script.src=API_URL+"?"+new URLSearchParams({action,callback:cb,...params});
    document.body.appendChild(script);
  });
}

async function postData(action,payload){
  const body=new URLSearchParams({action,payload:JSON.stringify(payload)});
  await fetch(API_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body});
}

async function loadData(){
  if(!API_READY){toast("Add your Apps Script URL to config.js.");return;}
  try{
    const [c,m]=await Promise.all([jsonp("getClassmates"),jsonp("getMessages")]);
    classmates=c.items||[];
    messages=m.items||[];
    renderDirectory($("#directorySearch").value);
    renderMessages();
  }catch(err){
    console.error(err);
    toast("Could not load shared data.");
  }
}

$("#enterAppBtn").onclick=()=>enterApp(false);
$("#skipIntroBtn").onclick=()=>enterApp(true);
if(localStorage.getItem("cc_skip_intro")==="true") enterApp(false);

$$("[data-nav]").forEach(b=>b.onclick=()=>navTo(b.dataset.nav));
$$("[data-open]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.open).classList.add("open"));
$$("[data-close]").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("open"));
$$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});
$("#directorySearch").oninput=e=>renderDirectory(e.target.value);
$("#refreshBtn").onclick=loadData;

$("#profileForm").onsubmit=async e=>{
  e.preventDefault();
  if(!API_READY)return toast("Connect Apps Script first.");
  const f=new FormData(e.target);
  await postData("addClassmate",{
    name:f.get("name").trim(),city:f.get("city").trim(),state:f.get("state").trim(),
    email:f.get("email").trim(),phone:f.get("phone").trim(),bio:f.get("bio").trim(),
    showEmail:f.get("showEmail")==="on",showPhone:f.get("showPhone")==="on"
  });
  e.target.reset();e.target.closest(".modal").classList.remove("open");
  toast("Your story was submitted for approval.");
};

$("#messageForm").onsubmit=async e=>{
  e.preventDefault();
  if(!API_READY)return toast("Connect Apps Script first.");
  const f=new FormData(e.target);
  await postData("addMessage",{author:f.get("author").trim(),text:f.get("text").trim()});
  e.target.reset();e.target.closest(".modal").classList.remove("open");
  toast("Your memory was submitted for approval.");
};

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false;
});
$("#installBtn").onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;$("#installBtn").hidden=true;
};

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
}

greeting();
renderDirectory();
renderMessages();
loadData();