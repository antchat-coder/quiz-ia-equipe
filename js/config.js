/**
 * Configuration du quiz.
 *
 *  ENDPOINT_URL : l'URL de ton déploiement Apps Script (Web App).
 *  Voir README.md → « Étape 2 : brancher le Google Sheet ».
 *
 *  Tant que l'URL est vide, le quiz fonctionne quand même :
 *  il calcule et affiche le score, mais N'ENVOIE PAS les réponses
 *  (utile pour tester le site avant d'avoir branché le Sheet).
 */
window.CONFIG = {
  // Colle ici l'URL qui se termine par /exec :
  ENDPOINT_URL: "https://script.google.com/macros/s/AKfycbzIFA5RtnivvRwOTLhUSr0x6yykUbDZ32oOj6RZnvZVW4yd42qe92n7GWEkz0oaeqjuSg/exec"
};
