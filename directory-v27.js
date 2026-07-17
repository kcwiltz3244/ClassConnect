(() => {
  const apiUrl = String(window.CLASSCONNECT_CONFIG?.apiUrl || "").trim();
  const apiReady = apiUrl && !apiUrl.includes("PASTE_YOUR");
  const grid = document.getElementById("contactDirectoryGrid");
  const search = document.getElementById("contactDirectorySearch");
  const empty = document.getElementById("contactDirectoryEmpty");
  let classmates = [];

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  const initials = name => String(name || "").trim().split(/\s+/).slice(0, 2)
    .map(part => part[0] || "").join("").toUpperCase() || "76";

  const normalizePhone = phone => String(phone || "").replace(/[^+\d]/g, "");

  function avatar(classmate) {
    if (/^https?:\/\//i.test(String(classmate.profilePhoto || ""))) {
      return `<div class="contact-avatar-v27"><img src="${esc(classmate.profilePhoto)}" alt="${esc(classmate.name)}"></div>`;
    }
    return `<div class="contact-avatar-v27">${esc(initials(classmate.name))}</div>`;
  }

  function sharedAddress(classmate) {
    const allowed = classmate.showAddress === true || classmate.showMailingAddress === true || classmate.shareAddress === true;
    if (!allowed) return "";
    return classmate.address || classmate.streetAddress || classmate.mailingAddress || "";
  }

  function openStory(name) {
    const peopleButton = document.querySelector('[data-nav="peopleView"]');
    peopleButton?.click();
    const storySearch = document.getElementById("directorySearch");
    if (storySearch) {
      storySearch.value = name;
      storySearch.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  window.openDirectoryStoryV27 = openStory;

  function render() {
    const query = String(search?.value || "").trim().toLowerCase();
    const filtered = classmates
      .filter(classmate => [
        classmate.name, classmate.maidenName, classmate.city, classmate.state,
        classmate.email, classmate.phone, classmate.address, classmate.streetAddress
      ].join(" ").toLowerCase().includes(query))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    if (empty) empty.hidden = filtered.length > 0;
    if (!grid) return;

    grid.innerHTML = filtered.map(classmate => {
      const location = [classmate.city, classmate.state].filter(Boolean).join(", ");
      const maiden = classmate.maidenName ? `<small class="maiden-name-v27">Class name: ${esc(classmate.maidenName)}</small>` : "";
      const email = classmate.showEmail && classmate.email ? String(classmate.email) : "";
      const phone = classmate.showPhone && classmate.phone ? String(classmate.phone) : "";
      const address = sharedAddress(classmate);
      const tel = normalizePhone(phone);

      return `<article class="contact-card-v27">
        <div class="contact-card-top-v27">
          ${avatar(classmate)}
          <div class="contact-identity-v27">
            <h2>${esc(classmate.name || "Classmate")}</h2>
            ${maiden}
            ${location ? `<p>📍 ${esc(location)}</p>` : `<p class="contact-muted-v27">Location not listed</p>`}
          </div>
        </div>
        <div class="contact-details-v27">
          ${phone ? `<p><span>Phone</span><strong>${esc(phone)}</strong></p>` : ""}
          ${email ? `<p><span>Email</span><strong>${esc(email)}</strong></p>` : ""}
          ${address ? `<p><span>Mailing address</span><strong>${esc(address)}</strong></p>` : ""}
          ${!phone && !email && !address ? `<p class="contact-private-v27">Contact information has not been shared.</p>` : ""}
        </div>
        <div class="contact-actions-v27">
          ${phone && tel ? `<a href="tel:${esc(tel)}">📞 Call</a><a href="sms:${esc(tel)}">💬 Text</a>` : ""}
          ${email ? `<a href="mailto:${encodeURIComponent(email)}">✉️ Email</a>` : ""}
          <button type="button" onclick='openDirectoryStoryV27(${JSON.stringify(String(classmate.name || ""))})'>📖 View Story</button>
        </div>
      </article>`;
    }).join("") || `<div class="contact-directory-loading-v27">No directory entries are available yet.</div>`;
  }

  function jsonp(action) {
    return new Promise((resolve, reject) => {
      const callback = `cc_directory_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const script = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("Directory request timed out.")); }, 12000);
      function cleanup() { clearTimeout(timer); delete window[callback]; script.remove(); }
      window[callback] = data => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error("Directory request failed.")); };
      script.src = apiUrl + "?" + new URLSearchParams({ action, callback });
      document.body.appendChild(script);
    });
  }

  async function loadDirectory() {
    if (!grid) return;
    if (!apiReady) {
      grid.innerHTML = `<div class="contact-directory-loading-v27">Connect Apps Script in config.js to load the directory.</div>`;
      return;
    }
    try {
      const response = await jsonp("getClassmates");
      classmates = Array.isArray(response?.items) ? response.items : [];
      render();
    } catch (error) {
      console.error(error);
      grid.innerHTML = `<div class="contact-directory-error-v27">The directory could not be loaded. Please try again.</div>`;
    }
  }

  search?.addEventListener("input", render);
  loadDirectory();
})();
