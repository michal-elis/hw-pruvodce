async function includeHTML(id, file) {

    document.addEventListener("DOMContentLoaded", () => {

  const current = location.pathname.split("/").pop();

  document.querySelectorAll(".site-nav a").forEach(link => {

    if(link.getAttribute("href") === current){
      link.setAttribute("aria-current","page");
    }

  });

});

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