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

const spotlightQuotes=["The memories never graduated.","Fifty years later, friendship still feels familiar.","Our halls are behind us, but our stories keep growing.","The Class of 1976 is still writing its next chapter.","Old friends make new memories feel like home."];
function dailySpotlightIndex(length){if(!length)return 0;const n=new Date();const key=Number(`${n.getFullYear()}${String(n.getMonth()+1).padStart(2,"0")}${String(n.getDate()).padStart(2,"0")}`);return key%length}
function renderSpotlight(){const el=$("#classmateSpotlight");if(!el)return;if(!classmates.length){el.innerHTML=`<p class="empty-feature-copy">Today’s Classmate Spotlight will appear after a story is added.</p>`;return}const c=[...classmates].sort((a,b)=>String(a.name).localeCompare(String(b.name)))[dailySpotlightIndex(classmates.length)];el.innerHTML=`<div class="spotlight-profile">${avatar(c,"spotlight-avatar")}<div class="spotlight-details"><h3>${esc(c.name)}</h3><p class="spotlight-location">📍 ${esc([c.city,c.state].filter(Boolean).join(", ")||"Location not listed")}</p>${c.career?`<p class="spotlight-career">💼 ${esc(c.career)}</p>`:""}${c.favoriteMemory?`<blockquote>${esc(c.favoriteMemory)}</blockquote>`:`<p class="spotlight-bio">${esc(c.bio||"Their story is part of our continuing class journey.")}</p>`}<button class="spotlight-link" onclick="openSpotlightProfile(${JSON.stringify(c.name)})">Read their story</button></div></div>`}
window.openSpotlightProfile=name=>{navTo("peopleView");$("#directorySearch").value=name;renderDirectory(true);setTimeout(()=>{const card=$("#directoryGrid .person");if(card)card.classList.add("open")},50)};
function renderBirthdaySpotlight(){const el=$("#birthdaySpotlight");if(!el)return;const now=new Date(),month=now.getMonth();const birthdays=classmates.filter(c=>{const d=new Date(c.birthday);return c.birthday&&!Number.isNaN(d.getTime())&&d.getMonth()===month}).sort((a,b)=>new Date(a.birthday).getDate()-new Date(b.birthday).getDate());if(!birthdays.length){el.innerHTML=`<div class="birthday-empty"><span>🎈</span><h3>No birthdays listed this month</h3><p>Classmates can add their birthday when they update their story.</p></div>`;return}el.innerHTML=`<div class="birthday-heading"><span class="birthday-month">${now.toLocaleDateString(undefined,{month:"long"}).toUpperCase()} BIRTHDAYS</span><strong>Happy Birthday!</strong></div><div class="birthday-list">${birthdays.slice(0,6).map(c=>{const d=new Date(c.birthday);return `<div class="birthday-row">${avatar(c,"birthday-avatar")}<div><strong>${esc(c.name)}</strong><small>${d.toLocaleDateString(undefined,{month:"long",day:"numeric"})}</small></div></div>`}).join("")}</div>`}
function renderHomeQuote(){const el=$("#homeQuote");if(el)el.textContent=spotlightQuotes[Math.floor(Math.random()*spotlightQuotes.length)]}
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
    renderSpotlight();
    renderBirthdaySpotlight();
    renderHomeQuote();
  }catch(e){
    console.error(e);
    toast("Could not load shared data.");
  }
}

$("#enterAppBtn").onclick=()=>enterApp(0);
const skipIntroBtn=$("#skipIntroBtn"); if(skipIntroBtn)skipIntroBtn.onclick=()=>enterApp(24);
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
  const payload={id:f.get("recordId"),name:f.get("name").trim(),city:f.get("city").trim(),state:f.get("state").trim(),birthday:f.get("birthday"),career:f.get("career").trim(),favoriteMemory:f.get("favoriteMemory").trim(),email:f.get("email").trim(),phone:f.get("phone").trim(),bio:f.get("bio").trim(),showEmail:f.get("showEmail")==="on",showPhone:f.get("showPhone")==="on",profilePhotoData};
  const mode=f.get("formMode")==="edit"?"edit":"add";
  await postData(mode==="edit"?"updateClassmate":"addClassmate",payload);
  e.target.reset(); $("#profileRecordId").value=""; $("#profileFormMode").value="add"; profilePhotoData=""; $("#photoPreview").classList.add("hidden"); e.target.closest(".modal").classList.remove("open"); toast(mode==="edit"?"Your story was updated.":"Your story was added."); setTimeout(loadData,1200);
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
$("#greeting").textContent=hour<12?"GOOD MORNING — WELCOME HOME":hour<18?"WELCOME HOME":"GOOD EVENING — WELCOME HOME";

if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
renderDirectory();
renderMessages();
loadData();

/* =========================================================
   ClassConnect Version 2.5 — Community Events
   ========================================================= */
let classEvents=[];

function eventDateObject(value){
  if(!value)return null;
  const d=new Date(value+"T12:00:00");
  return Number.isNaN(d.getTime())?null:d;
}
function formatEventDate(value){
  const d=eventDateObject(value);
  return d?d.toLocaleDateString(undefined,{weekday:"short",month:"long",day:"numeric",year:"numeric"}):"Date not listed";
}
function formatEventTime(value){
  if(!value)return "";
  const [h,m]=value.split(":").map(Number);
  const d=new Date();d.setHours(h||0,m||0,0,0);
  return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
}
function eventCard(e){
  const links=[];
  if(e.rsvpUrl)links.push(`<a href="${esc(e.rsvpUrl)}" target="_blank" rel="noopener">RSVP / Details</a>`);
  if(e.location)links.push(`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}" target="_blank" rel="noopener">Map</a>`);
  return `<article class="event-card-v25">
    <div class="event-card-header-v25">
      <span class="event-type-v25">${esc(e.type||"Event")}</span>
      <strong>${esc(formatEventDate(e.date))}</strong>
    </div>
    <div class="event-card-body-v25">
      <h3>${esc(e.title)}</h3>
      ${e.time?`<p>🕒 ${esc(formatEventTime(e.time))}</p>`:""}
      ${e.location?`<p>📍 ${esc(e.location)}</p>`:""}
      ${e.organizer?`<p>👤 ${esc(e.organizer)}</p>`:""}
      <p class="event-description-v25">${esc(e.description||"")}</p>
      ${e.contact?`<p>Contact: ${esc(e.contact)}</p>`:""}
      ${links.length?`<div class="event-card-actions-v25">${links.join("")}</div>`:""}
    </div>
  </article>`;
}
function renderEvents(){
  const today=new Date();today.setHours(0,0,0,0);
  const approved=classEvents.filter(e=>String(e.status||"approved").toLowerCase()==="approved");
  const upcoming=approved.filter(e=>{const d=eventDateObject(e.date);return d&&d>=today}).sort((a,b)=>eventDateObject(a.date)-eventDateObject(b.date));
  const past=approved.filter(e=>{const d=eventDateObject(e.date);return d&&d<today}).sort((a,b)=>eventDateObject(b.date)-eventDateObject(a.date));

  $("#upcomingEvents").innerHTML=upcoming.map(eventCard).join("");
  $("#pastEvents").innerHTML=past.map(eventCard).join("");
  $("#noUpcomingEvents").hidden=upcoming.length>0;
  $("#noPastEvents").hidden=past.length>0;

  const section=$("#nextEventSection");
  if(!upcoming.length){section.hidden=true;return}
  const e=upcoming[0],d=eventDateObject(e.date);
  const days=Math.max(0,Math.ceil((d-today)/86400000));
  $("#nextEventCard").innerHTML=`<article class="next-event-card-v25">
    <div class="next-event-date-v25"><small>${d.toLocaleDateString(undefined,{month:"short"}).toUpperCase()}</small><strong>${d.getDate()}</strong><small>${d.getFullYear()}</small></div>
    <div class="next-event-copy-v25"><h3>${esc(e.title)}</h3><p>${esc(e.type||"Community Event")}</p>${e.location?`<p>📍 ${esc(e.location)}</p>`:""}</div>
    <div class="event-countdown-v25"><strong>${days}</strong>${days===1?"Day":"Days"} Away</div>
  </article>`;
  section.hidden=false;
}
async function loadEvents(){
  if(!API_READY){renderEvents();return}
  try{
    const response=await jsonp("getEvents");
    classEvents=response.items||[];
    renderEvents();
  }catch(error){
    console.warn("Events endpoint is not active yet.",error);
    renderEvents();
  }
}
const eventForm=$("#eventForm");
if(eventForm)eventForm.onsubmit=async event=>{
  event.preventDefault();
  if(!API_READY)return toast("Connect Apps Script first.");
  const f=new FormData(event.target);
  const payload={
    title:f.get("title").trim(),
    type:f.get("type"),
    date:f.get("date"),
    time:f.get("time"),
    location:f.get("location").trim(),
    description:f.get("description").trim(),
    organizer:f.get("organizer").trim(),
    contact:f.get("contact").trim(),
    rsvpUrl:f.get("rsvpUrl").trim(),
    status:"pending"
  };
  try{
    await postData("submitEvent",payload);
    event.target.reset();
    event.target.closest(".modal").classList.remove("open");
    toast("Event submitted for review.");
  }catch(error){
    console.error(error);
    toast("The event could not be submitted.");
  }
};
loadEvents();
\nfunction jsonpWithParams(action,params={}){return new Promise((resolve,reject)=>{const cb="ccp_"+Date.now()+"_"+Math.floor(Math.random()*9999),s=document.createElement("script"),timer=setTimeout(()=>{cleanup();reject(new Error("Timeout"))},12000);function cleanup(){clearTimeout(timer);delete window[cb];s.remove()}window[cb]=d=>{cleanup();resolve(d)};s.onerror=()=>{cleanup();reject(new Error("Load failed"))};s.src=API_URL+"?"+new URLSearchParams({action,callback:cb,...params});document.body.appendChild(s)})}\nfunction setStoryLookupStatus(message,type=""){const el=$("#storyLookupStatus");if(!el)return;el.textContent=message;el.className="story-lookup-status-v251"+(type?` ${type}`:"")}\nfunction clearProfileFormForNew(){const form=$("#profileForm");form.reset();$("#profileRecordId").value="";$("#profileFormMode").value="add";profilePhotoData="";$("#photoPreview").classList.add("hidden");setStoryLookupStatus("Ready to add a new story.")}\nfunction fillProfileForm(r){const f=$("#profileForm"),set=(n,v="")=>{if(f.elements[n])f.elements[n].value=v??""};$("#profileRecordId").value=r.id||r.recordId||"";$("#profileFormMode").value="edit";set("name",r.name);set("city",r.city);set("state",r.state);set("birthday",r.birthday?String(r.birthday).slice(0,10):"");set("career",r.career);set("favoriteMemory",r.favoriteMemory);set("email",r.email);set("phone",r.phone);set("bio",r.bio);if(f.elements.showEmail)f.elements.showEmail.checked=String(r.showEmail).toLowerCase()==="true"||r.showEmail===true;if(f.elements.showPhone)f.elements.showPhone.checked=String(r.showPhone).toLowerCase()==="true"||r.showPhone===true;if(r.profilePhoto){profilePhotoData=r.profilePhoto;$("#photoPreview").innerHTML=`<img src="${esc(r.profilePhoto)}" alt="Profile preview">`;$("#photoPreview").classList.remove("hidden")}setStoryLookupStatus("Your story was found. Make your changes below, then tap Save My Story.","success");f.scrollIntoView({behavior:"smooth",block:"start"})}\nconst findStoryBtn=$("#findStoryBtn");if(findStoryBtn)findStoryBtn.onclick=async()=>{const name=$("#editLookupName").value.trim(),email=$("#editLookupEmail").value.trim();if(!name||!email)return setStoryLookupStatus("Enter both your full name and email.","error");setStoryLookupStatus("Looking for your story…");try{const r=await jsonpWithParams("lookupClassmate",{name,email});r&&r.item?fillProfileForm(r.item):setStoryLookupStatus("No matching story was found. Check the spelling and email, or start a new story.","error")}catch(e){setStoryLookupStatus("Your story could not be found right now.","error")}};const startNewStoryBtn=$("#startNewStoryBtn");if(startNewStoryBtn)startNewStoryBtn.onclick=clearProfileFormForNew;\n