async function includeHTML(id, file) {
  const target = document.getElementById(id);
  if (!target) return;

  try {
    const resp = await fetch(file);

    if (!resp.ok) {
      target.innerHTML = `Chyba při načítání ${file}`;
      return;
    }

    const html = await resp.text();
    target.innerHTML = html;

  } catch (err) {
    target.innerHTML = `Chyba při načítání ${file}`;
    console.error(err);
  }
}

function markActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".site-nav a").forEach(link => {
    const href = link.getAttribute("href").split("/").pop();

    if (href === current) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}