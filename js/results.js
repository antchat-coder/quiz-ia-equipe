/**
 * results.js — tableau de bord des résultats agrégés.
 * Récupère les stats depuis l'endpoint Apps Script en JSONP (pas de souci CORS)
 * et les affiche sous forme de barres. Dépend de quiz-data.js + config.js.
 */
(function () {
  "use strict";

  const CONFIG = window.CONFIG || {};
  const QUIZ = window.QUIZ;
  const $ = (s) => document.querySelector(s);

  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Palette de couleurs pour les barres catégorielles.
  const PALETTE = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899",
                   "#8b5cf6", "#14b8a6", "#ef4444", "#6366f1"];

  // ---- Chargement JSONP ----------------------------------------------------
  let cbSeq = 0;
  function chargerStats() {
    const url = (CONFIG.ENDPOINT_URL || "").trim();
    $("#erreur").hidden = true;
    if (!url) {
      montrerErreur("Aucune URL d'endpoint configurée dans js/config.js.");
      return;
    }
    $("#loading").hidden = false;

    const cbName = "__stats_cb_" + ++cbSeq;
    const timeout = setTimeout(function () {
      montrerErreur("Délai dépassé : l'endpoint ne répond pas. Vérifie le déploiement Apps Script.");
      nettoyer();
    }, 15000);

    function nettoyer() {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function (data) {
      clearTimeout(timeout);
      nettoyer();
      $("#loading").hidden = true;
      rendre(data);
    };

    const script = document.createElement("script");
    script.src =
      url + (url.indexOf("?") === -1 ? "?" : "&") +
      "action=stats&callback=" + cbName + "&_=" + Date.now();
    script.onerror = function () {
      clearTimeout(timeout);
      montrerErreur("Impossible de contacter l'endpoint (erreur réseau).");
      nettoyer();
    };
    document.head.appendChild(script);
  }

  function montrerErreur(msg) {
    $("#loading").hidden = true;
    const e = $("#erreur");
    e.hidden = false;
    e.textContent = "⚠ " + msg;
  }

  // ---- Rendu d'une série de barres ----------------------------------------
  // items : [{label, value, max, suffix, color, danger}]
  function barresHTML(items) {
    if (!items.length) return '<p class="card-aide">Pas de données.</p>';
    return items
      .map((it, i) => {
        const pct = it.max ? Math.round((it.value / it.max) * 100) : 0;
        const color = it.danger
          ? pct < 50 ? "#ef4444" : pct < 75 ? "#f59e0b" : "#10b981"
          : it.color || PALETTE[i % PALETTE.length];
        return (
          `<div class="bar-row">` +
          `<div class="bar-label" title="${esc(it.label)}">${esc(it.label)}</div>` +
          `<div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>` +
          `<div class="bar-val">${esc(it.display != null ? it.display : it.value)}</div>` +
          `</div>`
        );
      })
      .join("");
  }

  // Compte d'un dictionnaire {clé: nombre} -> items triés desc.
  function dictBarres(dict, opts) {
    opts = opts || {};
    const entries = Object.keys(dict).map((k) => [k, dict[k]]);
    if (opts.ordre) {
      entries.sort((a, b) => opts.ordre.indexOf(a[0]) - opts.ordre.indexOf(b[0]));
    } else {
      entries.sort((a, b) => b[1] - a[1]);
    }
    const max = entries.reduce((m, e) => Math.max(m, e[1]), 0) || 1;
    return entries.map(([k, v]) => ({
      label: k,
      value: v,
      max: max,
      display: v
    }));
  }

  // ---- Rendu principal -----------------------------------------------------
  function rendre(data) {
    if (!data || !data.ok) {
      montrerErreur("Réponse inattendue de l'endpoint.");
      return;
    }
    if (!data.participants) {
      $("#vide").hidden = false;
      $("#dash").hidden = true;
      return;
    }
    $("#vide").hidden = true;
    $("#dash").hidden = false;

    const sc = data.scores || {};
    const total = sc.total || 20;
    $("#scoreTotal").textContent = total;

    // --- KPIs ---
    const moyPct = sc.moyenne != null ? Math.round((sc.moyenne / total) * 100) : 0;
    $("#kpis").innerHTML = [
      kpi(data.participants, "participant" + (data.participants > 1 ? "s" : "")),
      kpi(sc.moyenne != null ? arrondi(sc.moyenne) + "/" + total : "—", "score moyen", moyPct + " %"),
      kpi(sc.max != null ? sc.max + "/" + total : "—", "meilleur score"),
      kpi(sc.min != null ? sc.min + "/" + total : "—", "score le plus bas")
    ].join("");

    // --- Distribution des scores ---
    const dist = {};
    for (let i = 0; i <= total; i++) dist[i] = 0;
    (sc.valeurs || []).forEach((v) => { dist[v] = (dist[v] || 0) + 1; });
    const distItems = Object.keys(dist)
      .map((k) => Number(k))
      .filter((k) => dist[k] > 0 || (k >= sc.min && k <= sc.max))
      .sort((a, b) => a - b)
      .map((k) => ({ label: k + " pts", value: dist[k], max: Math.max(...Object.values(dist)) || 1, display: dist[k], color: "#4f46e5" }));
    $("#scoreDist").innerHTML = barresHTML(distItems);

    // --- Taux de réussite par question ---
    const pq = data.parQuestionOk || {};
    const qItems = Object.keys(pq)
      .sort((a, b) => numQ(a) - numQ(b))
      .map((k) => {
        const n = numQ(k);
        const q = (QUIZ.blocC.questions || []).find((x) => x.id === "c" + n);
        const titre = q ? q.titre : "Question " + n;
        const pct = Math.round(pq[k] * 100);
        return { label: titre, value: pct, max: 100, display: pct + " %", danger: true };
      });
    $("#parQuestion").innerHTML = barresHTML(qItems);

    // --- Profil ---
    $("#profRole").innerHTML = barresHTML(dictBarres(data.profil.role || {}));
    $("#profAisance").innerHTML = barresHTML(
      dictBarres(data.profil.aisance || {}, { ordre: ["1", "2", "3", "4", "5"] })
    );
    $("#profFrequence").innerHTML = barresHTML(
      dictBarres(data.profil.frequence || {}, {
        ordre: ["Jamais", "Quelques fois par mois", "Quelques fois par semaine",
                "Tous les jours", "Plusieurs fois par jour"]
      })
    );

    // --- Usage IA (tableau lignes = outils, colonnes = accès) ---
    $("#usageTable").innerHTML = usageHTML(data.usageIA || {});

    // --- Horodatage ---
    $("#maj").textContent = "Mis à jour à " + new Date().toLocaleTimeString("fr-FR");
  }

  function usageHTML(usage) {
    const outils = (QUIZ.blocB.questions.find((q) => q.id === "inventaire") || {}).lignes || [];
    const cols = (QUIZ.blocB.questions.find((q) => q.id === "inventaire") || {}).colonnes || [];
    // On n'affiche pas la colonne "Je n'utilise pas" dans le total coloré, mais on la garde.
    const toolNames = outils.length ? outils : Object.keys(usage);
    let head = "<th>Outil</th>" + cols.map((c) => `<th>${esc(c)}</th>`).join("");
    const rows = toolNames
      .map((tool) => {
        const row = usage[tool] || {};
        const cells = cols
          .map((c) => {
            const n = row[c] || 0;
            const cls = n > 0 ? "u-has u-lvl-" + niveauAcces(c) : "u-zero";
            return `<td class="${cls}">${n || ""}</td>`;
          })
          .join("");
        return `<tr><th scope="row">${esc(tool)}</th>${cells}</tr>`;
      })
      .join("");
    return `<table class="usage"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  // Couleur selon le type d'accès (gratuit / perso / pro / non).
  function niveauAcces(c) {
    if (/pro/i.test(c)) return "pro";
    if (/perso/i.test(c)) return "perso";
    if (/gratuit/i.test(c)) return "free";
    return "none";
  }

  // ---- Petits utilitaires --------------------------------------------------
  function kpi(val, label, sub) {
    return (
      `<div class="kpi"><div class="kpi-val">${esc(val)}</div>` +
      `<div class="kpi-lbl">${esc(label)}</div>` +
      (sub ? `<div class="kpi-sub">${esc(sub)}</div>` : "") +
      `</div>`
    );
  }
  const numQ = (k) => Number(String(k).replace(/\D/g, ""));
  const arrondi = (x) => Math.round(x * 10) / 10;

  // ---- Init ----------------------------------------------------------------
  $("#refreshBtn").addEventListener("click", function () {
    $("#dash").hidden = true;
    $("#loading").hidden = false;
    chargerStats();
  });
  chargerStats();
})();
