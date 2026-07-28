(() => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const asidePhone = document.getElementById("aside-phone");
  const navPhone = document.getElementById("nav-phone");

  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.phone) {
        asidePhone.innerHTML = `<a href="tel:${data.phone.replace(/\s/g, "")}">${data.phone}</a>`;
        navPhone.href = `tel:${data.phone.replace(/\s/g, "")}`;
        navPhone.textContent = data.phone;
      }
      const fb = document.getElementById("facebook-reviews");
      if (fb && data.facebookUrl) {
        fb.href = data.facebookUrl;
      } else if (fb && !data.facebookUrl) {
        fb.hidden = true;
      }
    } catch {
      // keep placeholders
    }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.hidden = false;
    status.className = "form-status";
    status.textContent = "Sending…";
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      message: String(fd.get("message") || ""),
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send");
      status.textContent = "Sent — thanks. PSG will get back to you.";
      form.reset();
    } catch (err) {
      status.className = "form-status err";
      status.textContent = err.message || "Something went wrong. Try again.";
    }
  });

  loadConfig();
})();
