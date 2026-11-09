// Site SkyElite : liste des vols (flights.json) et formulaire de réservation envoyé par Netlify Forms.
(() => {
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n));
const fmtDate = (d,t) => { const s = new Date(d+"T12:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"long",year:"numeric"}); return t ? `${s} · ${t} heure locale` : s; };
const plane = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V8.5l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-6z" transform="rotate(90 12 12)"/></svg>';
const S = { flights: [], region: "Tous", q: "", sel: null, mode: "entier" };

// Vignette selon la taille de l'appareil (images d'illustration).
function picFor(ac){
  const n = String(ac).toLowerCase();
  if (/global|g650|gulfstream|g-v|g550|g-iv|falcon 9|7500|8000|praetor 6|challenger 6|legacy 6/.test(n)) return "longrange";
  if (/mustang|m2|cj|hondajet|phenom 100|pc-?12|king air|hawker 4|nextant/.test(n)) return "light";
  return "midsize";
}

/* ---------- Vols ---------- */
function visibleFlights(){
  const today = new Date(); today.setHours(0,0,0,0);
  const q = S.q.trim().toLowerCase();
  return S.flights.filter(f => f.active !== false && new Date((f.dateEnd||f.date)+"T23:59") >= today)
    .filter(f => S.region === "Tous" || f.region === S.region)
    .filter(f => !q || [f.from,f.to,f.fromCity,f.toCity].join(" ").toLowerCase().includes(q))
    .sort((a,b) => a.date.localeCompare(b.date));
}
function renderFlights(){
  const regions = ["Tous", ...[...new Set(S.flights.map(f => f.region))].sort()];
  $("#regions").innerHTML = regions.map(r => `<button class="chip" data-region="${esc(r)}" aria-pressed="${r===S.region}">${esc(r)}</button>`).join("");
  const fl = visibleFlights();
  $("#count").textContent = `${fl.length} vol${fl.length>1?"s":""}`;
  $("#list").innerHTML = fl.length ? fl.map(f => {
    const seat = Math.ceil(f.priceTotal / f.seats);
    return `<article class="card">
      <div class="pic"><img src="img/${picFor(f.aircraft)}.jpg" alt="" loading="lazy"></div>
      <div class="main">
        <div class="route"><div class="ap"><div class="code">${esc(f.from)}</div><div class="city">${esc(f.fromCity)}</div></div><div class="path">${plane}</div><div class="ap r"><div class="code">${esc(f.to)}</div><div class="city">${esc(f.toCity)}</div></div></div>
        <div class="meta"><span><b>${esc(fmtDate(f.date,f.time))}</b>${f.dateEnd?` · départ flexible jusqu'au ${esc(new Date(f.dateEnd+"T12:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"}))}`:""}</span><span><b>${esc(f.aircraft)}</b></span><span>${f.seats} places</span></div>
      </div>
      <div class="stub">
        <div><div class="label">Vol entier</div><div class="price">${eur(f.priceTotal)}</div><div class="co">Cofinancement possible dès <b>${eur(seat)}/pers.</b> · ${f.seats} personnes max</div></div>
        <button class="btn small" data-book="${esc(f.id)}">Réserver ce vol</button>
      </div>
    </article>`; }).join("") : `<div class="empty">Aucun vol pour cette recherche. Essayez une autre ville ou demandez un autre trajet.</div>`;
}

/* ---------- Formulaire ---------- */
function openForm(f){
  S.sel = f; S.mode = "entier";
  $("#fResult").innerHTML = ""; $("#fErr").hidden = true; $("#fSend").disabled = false; $("#fSend").hidden = false;
  $("#routeField").hidden = !!f;
  if (f) {
    $("#fTitle").textContent = `${f.fromCity} → ${f.toCity}`;
    $("#fSummary").innerHTML = `<div class="r1">${esc(f.from)} → ${esc(f.to)}</div><div>${esc(fmtDate(f.date,f.time))}</div><div class="note">${esc(f.aircraft)} · ${f.seats} places</div>`;
  } else {
    $("#fTitle").textContent = "Autre trajet";
    $("#fSummary").innerHTML = `<div>Indiquez le trajet et la date souhaités : nous cherchons un empty leg ou un vol adapté et revenons vers vous avec une proposition.</div>`;
  }
  drawForm();
  $("#sheet").hidden = false; document.body.style.overflow = "hidden";
  setTimeout(() => $(f ? "#fName" : "#fRoute").focus(), 50);
}
function closeForm(){ $("#sheet").hidden = true; document.body.style.overflow = ""; }
function options(n){ return Array.from({length:n},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join(""); }
function drawForm(){
  const f = S.sel;
  if (f) {
    const seat = Math.ceil(f.priceTotal / f.seats);
    $("#fOpts").hidden = false;
    $("#fOpts").innerHTML = `<button type="button" class="opt" data-mode="entier" aria-pressed="${S.mode==="entier"}"><span class="t">Avion entier</span><span class="p">${eur(f.priceTotal)}</span><span class="d">Privatisé, jusqu'à ${f.seats} passagers</span></button>
      <button type="button" class="opt" data-mode="cofinancement" aria-pressed="${S.mode==="cofinancement"}"><span class="t">Cofinancement</span><span class="p">dès ${eur(seat)}</span><span class="d">par personne, ${f.seats} personnes max</span></button>`;
    const keepSeats = Number($("#fSeats").value)||1, keepPax = Number($("#fPax").value)||1;
    $("#fSeats").innerHTML = options(f.seats); $("#fSeats").value = String(Math.min(keepSeats,f.seats));
    $("#fPax").innerHTML = options(f.seats); $("#fPax").value = String(Math.min(keepPax,f.seats));
    $("#seatsField").hidden = S.mode !== "cofinancement"; $("#paxField").hidden = S.mode !== "entier";
    const n = Number($("#fSeats").value)||1;
    $("#fTotal").innerHTML = S.mode === "entier"
      ? `<span>Prix de l'avion entier</span><b>${eur(f.priceTotal)}</b>`
      : `<span>${n} place${n>1?"s":""} × dès ${eur(seat)}</span><b>dès ${eur(seat*n)}</b>`;
  } else {
    $("#fOpts").hidden = true; $("#seatsField").hidden = true; $("#paxField").hidden = false;
    $("#fPax").innerHTML = options(16);
    $("#fTotal").innerHTML = `<span>Prix</span><b>sur proposition</b>`;
  }
}
async function submit(e){
  e.preventDefault();
  const err = m => { $("#fErr").textContent = m; $("#fErr").hidden = false; };
  $("#fErr").hidden = true;
  if (!S.sel && !$("#fRoute").value.trim()) return err("Indiquez le trajet et la date souhaités.");
  if (!$("#fName").value.trim()) return err("Indiquez votre nom.");
  if (!$("#fPhone").value.trim()) return err("Indiquez un numéro de téléphone pour que nous puissions vous rappeler.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($("#fEmail").value.trim())) return err("Indiquez une adresse e-mail valide.");
  if (!$("#fOk").checked) return err("Cochez la case d'accord pour que nous puissions traiter votre demande.");
  const f = S.sel, n = S.mode === "cofinancement" ? Number($("#fSeats").value) : Number($("#fPax").value);
  const seat = f ? Math.ceil(f.priceTotal / f.seats) : 0;
  $("#hVol").value = f ? `${f.from} → ${f.to} (${f.fromCity} → ${f.toCity}), ${fmtDate(f.date,f.time)}, ${f.aircraft}` : "Autre trajet";
  $("#hFormule").value = f ? (S.mode === "entier" ? "Avion entier" : "Cofinancement") : "Sur mesure";
  $("#hNombre").value = `${n} ${S.mode === "cofinancement" ? "place(s)" : "passager(s)"}`;
  $("#hPrix").value = f ? (S.mode === "entier" ? eur(f.priceTotal) : `dès ${eur(seat*n)}`) : "sur proposition";
  $("#fSend").disabled = true;
  try {
    const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData($("#form"))).toString() });
    if (!res.ok) throw new Error(res.status);
    $("#fSend").hidden = true;
    $("#fResult").innerHTML = `<div class="done">Merci, votre demande est envoyée. SkyElite vérifie la disponibilité auprès de l'opérateur et vous recontacte rapidement par téléphone ou par e-mail.</div>`;
  } catch (_) {
    $("#fSend").disabled = false;
    $("#fResult").innerHTML = `<div class="fallback"><b>L'envoi n'a pas abouti.</b><span>Vérifiez votre connexion et réessayez, ou écrivez-nous en message privé sur Instagram : <a href="https://ig.me/m/SkyElite" target="_blank" rel="noopener">@SkyElite</a>.</span></div>`;
  }
}

/* ---------- Interactions ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("[data-go],[data-scroll],[data-open-custom],[data-region],[data-book],[data-mode],#custom,#close,#shade"); if (!t) return;
  if (t.dataset.go) return window.scrollTo({ top: 0 });
  if (t.dataset.scroll) { const el = document.getElementById(t.dataset.scroll); const top = el.getBoundingClientRect().top + window.scrollY - document.querySelector(".nav").offsetHeight - 8; return window.scrollTo({ top }); }
  if (t.hasAttribute("data-open-custom") || t.id === "custom") return openForm(null);
  if (t.dataset.region) { S.region = t.dataset.region; return renderFlights(); }
  if (t.dataset.book) return openForm(S.flights.find(f => f.id === t.dataset.book));
  if (t.dataset.mode) { S.mode = t.dataset.mode; return drawForm(); }
  if (t.id === "close" || t.id === "shade") return closeForm();
});
document.addEventListener("change", e => { if (e.target.id === "fSeats" || e.target.id === "fPax") drawForm(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheet").hidden) closeForm(); });
$("#q").addEventListener("input", e => { S.q = e.target.value; renderFlights(); });
$("#form").addEventListener("submit", submit);

fetch("flights.json", { cache: "no-cache" }).then(r => r.json()).then(list => {
  S.flights = list.filter(f => f.from && f.to && f.priceTotal && f.seats);
  renderFlights();
}).catch(() => { $("#list").innerHTML = `<div class="empty">Impossible de charger les vols. Rechargez la page.</div>`; });
})();
