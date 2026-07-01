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

// Permet de tester l'URL dans le navigateur (doit afficher un JSON "ok").
function doGet() {
  return json({ ok: true, service: 'quiz-ia-endpoint', ts: new Date().toISOString() });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
