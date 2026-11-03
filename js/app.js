(() => {
  const WA = "573174016270";
  const CART_KEY = "crochetluz-cart";
  const $ = (s, el = document) => el.querySelector(s);
  const fmt = (n) => "$" + n.toLocaleString("es-CO");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SWATCH = { Blanco: "#fbf8f2", Verde: "#3f7d4e", Rojo: "#c0283a" };
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  /* ---------- Menu ---------- */
  const menuBtn = $("#menuBtn"), nav = $("#nav");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- Catalog ---------- */
  const filters = $("#filters"), grid = $("#grid");
  let current = "all";
  const tabs = [{ id: "all", label: "Todo" }, ...CATEGORIES];
  filters.innerHTML = tabs.map((t) => {
    const n = t.id === "all" ? PRODUCTS.length : PRODUCTS.filter((p) => p.cat === t.id).length;
    return `<button role="tab" data-cat="${t.id}" aria-selected="${t.id === current}">${esc(t.label)}<sup>${n}</sup></button>`;
  }).join("");
  filters.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    current = b.dataset.cat;
    filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", x === b));
    renderGrid();
  });

  function renderGrid() {
    const list = current === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === current);
    grid.innerHTML = list.map((p, i) => `
      <article class="card" style="animation-delay:${Math.min(i, 12) * 40}ms">
        <button class="card-img" data-view="${p.id}" aria-label="Ver detalles de ${esc(p.name)}">
          <img src="/${p.img}" alt="${esc(p.name)}" loading="lazy" />
          <span class="cat-tag">${esc(catLabel[p.cat])}</span>
        </button>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <p class="price" style="margin:0">${fmt(p.price)} <small>COP</small></p>
          <div class="card-actions">
            <button class="btn btn-primary" data-view="${p.id}">Elegir y pedir</button>
          </div>
        </div>
      </article>`).join("");
  }
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) openProduct(+b.dataset.view);
  });
  renderGrid();

  /* ---------- Product dialog ---------- */
  const dialog = $("#productDialog"), pdBody = $("#pdBody");
  function openProduct(id) {
    const p = byId[id];
    pdBody.innerHTML = `
      <img src="/${p.img}" alt="${esc(p.name)}" />
      <form class="pd-info" id="pdForm">
        <p class="eyebrow" style="margin:0">${esc(catLabel[p.cat])}</p>
        <h2 id="pdName">${esc(p.name)}</h2>
        <p class="price" style="margin:0">${fmt(p.price)} COP</p>
        <p class="desc">${esc(p.desc)}</p>
        <fieldset class="opt-group"><legend>Color</legend><div class="chips">
          ${p.colors.map((c, i) => `<label><input type="radio" name="color" value="${esc(c)}" ${i === 0 ? "checked" : ""}/><span><i class="swatch" style="background:${SWATCH[c] || "#ccc"}"></i>${esc(c)}</span></label>`).join("")}
          <label><input type="radio" name="color" value="Otro (lo acordamos por WhatsApp)"/><span>Otro color</span></label>
        </div></fieldset>
        <fieldset class="opt-group"><legend>${p.sizes.length === 1 ? "Talla" : "Talla / tamaño"}</legend><div class="chips">
          ${p.sizes.map((s, i) => `<label><input type="radio" name="size" value="${esc(s)}" ${i === 0 ? "checked" : ""}/><span>${esc(s)}</span></label>`).join("")}
        </div></fieldset>
        <fieldset class="opt-group"><legend>Cantidad</legend>
          <div class="qty"><button type="button" data-q="-1" aria-label="Menos">−</button><output name="qty">1</output><button type="button" data-q="1" aria-label="Más">+</button></div>
        </fieldset>
        <button class="btn btn-primary" type="submit">Agregar al carrito</button>
        <p class="small" style="margin:0">Tejido a pedido. Confirmamos medidas y tiempo de entrega por WhatsApp.</p>
      </form>`;
    const form = $("#pdForm"), out = form.querySelector("output");
    form.addEventListener("click", (e) => {
      const q = e.target.closest("[data-q]"); if (!q) return;
      out.value = Math.max(1, Math.min(20, +out.value + +q.dataset.q));
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      addToCart(p.id, fd.get("color"), fd.get("size"), +out.value);
      dialog.close();
      toast(`“${p.name}” agregado al carrito`);
    });
    dialog.showModal();
  }
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  /* ---------- Cart ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
  cart = cart.filter((l) => byId[l.id]);
  const cartEl = $("#cart"), scrim = $("#scrim"), cartBtn = $("#cartOpen");
  const save = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));

  function addToCart(id, color, size, qty) {
    const line = cart.find((l) => l.id === id && l.color === color && l.size === size);
    if (line) line.qty += qty; else cart.push({ id, color, size, qty });
    save(); renderCart();
    cartBtn.classList.remove("bump"); void cartBtn.offsetWidth; cartBtn.classList.add("bump");
  }

  function renderCart() {
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const total = cart.reduce((s, l) => s + l.qty * byId[l.id].price, 0);
    $("#cartCount").textContent = count;
    $("#cartTotal").textContent = fmt(total) + " COP";
    $("#cartItems").innerHTML = cart.length ? cart.map((l, i) => {
      const p = byId[l.id];
      return `<li>
        <img src="/${p.img}" alt="" />
        <div><h4>${esc(p.name)}</h4><div class="meta">${esc(l.color)} · ${esc(l.size)}</div><div class="meta">${fmt(p.price)} c/u</div></div>
        <div class="line-actions">
          <div class="qty"><button data-i="${i}" data-d="-1" aria-label="Menos">−</button><output>${l.qty}</output><button data-i="${i}" data-d="1" aria-label="Más">+</button></div>
          <button class="remove" data-rm="${i}">Quitar</button>
        </div></li>`;
    }).join("") : `<li class="empty" style="display:block"><strong>Tu carrito está vacío</strong>Explora el catálogo y elige tu pieza favorita.</li>`;
    updateSendLink();
  }

  function updateSendLink() {
    const send = $("#cartSend");
    if (!cart.length) { send.setAttribute("aria-disabled", "true"); send.href = "#"; return; }
    send.removeAttribute("aria-disabled");
    const total = cart.reduce((s, l) => s + l.qty * byId[l.id].price, 0);
    const lines = cart.map((l) => {
      const p = byId[l.id];
      return `• ${l.qty} x ${p.name} (Color: ${l.color}, Talla: ${l.size}) — ${fmt(p.price * l.qty)}`;
    });
    const note = $("#cartNote").value.trim();
    const msg = `¡Hola Crochet Luz! Quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal estimado: ${fmt(total)} COP${note ? `\n\nNota: ${note}` : ""}`;
    send.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  }
  $("#cartNote").addEventListener("input", updateSendLink);

  $("#cartItems").addEventListener("click", (e) => {
    const d = e.target.closest("[data-d]"), rm = e.target.closest("[data-rm]");
    if (d) { const l = cart[+d.dataset.i]; l.qty += +d.dataset.d; if (l.qty < 1) cart.splice(+d.dataset.i, 1); }
    else if (rm) cart.splice(+rm.dataset.rm, 1);
    else return;
    save(); renderCart();
  });

  const openCart = () => { cartEl.classList.add("open"); cartEl.setAttribute("aria-hidden", "false"); scrim.classList.add("show"); $("#cartClose").focus(); };
  const closeCart = () => { cartEl.classList.remove("open"); cartEl.setAttribute("aria-hidden", "true"); scrim.classList.remove("show"); };
  cartBtn.addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });
  renderCart();

  /* ---------- Team ---------- */
  $("#team").innerHTML = TEAM.map((m) => `
    <figure class="member" style="margin:0">
      <img src="/${m.img}" alt="${esc(m.name)}" loading="lazy" />
      <figcaption><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></figcaption>
    </figure>`).join("");

  /* ---------- Contact form (Netlify Forms, AJAX) ---------- */
  const cform = $("#contactForm"), status = $("#formStatus");
  cform.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = cform.querySelector("button[type=submit]");
    btn.disabled = true; status.textContent = "Enviando…";
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(cform)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      cform.reset();
      status.textContent = "¡Gracias! Recibimos tu mensaje y te responderemos pronto.";
    } catch {
      status.textContent = "No pudimos enviar tu mensaje. Escríbenos por WhatsApp al 317 401 6270.";
    } finally { btn.disabled = false; }
  });

  /* ---------- Toast ---------- */
  let tt;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400);
  }
})();
