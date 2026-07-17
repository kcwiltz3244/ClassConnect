(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const form = byId("profileForm");
  const lookupForm = byId("findStoryForm");
  const lookupModal = byId("findStoryModal");
  const profileModal = byId("profileModal");
  const status = byId("storyLookupStatus");
  const submitButton = byId("profileSubmitBtn");
  const nameInput = byId("editLookupName");
  const nameResults = byId("editNameResults");
  const selectedNameText = byId("editSelectedName");

  if (!form || !lookupForm || !nameInput) return;

  const apiUrl = String(window.CLASSCONNECT_CONFIG?.apiUrl || (typeof API_URL !== "undefined" ? API_URL : "") || "").trim();
  let classmates = [];
  let directoryLoaded = false;
  let selectedClassmate = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const setStatus = (message, type = "") => {
    if (!status) return;
    status.textContent = message;
    status.className = `story-lookup-status-v251${type ? ` ${type}` : ""}`;
  };

  const jsonp = (action, extra = {}) => new Promise((resolve, reject) => {
    if (!apiUrl || apiUrl.includes("PASTE_YOUR")) {
      reject(new Error("ClassConnect is not connected to Apps Script."));
      return;
    }
    const callback = `cc_edit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("The request took too long."));
    }, 15000);
    const cleanup = () => {
      window.clearTimeout(timer);
      delete window[callback];
      script.remove();
    };
    window[callback] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error("The request could not be loaded.")); };
    script.src = `${apiUrl}?${new URLSearchParams({ action, callback, ...extra }).toString()}`;
    document.body.appendChild(script);
  });

  const loadClassmates = async () => {
    if (directoryLoaded) return;
    try {
      const result = await jsonp("getClassmates");
      classmates = Array.isArray(result?.items) ? result.items : [];
      directoryLoaded = true;
    } catch (error) {
      console.error(error);
      setStatus("The class list could not be loaded right now.", "error");
    }
  };

  const selectClassmate = (classmate) => {
    selectedClassmate = classmate;
    nameInput.value = String(classmate.name || "");
    nameInput.dataset.selectedName = String(classmate.name || "");
    if (selectedNameText) {
      const location = [classmate.city, classmate.state].filter(Boolean).join(", ");
      selectedNameText.innerHTML = `Selected: <strong>${esc(classmate.name || "Classmate")}</strong>${location ? ` · ${esc(location)}` : ""}`;
      selectedNameText.hidden = false;
    }
    if (nameResults) {
      nameResults.hidden = true;
      nameResults.innerHTML = "";
    }
    setStatus("");
  };

  const renderMatches = () => {
    if (!nameResults) return;
    const query = nameInput.value.trim().toLowerCase();
    selectedClassmate = null;
    delete nameInput.dataset.selectedName;
    if (selectedNameText) selectedNameText.hidden = true;

    if (query.length < 2) {
      nameResults.hidden = true;
      nameResults.innerHTML = "";
      return;
    }

    const matches = classmates.filter((person) => [
      person.name, person.maidenName, person.className, person.city, person.state
    ].join(" ").toLowerCase().includes(query)).slice(0, 8);

    nameResults.innerHTML = matches.length ? matches.map((person, index) => {
      const location = [person.city, person.state].filter(Boolean).join(", ");
      const className = person.maidenName || person.className || "";
      return `<button type="button" role="option" data-result-index="${index}">
        <strong>${esc(person.name || "Classmate")}</strong>
        <small>${className ? `Class name: ${esc(className)}` : ""}${className && location ? " · " : ""}${location ? esc(location) : ""}</small>
      </button>`;
    }).join("") : `<p>No classmates match that search.</p>`;
    nameResults.hidden = false;

    nameResults.querySelectorAll("button[data-result-index]").forEach((button) => {
      button.addEventListener("click", () => selectClassmate(matches[Number(button.dataset.resultIndex)]));
    });
  };

  nameInput.addEventListener("focus", loadClassmates);
  nameInput.addEventListener("input", async () => {
    await loadClassmates();
    renderMatches();
  });

  document.addEventListener("click", (event) => {
    if (!nameResults || nameResults.hidden) return;
    if (!nameResults.contains(event.target) && event.target !== nameInput) nameResults.hidden = true;
  });

  const requestLookup = (classmate) => {
    const id = classmate?.id || classmate?.recordId || "";
    const name = classmate?.name || nameInput.dataset.selectedName || "";
    return jsonp("lookupClassmate", { id, name });
  };

  const setField = (name, value = "") => {
    const field = form.elements[name];
    if (field) field.value = value ?? "";
  };

  const fillForm = (record) => {
    byId("profileRecordId").value = record.id || record.recordId || "";
    byId("profileFormMode").value = "edit";
    setField("name", record.name);
    setField("city", record.city);
    setField("state", record.state);
    setField("birthday", record.birthday ? String(record.birthday).slice(0, 10) : "");
    setField("career", record.career);
    setField("favoriteMemory", record.favoriteMemory);
    setField("email", record.email);
    setField("phone", record.phone);
    setField("bio", record.bio);

    if (form.elements.showEmail) form.elements.showEmail.checked = record.showEmail === true || String(record.showEmail).toLowerCase() === "true";
    if (form.elements.showPhone) form.elements.showPhone.checked = record.showPhone === true || String(record.showPhone).toLowerCase() === "true";

    if (record.profilePhoto && typeof profilePhotoData !== "undefined") {
      profilePhotoData = record.profilePhoto;
      const preview = byId("photoPreview");
      if (preview) {
        const image = document.createElement("img");
        image.src = record.profilePhoto;
        image.alt = "Profile preview";
        preview.replaceChildren(image);
        preview.classList.remove("hidden");
      }
    }

    const heading = profileModal?.querySelector("h2");
    if (heading) heading.textContent = "Edit My Story";
    if (submitButton) submitButton.textContent = "Save My Story";
    lookupModal?.classList.remove("open");
    profileModal?.classList.add("open");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  lookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = selectedClassmate?.name || nameInput.dataset.selectedName || "";

    if (!name) {
      setStatus("Search for your name and select it from the list.", "error");
      nameInput.focus();
      return;
    }

    setStatus("Looking for your story…");
    const button = byId("findStoryBtn");
    if (button) button.disabled = true;
    try {
      const result = await requestLookup(selectedClassmate || { name });
      if (result?.item) {
        setStatus("Your story was found.", "success");
        fillForm(result.item);
      } else {
        setStatus("A story could not be found for the selected classmate.", "error");
      }
    } catch (error) {
      console.error(error);
      setStatus("Your story could not be found right now. The Apps Script edit connection may still need to be enabled.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    const mode = byId("profileFormMode")?.value;
    if (mode !== "edit") return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (typeof postData !== "function") {
      setStatus("ClassConnect could not connect to the update service.", "error");
      return;
    }

    const data = new FormData(form);
    const payload = {
      id: data.get("recordId"), name: String(data.get("name") || "").trim(),
      city: String(data.get("city") || "").trim(), state: String(data.get("state") || "").trim(),
      birthday: data.get("birthday") || "", career: String(data.get("career") || "").trim(),
      favoriteMemory: String(data.get("favoriteMemory") || "").trim(), email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(), bio: String(data.get("bio") || "").trim(),
      showEmail: data.get("showEmail") === "on", showPhone: data.get("showPhone") === "on",
      profilePhotoData: typeof profilePhotoData !== "undefined" ? profilePhotoData : ""
    };

    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Saving…"; }
    try {
      await postData("updateClassmate", payload);
      form.reset();
      byId("profileRecordId").value = "";
      byId("profileFormMode").value = "add";
      if (typeof profilePhotoData !== "undefined") profilePhotoData = "";
      byId("photoPreview")?.classList.add("hidden");
      profileModal?.classList.remove("open");
      if (typeof toast === "function") toast("Your story was updated.");
      if (typeof loadData === "function") window.setTimeout(loadData, 1200);
    } catch (error) {
      console.error(error);
      if (typeof toast === "function") toast("Your story could not be updated.");
    } finally {
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = "Add Me to the Living Yearbook"; }
    }
  }, true);
})();
