const SPREADSHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const CLASSMATES_SHEET = "Classmates";
const MESSAGES_SHEET = "Messages";

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let classmates = ss.getSheetByName(CLASSMATES_SHEET);
  if (!classmates) classmates = ss.insertSheet(CLASSMATES_SHEET);
  if (classmates.getLastRow() === 0) {
    classmates.getRange(1,1,1,10).setValues([[
      "Timestamp","Status","Name","City","State","Email","Phone","Bio","Show Email","Show Phone"
    ]]);
    classmates.setFrozenRows(1);
  }

  let messages = ss.getSheetByName(MESSAGES_SHEET);
  if (!messages) messages = ss.insertSheet(MESSAGES_SHEET);
  if (messages.getLastRow() === 0) {
    messages.getRange(1,1,1,4).setValues([[
      "Timestamp","Status","Author","Message"
    ]]);
    messages.setFrozenRows(1);
  }
}

function setAdminKey() {
  PropertiesService.getScriptProperties().setProperty("ADMIN_KEY", "CHANGE_THIS_ADMIN_KEY");
}

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "");
  const callback = String((e && e.parameter && e.parameter.callback) || "");
  let result;
  try {
    setupSheets();
    if (action === "getClassmates") result = getApprovedClassmates();
    else if (action === "getMessages") result = getApprovedMessages();
    else if (action === "getPending") result = getPending(e.parameter.adminKey);
    else if (action === "moderate") result = moderate(e.parameter);
    else result = {ok:false,error:"Unknown action"};
  } catch (error) {
    result = {ok:false,error:error.message};
  }
  const json = JSON.stringify(result);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback+"("+json+");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  try {
    setupSheets();
    const action = String((e && e.parameter && e.parameter.action) || "");
    const payload = JSON.parse(String((e && e.parameter && e.parameter.payload) || "{}"));
    if (action === "addClassmate") result = addClassmate(payload);
    else if (action === "addMessage") result = addMessage(payload);
    else result = {ok:false,error:"Unknown action"};
  } catch (error) {
    result = {ok:false,error:error.message};
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function addClassmate(data) {
  const name = cleanText(data.name,70);
  if (!name) throw new Error("Name is required.");
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CLASSMATES_SHEET).appendRow([
    new Date(),"Pending",name,cleanText(data.city,50),cleanText(data.state,25),
    cleanText(data.email,100),cleanText(data.phone,30),cleanText(data.bio,220),
    Boolean(data.showEmail),Boolean(data.showPhone)
  ]);
  return {ok:true};
}

function addMessage(data) {
  const author = cleanText(data.author,70);
  const text = cleanText(data.text,500);
  if (!author || !text) throw new Error("Name and message are required.");
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MESSAGES_SHEET).appendRow([
    new Date(),"Pending",author,text
  ]);
  return {ok:true};
}

function getApprovedClassmates() {
  const rows = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CLASSMATES_SHEET).getDataRange().getValues().slice(1);
  const items = rows.filter(r=>String(r[1]).toLowerCase()==="approved").map(r=>({
    name:String(r[2]||""),city:String(r[3]||""),state:String(r[4]||""),
    email:Boolean(r[8])?String(r[5]||""):"",phone:Boolean(r[9])?String(r[6]||""):"",
    bio:String(r[7]||""),showEmail:Boolean(r[8]),showPhone:Boolean(r[9])
  })).sort((a,b)=>a.name.localeCompare(b.name));
  return {ok:true,items:items};
}

function getApprovedMessages() {
  const rows = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MESSAGES_SHEET).getDataRange().getValues().slice(1);
  const items = rows.filter(r=>String(r[1]).toLowerCase()==="approved").map(r=>({
    date:new Date(r[0]).toISOString(),author:String(r[2]||""),text:String(r[3]||"")
  }));
  return {ok:true,items:items};
}

function getPending(adminKey) {
  requireAdmin(adminKey);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const cRows = ss.getSheetByName(CLASSMATES_SHEET).getDataRange().getValues();
  const mRows = ss.getSheetByName(MESSAGES_SHEET).getDataRange().getValues();
  return {
    ok:true,
    classmates:cRows.slice(1).map((r,i)=>({row:i+2,status:r[1],name:r[2],city:r[3],state:r[4],bio:r[7]})).filter(x=>String(x.status).toLowerCase()==="pending"),
    messages:mRows.slice(1).map((r,i)=>({row:i+2,status:r[1],author:r[2],text:r[3]})).filter(x=>String(x.status).toLowerCase()==="pending")
  };
}

function moderate(p) {
  requireAdmin(p.adminKey);
  if (!["Approved","Rejected"].includes(p.status)) throw new Error("Invalid status.");
  const sheetName = p.type === "classmate" ? CLASSMATES_SHEET : p.type === "message" ? MESSAGES_SHEET : "";
  if (!sheetName) throw new Error("Invalid item type.");
  const row = Number(p.row);
  if (!Number.isInteger(row) || row < 2) throw new Error("Invalid row.");
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName).getRange(row,2).setValue(p.status);
  return {ok:true};
}

function requireAdmin(key) {
  const saved = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  if (!saved || key !== saved) throw new Error("Incorrect admin key.");
}

function cleanText(value,maxLength) {
  return String(value==null?"":value).replace(/[<>]/g,"").trim().slice(0,maxLength);
}
