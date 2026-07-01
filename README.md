# Quiz — Niveau IA de l'équipe (projet web)

Version **site web** du quiz (à la place du Google Form généré par Apps Script).
Interface 100 % **HTML / CSS / JS pur** (aucun build, aucune dépendance).
Les réponses de l'équipe sont enregistrées dans un **Google Sheet**.

## Structure

```
index.html            ← la page du quiz
css/styles.css        ← le style
js/quiz-data.js       ← les questions + bonnes réponses (bloc A/B/C)
js/config.js          ← 1 seule ligne à remplir : l'URL du Sheet
js/app.js             ← rendu, validation, scoring, envoi
backend/endpoint.gs   ← mini-endpoint Google (à déployer une fois)
```

## Comment ça marche

- L'utilisateur répond dans le navigateur.
- Le **score est calculé côté navigateur** (bloc C, 20 points) et affiché avec la correction.
- À la validation, les réponses sont envoyées à un petit **endpoint Apps Script**
  (`backend/endpoint.gs`) qui les écrit dans un Google Sheet — c'est ce Sheet qui te
  donne l'agrégation / les stats pour toute l'équipe.

> Le site est du HTML/JS pur ; l'endpoint Google sert seulement de **boîte aux lettres**
> vers le Sheet (un navigateur seul ne peut pas stocker de données partagées).

---

## Étape 1 — Tester le site en local

Le quiz marche tout de suite, **sans** rien configurer : il calcule le score mais
n'enregistre pas encore (mode test).

- Double-clic sur `index.html`, **ou** (recommandé) lance un petit serveur local :

```bash
# Python
python -m http.server 5500
# puis ouvre http://localhost:5500
```

## Étape 2 — Brancher le Google Sheet (enregistrement des réponses)

1. Crée un Google Sheet vierge → [sheets.new](https://sheets.new).
2. Menu **Extensions → Apps Script**.
3. Colle le contenu de `backend/endpoint.gs` à la place du code par défaut, **Enregistre**.
4. **Déployer → Nouveau déploiement → Application Web**
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde**
5. Autorise l'accès, puis **copie l'URL** qui se termine par `/exec`.
6. Ouvre `js/config.js` et colle l'URL :

```js
window.CONFIG = { ENDPOINT_URL: "https://script.google.com/macros/s/AKf.../exec" };
```

7. Recharge le site, réponds, valide → une ligne apparaît dans l'onglet **« Réponses »** du Sheet.

> Vérif rapide : ouvre l'URL `/exec` dans le navigateur, tu dois voir un petit
> JSON `{"ok":true,...}`. Si oui, l'endpoint est en ligne.

## Étape 3 — Héberger le site (pour l'envoyer à l'équipe)

Le site est statique : héberge-le où tu veux, par exemple

- **GitHub Pages** : pousse le dossier, active Pages sur la branche `main`.
- **Netlify / Vercel** : glisse-dépose le dossier.
- **Un partage réseau interne** qui sert des fichiers statiques.

Partage ensuite l'URL du site à l'équipe.

---

## Agréger les résultats

Dans le Google Sheet, la colonne `score` donne la note /20, et chaque colonne
`c1_ok … c20_ok` vaut `1`/`0` (bonne/mauvaise réponse) — pratique pour un
`=MOYENNE()` par question et repérer les notions à retravailler.

## Modifier les questions

Tout est dans `js/quiz-data.js` (une entrée par question, avec `correct`,
`fbBon`, `fbMauvais`). Aucun autre fichier à toucher.
