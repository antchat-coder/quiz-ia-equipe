/**
 * app.js — rendu du quiz, validation, scoring et envoi au Google Sheet.
 * Dépend de : quiz-data.js (window.QUIZ) et config.js (window.CONFIG).
 * Aucune dépendance externe. HTML/CSS/JS pur.
 */
(function () {
  "use strict";

  const QUIZ = window.QUIZ;
  const CONFIG = window.CONFIG || { ENDPOINT_URL: "" };

  const $ = (sel) => document.querySelector(sel);
  const form = $("#quizForm");
  const questionsEl = $("#questions");

  // Petit échappement HTML pour tout texte injecté.
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---- Rendu d'en-tête -----------------------------------------------------
  $("#quiz-titre").textContent = QUIZ.titre;
  $("#quiz-sous-titre").textContent = QUIZ.sousTitre;
  $("#quiz-intro").textContent = QUIZ.intro;
  document.title = QUIZ.titre;

  // ---- Rendu d'une question ------------------------------------------------
  function renderQuestion(q) {
    const req = q.required ? '<span class="req" title="obligatoire">*</span>' : "";
    let corps = "";

    switch (q.type) {
      case "text":
        corps =
          `<input class="in" type="${q.inputType || "text"}" name="${q.id}" ` +
          `id="${q.id}" ${q.required ? "required" : ""} autocomplete="off" />`;
        break;

      case "textarea":
        corps = `<textarea class="in" name="${q.id}" id="${q.id}" rows="3" ` +
                `${q.required ? "required" : ""}></textarea>`;
        break;

      case "scale": {
        let opts = "";
        for (let v = q.min; v <= q.max; v++) {
          opts +=
            `<label class="scale-opt"><input type="radio" name="${q.id}" value="${v}" ` +
            `${q.required ? "required" : ""}/><span>${v}</span></label>`;
        }
        corps =
          `<div class="scale"><span class="scale-lbl">${esc(q.labelMin)}</span>` +
          `<div class="scale-opts">${opts}</div>` +
          `<span class="scale-lbl">${esc(q.labelMax)}</span></div>`;
        break;
      }

      case "choice":
      case "qcm": {
        corps = '<div class="choices">';
        q.choix.forEach((c, i) => {
          corps +=
            `<label class="choice"><input type="radio" name="${q.id}" value="${i}" ` +
            `${q.required ? "required" : ""}/><span>${esc(c)}</span></label>`;
        });
        if (q.autre) {
          corps +=
            `<label class="choice choice-autre"><input type="radio" name="${q.id}" value="__autre__"/>` +
            `<span>Autre :</span><input class="in in-autre" type="text" name="${q.id}__autre" ` +
            `placeholder="précisez…" /></label>`;
        }
        corps += "</div>";
        break;
      }

      case "qcmMulti": {
        corps = '<div class="choices">';
        q.choix.forEach((c, i) => {
          corps +=
            `<label class="choice"><input type="checkbox" name="${q.id}" value="${i}"/>` +
            `<span>${esc(c)}</span></label>`;
        });
        corps += "</div>";
        break;
      }

      case "grid": {
        let head = "<th></th>" + q.colonnes.map((c) => `<th>${esc(c)}</th>`).join("");
        let rows = q.lignes
          .map((ligne, li) => {
            const cells = q.colonnes
              .map(
                (_, ci) =>
                  `<td><input type="radio" name="${q.id}__${li}" value="${ci}" ` +
                  `${q.required ? "required" : ""} aria-label="${esc(ligne)} — ${esc(q.colonnes[ci])}"/></td>`
              )
              .join("");
            return `<tr><th scope="row">${esc(ligne)}</th>${cells}</tr>`;
          })
          .join("");
        corps =
          `<div class="grid-wrap"><table class="grid"><thead><tr>${head}</tr></thead>` +
          `<tbody>${rows}</tbody></table></div>`;
        break;
      }
    }

    const noté = q.type === "qcm" || q.type === "qcmMulti";
    return (
      `<fieldset class="q ${noté ? "q-note" : ""}" data-qid="${q.id}" data-qtype="${q.type}">` +
      `<legend class="q-titre">${esc(q.titre)} ${req}</legend>` +
      (q.aide ? `<p class="q-aide">${esc(q.aide)}</p>` : "") +
      corps +
      `<p class="q-erreur" hidden>Merci de répondre à cette question.</p>` +
      `</fieldset>`
    );
  }

  // ---- Rendu d'un bloc -----------------------------------------------------
  function renderBloc(bloc) {
    return (
      `<section class="bloc">` +
      `<h2 class="bloc-titre">${esc(bloc.titre)}</h2>` +
      (bloc.aide ? `<p class="bloc-aide">${esc(bloc.aide)}</p>` : "") +
      bloc.questions.map(renderQuestion).join("") +
      `</section>`
    );
  }

  // Liste à plat de toutes les questions (pour validation + scoring).
  const toutesQuestions = []
    .concat(QUIZ.blocA.questions, QUIZ.blocB.questions, QUIZ.blocC.questions);

  questionsEl.innerHTML =
    renderBloc(QUIZ.blocA) + renderBloc(QUIZ.blocB) + renderBloc(QUIZ.blocC);

  // ---- Progression --------------------------------------------------------
  const progressBar = $("#progressBar");
  function majProgression() {
    const total = toutesQuestions.filter((q) => q.required).length;
    let faites = 0;
    toutesQuestions.forEach((q) => {
      if (q.required && estRepondue(q)) faites++;
    });
    const pct = total ? Math.round((faites / total) * 100) : 0;
    progressBar.style.width = pct + "%";
  }
  form.addEventListener("input", majProgression);
  form.addEventListener("change", majProgression);

  // ---- Lecture des réponses -----------------------------------------------
  function valeurChoixUnique(id) {
    const el = form.querySelector(`input[name="${id}"]:checked`);
    return el ? el.value : null;
  }

  function estRepondue(q) {
    switch (q.type) {
      case "text":
      case "textarea": {
        const el = form.querySelector(`[name="${q.id}"]`);
        return el && el.value.trim() !== "";
      }
      case "scale":
      case "choice":
      case "qcm": {
        const v = valeurChoixUnique(q.id);
        if (v === "__autre__") {
          const a = form.querySelector(`[name="${q.id}__autre"]`);
          return a && a.value.trim() !== "";
        }
        return v !== null;
      }
      case "qcmMulti":
        return form.querySelectorAll(`input[name="${q.id}"]:checked`).length > 0;
      case "grid":
        return q.lignes.every(
          (_, li) => form.querySelector(`input[name="${q.id}__${li}"]:checked`)
        );
    }
    return true;
  }

  // Réponse « lisible » d'une question (pour l'envoi + la correction).
  function reponseLisible(q) {
    switch (q.type) {
      case "text":
      case "textarea":
        return (form.querySelector(`[name="${q.id}"]`) || {}).value?.trim() || "";
      case "scale":
        return valeurChoixUnique(q.id) || "";
      case "choice":
      case "qcm": {
        const v = valeurChoixUnique(q.id);
        if (v === null) return "";
        if (v === "__autre__") {
          const a = form.querySelector(`[name="${q.id}__autre"]`);
          return "Autre : " + ((a && a.value.trim()) || "");
        }
        return q.choix[Number(v)];
      }
      case "qcmMulti": {
        const idx = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map(
          (e) => Number(e.value)
        );
        return idx.map((i) => q.choix[i]).join(" | ");
      }
      case "grid":
        return q.lignes
          .map((ligne, li) => {
            const el = form.querySelector(`input[name="${q.id}__${li}"]:checked`);
            return ligne + " → " + (el ? q.colonnes[Number(el.value)] : "—");
          })
          .join(" ; ");
    }
    return "";
  }

  // ---- Scoring ------------------------------------------------------------
  function estCorrecte(q) {
    if (q.type === "qcm") {
      return Number(valeurChoixUnique(q.id)) === q.correct;
    }
    if (q.type === "qcmMulti") {
      const choisis = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)]
        .map((e) => Number(e.value))
        .sort((a, b) => a - b);
      const attendus = [...q.correct].sort((a, b) => a - b);
      return (
        choisis.length === attendus.length &&
        choisis.every((v, i) => v === attendus[i])
      );
    }
    return false;
  }

  function calculerScore() {
    let score = 0,
      total = 0;
    QUIZ.blocC.questions.forEach((q) => {
      total += q.points || 1;
      if (estCorrecte(q)) score += q.points || 1;
    });
    return { score, total };
  }

  // ---- Validation ---------------------------------------------------------
  function validerFormulaire() {
    let premierManquant = null;
    toutesQuestions.forEach((q) => {
      const fs = form.querySelector(`fieldset[data-qid="${q.id}"]`);
      const errEl = fs.querySelector(".q-erreur");
      const ok = !q.required || estRepondue(q);
      errEl.hidden = ok;
      fs.classList.toggle("q-invalide", !ok);
      if (!ok && !premierManquant) premierManquant = fs;
    });
    return premierManquant;
  }

  // ---- Construction du payload envoyé au Sheet ----------------------------
  function construirePayload(score, total) {
    const data = { horodatage: new Date().toISOString(), score, total };
    toutesQuestions.forEach((q) => {
      const key = q.id === "inventaire" ? "inventaire" : q.id;
      data[key] = reponseLisible(q);
      if (q.type === "qcm" || q.type === "qcmMulti") {
        data[q.id + "_ok"] = estCorrecte(q) ? 1 : 0;
      }
    });
    return data;
  }

  // ---- Envoi au Google Sheet (Apps Script) --------------------------------
  async function envoyer(payload) {
    const url = (CONFIG.ENDPOINT_URL || "").trim();
    if (!url) {
      return { envoye: false, raison: "aucune URL configurée (mode test)" };
    }
    try {
      // text/plain => requête « simple », pas de pré-vol CORS.
      // mode no-cors => l'écriture passe même si la réponse est opaque.
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return { envoye: true };
    } catch (e) {
      return { envoye: false, raison: String(e) };
    }
  }

  // ---- Affichage des résultats --------------------------------------------
  function messageScore(pct) {
    if (pct >= 90) return "Excellent — tu maîtrises le sujet 🎯";
    if (pct >= 70) return "Solide — quelques détails à revoir 👍";
    if (pct >= 50) return "Correct — une relecture des supports fera la différence 📚";
    return "À consolider — les 2 supports internes t'aideront beaucoup 💪";
  }

  function afficherResultats(score, total, etatEnvoi) {
    const pct = total ? Math.round((score / total) * 100) : 0;
    $("#scoreVal").textContent = score;
    $(".score-den").textContent = "/ " + total;
    $("#scorePct").textContent = pct + " %";
    $("#scoreMsg").textContent = messageScore(pct);

    let confTxt = QUIZ.confirmation;
    if (!etatEnvoi.envoye) {
      confTxt +=
        etatEnvoi.raison && etatEnvoi.raison.indexOf("mode test") !== -1
          ? "  (Mode test : réponses non enregistrées — endpoint non configuré.)"
          : "  (⚠ L'enregistrement a échoué : " + esc(etatEnvoi.raison) + ")";
    }
    $("#confirmation").textContent = confTxt;

    // Correction détaillée (bloc noté uniquement)
    const corr = QUIZ.blocC.questions
      .map((q) => {
        const ok = estCorrecte(q);
        const bonnes =
          q.type === "qcm"
            ? q.choix[q.correct]
            : q.correct.map((i) => q.choix[i]).join(" · ");
        const fb = ok ? q.fbBon : q.fbMauvais || q.fbBon;
        return (
          `<div class="corr-item ${ok ? "corr-ok" : "corr-ko"}">` +
          `<div class="corr-head">${ok ? "✅" : "❌"} ${esc(q.titre)}</div>` +
          `<div class="corr-body">` +
          `<div><span class="corr-lbl">Votre réponse :</span> ${esc(reponseLisible(q) || "—")}</div>` +
          (ok ? "" : `<div><span class="corr-lbl">Bonne réponse :</span> ${esc(bonnes)}</div>`) +
          (fb ? `<div class="corr-fb">${esc(fb)}</div>` : "") +
          `</div></div>`
        );
      })
      .join("");
    $("#correction").innerHTML = corr;

    form.hidden = true;
    document.querySelector(".progress").hidden = true;
    $("#resultats").hidden = false;
    $("#resultats").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- Soumission ---------------------------------------------------------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const manquant = validerFormulaire();
    const errGlob = $("#erreurGlobale");
    if (manquant) {
      errGlob.hidden = false;
      errGlob.textContent = "Certaines questions obligatoires sont sans réponse.";
      manquant.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    errGlob.hidden = true;

    const btn = $("#submitBtn");
    const state = $("#submitState");
    btn.disabled = true;
    state.textContent = "Envoi en cours…";

    const { score, total } = calculerScore();
    const payload = construirePayload(score, total);
    const etatEnvoi = await envoyer(payload);

    state.textContent = "";
    afficherResultats(score, total, etatEnvoi);
  });

  // ---- Refaire le quiz ----------------------------------------------------
  $("#restartBtn").addEventListener("click", function () {
    form.reset();
    form.hidden = false;
    document.querySelector(".progress").hidden = false;
    $("#resultats").hidden = true;
    $("#submitBtn").disabled = false;
    majProgression();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  majProgression();
})();
