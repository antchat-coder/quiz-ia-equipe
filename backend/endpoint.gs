/**
 * ============================================================================
 *  Endpoint « boîte aux lettres » — reçoit les réponses du site et les écrit
 *  dans le Google Sheet. C'est le SEUL bout de code Google restant : tu n'y
 *  touches jamais après le déploiement.
 * ============================================================================
 *
 *  INSTALLATION (une seule fois) :
 *   1. Crée un Google Sheet vierge (sheets.new).
 *   2. Menu  Extensions → Apps Script.
 *   3. Colle CE fichier à la place du code par défaut, puis Enregistre.
 *   4. Déployer → Nouveau déploiement → type « Application Web ».
 *        - Exécuter en tant que : Moi
 *        - Qui a accès : Tout le monde
 *   5. Autorise l'accès, puis COPIE l'URL qui se termine par /exec.
 *   6. Colle cette URL dans  js/config.js  →  ENDPOINT_URL.
 *
 *  Les réponses arrivent dans l'onglet « Réponses », une ligne par personne.
 *  Les colonnes sont créées automatiquement à partir des données reçues.
 * ============================================================================
 */

var NOM_ONGLET = 'Réponses';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // évite les collisions si 2 personnes valident en même temps

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(NOM_ONGLET) || ss.insertSheet(NOM_ONGLET);

    var data = JSON.parse(e.postData.contents);

    // En-têtes actuels (1re ligne).
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.join('') === '') headers = [];

    // Ajoute les nouvelles clés comme colonnes.
    Object.keys(data).forEach(function (k) {
      if (headers.indexOf(k) === -1) headers.push(k);
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Construit la ligne dans l'ordre des en-têtes.
    var row = headers.map(function (h) {
      var v = data[h];
      if (v === undefined || v === null) return '';
      return (typeof v === 'object') ? JSON.stringify(v) : v;
    });
    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * doGet :
 *   - sans paramètre        -> petit JSON "ok" (test navigateur)
 *   - ?action=stats         -> stats agrégées (JSON)
 *   - &callback=maFonction  -> réponse en JSONP (contourne le CORS pour le tableau de bord)
 */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  if (p.action === 'stats') {
    return respond(computeStats(), p.callback);
  }
  return respond({ ok: true, service: 'quiz-ia-endpoint', ts: new Date().toISOString() }, p.callback);
}

// Renvoie du JSON, ou du JSONP si un callback est fourni.
function respond(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json(obj);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
//  Calcul des statistiques agrégées (aucune donnée nominative renvoyée).
// ---------------------------------------------------------------------------
function computeStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(NOM_ONGLET);
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: true, participants: 0 };
  }

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rows = values.slice(1).filter(function (r) { return r.join('') !== ''; });
  var col = function (name) { return headers.indexOf(name); };

  var stats = {
    ok: true,
    participants: rows.length,
    scores: {},
    parQuestionOk: {},
    profil: { role: {}, aisance: {}, frequence: {} },
    usageIA: {}
  };

  // --- Scores (colonne "score") ---
  var sIdx = col('score');
  var scoreVals = [];
  if (sIdx !== -1) {
    rows.forEach(function (r) {
      var v = Number(r[sIdx]);
      if (!isNaN(v)) scoreVals.push(v);
    });
  }
  scoreVals.sort(function (a, b) { return a - b; });
  if (scoreVals.length) {
    var sum = scoreVals.reduce(function (a, b) { return a + b; }, 0);
    stats.scores = {
      moyenne: sum / scoreVals.length,
      min: scoreVals[0],
      max: scoreVals[scoreVals.length - 1],
      mediane: scoreVals[Math.floor((scoreVals.length - 1) / 2)],
      total: (col('total') !== -1 && rows.length) ? Number(rows[0][col('total')]) : 20,
      valeurs: scoreVals
    };
  }

  // --- Taux de réussite par question (colonnes c*_ok) ---
  headers.forEach(function (h) {
    if (/^c\d+_ok$/.test(h)) {
      var idx = col(h), tot = 0, ok = 0;
      rows.forEach(function (r) {
        var v = r[idx];
        if (v === '' || v === null || v === undefined) return;
        tot++;
        if (Number(v) === 1) ok++;
      });
      if (tot) stats.parQuestionOk[h] = ok / tot;
    }
  });

  // --- Profil (rôle / aisance / fréquence) ---
  function tally(colName, target) {
    var idx = col(colName);
    if (idx === -1) return;
    rows.forEach(function (r) {
      var v = ('' + r[idx]).trim();
      if (v === '') return;
      target[v] = (target[v] || 0) + 1;
    });
  }
  tally('role', stats.profil.role);
  tally('aisance', stats.profil.aisance);
  tally('frequence', stats.profil.frequence);

  // --- Usage IA : on ré-éclate la colonne "inventaire" ---
  // Format écrit par le site : "Outil → Accès ; Outil → Accès ; ..."
  var invIdx = col('inventaire');
  if (invIdx !== -1) {
    rows.forEach(function (r) {
      var s = '' + r[invIdx];
      if (!s) return;
      s.split(' ; ').forEach(function (pair) {
        var parts = pair.split(' → '); // " → "
        if (parts.length < 2) return;
        var tool = parts[0].trim();
        var acc = parts[1].trim();
        if (acc === '' || acc === '—') return; // "—"
        if (!stats.usageIA[tool]) stats.usageIA[tool] = {};
        stats.usageIA[tool][acc] = (stats.usageIA[tool][acc] || 0) + 1;
      });
    });
  }

  return stats;
}
