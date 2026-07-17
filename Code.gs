const SPREADSHEET_ID = "11TTL2NkEzjh7robNp0ic8yfBC9yTAksaBF67Zjt7gGA";
const CLASSMATES_SHEET = "Classmates";
const MESSAGES_SHEET = "Messages";
const PROFILE_FOLDER_NAME = "ClassConnect Profile Photos";

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const headers = [
    "Timestamp",
    "Status",
    "Name",
    "City",
    "State",
    "Birthday",
    "Career",
    "Favorite Memory",
    "Email",
    "Phone",
    "Bio",
    "Show Email",
    "Show Phone",
    "Profile Photo URL"
  ];

  let classmates = ss.getSheetByName(CLASSMATES_SHEET);
  if (!classmates) classmates = ss.insertSheet(CLASSMATES_SHEET);

  if (classmates.getLastRow() === 0) {
    classmates.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  classmates.setFrozenRows(1);

  let messages = ss.getSheetByName(MESSAGES_SHEET);
  if (!messages) messages = ss.insertSheet(MESSAGES_SHEET);

  if (messages.getLastRow() === 0) {
    messages
      .getRange(1, 1, 1, 4)
      .setValues([["Timestamp", "Status", "Author", "Message"]]);
  }

  messages.setFrozenRows(1);
}

function doGet(e) {
  const action = String(e?.parameter?.action || "");
  const callback = String(e?.parameter?.callback || "");
  let result;

  try {
    setupSheets();

    if (action === "getClassmates") {
      result = getApprovedClassmates();
    } else if (action === "getMessages") {
      result = getApprovedMessages();
    } else if (action === "lookupClassmate") {
      result = lookupClassmate(
        e?.parameter?.id,
        e?.parameter?.name
      );
    } else {
      result = {
        ok: false,
        error: "Unknown action: " + action
      };
    }
  } catch (error) {
    result = {
      ok: false,
      error: error.message
    };
  }

  const json = JSON.stringify(result);

  if (
    callback &&
    /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)
  ) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;

  try {
    setupSheets();

    const action = String(e?.parameter?.action || "");
    const payload = JSON.parse(
      String(e?.parameter?.payload || "{}")
    );

    if (action === "addClassmate") {
      result = addClassmate(payload);
    } else if (action === "addMessage") {
      result = addMessage(payload);
    } else if (action === "updateClassmate") {
      result = updateClassmate(payload);
    } else {
      result = {
        ok: false,
        error: "Unknown action: " + action
      };
    }
  } catch (error) {
    result = {
      ok: false,
      error: error.message
    };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function addClassmate(data) {
  const name = cleanText(data.name, 70);

  if (!name) {
    throw new Error("Name is required.");
  }

  const photo = data.profilePhotoData
    ? saveProfilePhoto(String(data.profilePhotoData), name)
    : "";

  SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(CLASSMATES_SHEET)
    .appendRow([
      new Date(),
      "Approved",
      name,
      cleanText(data.city, 50),
      cleanText(data.state, 25),
      cleanText(data.birthday, 40),
      cleanText(data.career, 100),
      cleanText(data.favoriteMemory, 500),
      cleanText(data.email, 100),
      cleanText(data.phone, 30),
      cleanText(data.bio, 500),
      Boolean(data.showEmail),
      Boolean(data.showPhone),
      photo
    ]);

  return { ok: true };
}

function addMessage(data) {
  const author = cleanText(data.author, 70);
  const text = cleanText(data.text, 500);

  if (!author || !text) {
    throw new Error("Name and message are required.");
  }

  SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(MESSAGES_SHEET)
    .appendRow([
      new Date(),
      "Approved",
      author,
      text
    ]);

  return { ok: true };
}

function getApprovedClassmates() {
  const sheet = SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(CLASSMATES_SHEET);

  const rows = sheet
    .getDataRange()
    .getValues()
    .slice(1);

  const items = [];

  rows.forEach((row, index) => {
    if (
      String(row[1] || "").toLowerCase() !== "approved"
    ) {
      return;
    }

    items.push({
      id: index + 2,
      recordId: index + 2,
      date: row[0]
        ? new Date(row[0]).toISOString()
        : "",
      name: String(row[2] || ""),
      city: String(row[3] || ""),
      state: String(row[4] || ""),
      birthday: normalizeBirthday(row[5]),
      career: String(row[6] || ""),
      favoriteMemory: String(row[7] || ""),
      email: Boolean(row[11])
        ? String(row[8] || "")
        : "",
      phone: Boolean(row[12])
        ? String(row[9] || "")
        : "",
      bio: String(row[10] || ""),
      showEmail: Boolean(row[11]),
      showPhone: Boolean(row[12]),
      profilePhoto: String(row[13] || "")
    });
  });

  items.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    ok: true,
    items
  };
}

function lookupClassmate(id, name) {
  const sheet = SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(CLASSMATES_SHEET);

  const rows = sheet
    .getDataRange()
    .getValues();

  if (rows.length < 2) {
    return {
      ok: true,
      item: null
    };
  }

  let rowNumber = Number(id);

  if (
    !rowNumber ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    const wantedName = normalizeName(name);
    rowNumber = 0;

    for (let i = 1; i < rows.length; i++) {
      const sheetName = normalizeName(rows[i][2]);

      if (
        sheetName === wantedName &&
        String(rows[i][1] || "").toLowerCase() === "approved"
      ) {
        rowNumber = i + 1;
        break;
      }
    }
  }

  if (!rowNumber) {
    return {
      ok: true,
      item: null
    };
  }

  const row = sheet
    .getRange(rowNumber, 1, 1, 14)
    .getValues()[0];

  return {
    ok: true,
    item: {
      id: rowNumber,
      recordId: rowNumber,
      date: row[0]
        ? new Date(row[0]).toISOString()
        : "",
      status: String(row[1] || ""),
      name: String(row[2] || ""),
      city: String(row[3] || ""),
      state: String(row[4] || ""),
      birthday: normalizeBirthday(row[5]),
      career: String(row[6] || ""),
      favoriteMemory: String(row[7] || ""),
      email: String(row[8] || ""),
      phone: String(row[9] || ""),
      bio: String(row[10] || ""),
      showEmail: Boolean(row[11]),
      showPhone: Boolean(row[12]),
      profilePhoto: String(row[13] || "")
    }
  };
}

function updateClassmate(data) {
  const sheet = SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(CLASSMATES_SHEET);

  const rowNumber = Number(
    data.id || data.recordId
  );

  if (
    !rowNumber ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error(
      "The selected classmate record could not be found."
    );
  }

  const existing = sheet
    .getRange(rowNumber, 1, 1, 14)
    .getValues()[0];

  let photo = String(existing[13] || "");

  if (data.profilePhotoData) {
    photo = saveProfilePhoto(
      String(data.profilePhotoData),
      cleanText(data.name, 70)
    );
  }

  sheet
    .getRange(rowNumber, 1, 1, 14)
    .setValues([[
      existing[0] || new Date(),
      existing[1] || "Approved",
      cleanText(data.name, 70),
      cleanText(data.city, 50),
      cleanText(data.state, 25),
      cleanText(data.birthday, 40),
      cleanText(data.career, 100),
      cleanText(data.favoriteMemory, 500),
      cleanText(data.email, 100),
      cleanText(data.phone, 30),
      cleanText(data.bio, 500),
      Boolean(data.showEmail),
      Boolean(data.showPhone),
      photo
    ]]);

  return {
    ok: true,
    id: rowNumber
  };
}

function saveProfilePhoto(dataUrl, name) {
  const match = dataUrl.match(
    /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/
  );

  if (!match) {
    throw new Error("Invalid profile photo.");
  }

  const bytes = Utilities.base64Decode(match[2]);

  if (bytes.length > 4 * 1024 * 1024) {
    throw new Error("Profile photo is too large.");
  }

  const folders = DriveApp.getFoldersByName(
    PROFILE_FOLDER_NAME
  );

  const folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(PROFILE_FOLDER_NAME);

  const filename =
    cleanText(name, 50)
      .replace(/[^A-Za-z0-9_-]+/g, "_") +
    "_" +
    Date.now() +
    ".jpg";

  const file = folder.createFile(
    Utilities.newBlob(
      bytes,
      match[1],
      filename
    )
  );

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return (
    "https://drive.google.com/uc?export=view&id=" +
    file.getId()
  );
}

function normalizeBirthday(value) {
  if (!value) return "";

  if (
    Object.prototype.toString.call(value) ===
      "[object Date]" &&
    !isNaN(value)
  ) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  return String(value);
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cleanText(value, maxLength) {
  return String(
    value == null ? "" : value
  )
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}
