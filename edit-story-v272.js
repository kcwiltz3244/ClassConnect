(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const form = byId("profileForm");
  const lookupForm = byId("findStoryForm");
  const lookupModal = byId("findStoryModal");
  const profileModal = byId("profileModal");
  const status = byId("storyLookupStatus");
  const submitButton = byId("profileSubmitBtn");

  if (!form || !lookupForm) return;

  const setStatus = (message, type = "") => {
    if (!status) return;
    status.textContent = message;
    status.className = `story-lookup-status-v251${type ? ` ${type}` : ""}`;
  };

  const requestLookup = (name, email) => new Promise((resolve, reject) => {
    if (typeof API_URL === "undefined" || !API_URL) {
      reject(new Error("ClassConnect is not connected to Apps Script."));
      return;
    }

    const callback = `cc_edit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("The lookup took too long."));
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timer);
      delete window[callback];
      script.remove();
    };

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("The story lookup could not be loaded."));
    };

    const params = new URLSearchParams({
      action: "lookupClassmate",
      callback,
      name,
      email
    });
    script.src = `${API_URL}?${params.toString()}`;
    document.body.appendChild(script);
  });

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

    if (form.elements.showEmail) {
      form.elements.showEmail.checked = record.showEmail === true || String(record.showEmail).toLowerCase() === "true";
    }
    if (form.elements.showPhone) {
      form.elements.showPhone.checked = record.showPhone === true || String(record.showPhone).toLowerCase() === "true";
    }

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
    const name = byId("editLookupName")?.value.trim();
    const email = byId("editLookupEmail")?.value.trim();

    if (!name || !email) {
      setStatus("Enter both your full name and email.", "error");
      return;
    }

    setStatus("Looking for your story…");
    const button = byId("findStoryBtn");
    if (button) button.disabled = true;

    try {
      const result = await requestLookup(name, email);
      if (result?.item) {
        setStatus("Your story was found.", "success");
        fillForm(result.item);
      } else {
        setStatus("No matching story was found. Check the spelling and email address.", "error");
      }
    } catch (error) {
      console.error(error);
      setStatus("Your story could not be found right now. The Apps Script edit connection may still need to be enabled.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  });

  // Capture edit submissions before the original add-story handler runs.
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
      id: data.get("recordId"),
      name: String(data.get("name") || "").trim(),
      city: String(data.get("city") || "").trim(),
      state: String(data.get("state") || "").trim(),
      birthday: data.get("birthday") || "",
      career: String(data.get("career") || "").trim(),
      favoriteMemory: String(data.get("favoriteMemory") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      bio: String(data.get("bio") || "").trim(),
      showEmail: data.get("showEmail") === "on",
      showPhone: data.get("showPhone") === "on",
      profilePhotoData: typeof profilePhotoData !== "undefined" ? profilePhotoData : ""
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving…";
    }

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
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Add Me to the Living Yearbook";
      }
    }
  }, true);
})();
