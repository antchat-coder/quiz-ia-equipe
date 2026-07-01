/**
 * Données du quiz « Niveau IA de l'équipe ».
 * Reprises 1:1 du script Apps Script d'origine (quizz-ia-form.gs).
 *
 *  - blocA / blocB : NON notés (identité + inventaire des abonnements)
 *  - blocC         : NOTÉ, 1 point par question (20 pts au total)
 *
 * Types de question :
 *   'text'      -> réponse libre courte
 *   'textarea'  -> réponse libre longue
 *   'choice'    -> QCM à une seule réponse (radio)
 *   'scale'     -> échelle 1..5
 *   'grid'      -> tableau lignes × colonnes (une réponse par ligne)
 *   'qcm'       -> QCM noté, une bonne réponse (correct = index)
 *   'qcmMulti'  -> cases à cocher notées, tout-ou-rien (correct = [indices])
 */

const QUIZ = {
  titre: "Quiz — Niveau IA de l'équipe",
  sousTitre: "Outils, lexique & abonnements",
  intro:
    "Ce quiz situe le niveau de chacun sur les outils et le vocabulaire IA " +
    "(supports internes : « Claude Code » et « IA locale & RAG ») et fait l'inventaire des abonnements. " +
    "≈ 15 min · réponses individuelles · le score s'affiche à la fin. " +
    "Répondez de mémoire : l'objectif est de mesurer, pas de piéger.",

  // -----------------------------------------------------------------------
  //  BLOC A — Identité & auto-évaluation (NON noté)
  // -----------------------------------------------------------------------
  blocA: {
    titre: "A. Qui êtes-vous ?",
    aide: "Pour croiser les résultats par rôle. Non noté.",
    questions: [
      { id: "email", type: "text", inputType: "email", required: true,
        titre: "Votre email",
        aide: "Sert à identifier votre réponse (une par personne)." },
      { id: "nom", type: "text", required: true, titre: "Nom / Prénom" },
      { id: "role", type: "choice", required: true, titre: "Votre rôle",
        autre: true,
        choix: ["Développeur back (C#/.NET)", "Développeur front (Angular)",
                "Développeur fullstack", "Chef de projet / PO", "Autre"] },
      { id: "aisance", type: "scale", required: true,
        titre: "Votre aisance ressentie avec les outils IA au quotidien",
        min: 1, max: 5, labelMin: "1 — Débutant", labelMax: "5 — Expert" },
      { id: "frequence", type: "choice", required: true,
        titre: "À quelle fréquence utilisez-vous un assistant IA pour coder / travailler ?",
        choix: ["Jamais", "Quelques fois par mois", "Quelques fois par semaine",
                "Tous les jours", "Plusieurs fois par jour"] }
    ]
  },

  // -----------------------------------------------------------------------
  //  BLOC B — Abonnements IA (NON noté, inventaire)
  // -----------------------------------------------------------------------
  blocB: {
    titre: "B. Vos abonnements IA",
    aide: "Inventaire des accès disponibles dans l'équipe. Non noté. " +
          "Pour chaque outil, indiquez comment vous y accédez.",
    questions: [
      { id: "inventaire", type: "grid", required: true,
        titre: "Pour chaque outil, quel est votre accès ?",
        lignes: ["ChatGPT (OpenAI)", "Claude (Anthropic)", "GitHub Copilot",
                 "Google Gemini", "Mistral / Le Chat", "Perplexity",
                 "Mammouth (mammouth.ai)",
                 "Cursor / Windsurf (IDE IA)", "Un LLM local (Ollama / LM Studio…)"],
        colonnes: ["Version gratuite", "Payé perso (perso)",
                   "Payé / fourni par l'entreprise (pro)", "Je n'utilise pas"] },
      { id: "autres_outils", type: "textarea", required: false,
        titre: "Autres outils / abonnements IA non listés ci-dessus ?" }
    ]
  },

  // -----------------------------------------------------------------------
  //  BLOC C — Lexique & outils (NOTÉ) — 1 point / question
  // -----------------------------------------------------------------------
  blocC: {
    titre: "C. Lexique & outils IA — partie notée",
    aide: "Basé sur les 2 supports internes. Une seule bonne réponse par question, sauf mention.",
    questions: [
      { id: "c1", type: "qcm", points: 1, correct: 1,
        titre: "1. Qu'est-ce qui distingue un AGENT d'un simple chatbot / LLM ?",
        choix: ["Il répond plus vite",
                "Il produit des ACTIONS sur le repo (lit, édite, lance les commandes) et BOUCLE jusqu'au résultat",
                "Il utilise un modèle plus gros",
                "Il fonctionne uniquement en local"],
        fbBon: "Exact : l'agent agit et reboucle (Lire → Planifier → Exécuter → Observer → Corriger).",
        fbMauvais: "Un chatbot produit du texte ; un agent produit des actions et boucle jusqu'au résultat." },

      { id: "c2", type: "qcm", points: 1, correct: 2,
        titre: "2. Dans la boucle agentique (Lire → Planifier → Exécuter → Observer → Corriger), quelle étape fait la vraie différence avec un chatbot ?",
        choix: ["Planifier", "Exécuter", "Observer (il lit le résultat réel de ses actions)", "Lire"],
        fbBon: "Oui : « Observer » — l'agent voit la sortie / l'erreur réelle, ce qu'un chatbot ne peut pas faire.",
        fbMauvais: "C'est « Observer » : voir le résultat réel (sortie de test/erreur) pour corriger." },

      { id: "c3", type: "qcm", points: 1, correct: 1,
        titre: "3. CLAUDE.md vs Skill : lequel est TOUJOURS chargé ?",
        choix: ["Le Skill", "CLAUDE.md (règles non négociables du repo, toujours chargées)",
                "Les deux en permanence", "Aucun, tout est chargé à la demande"],
        fbBon: "Exact : CLAUDE.md = toujours vrai/toujours chargé ; un Skill = chargé à la demande.",
        fbMauvais: "CLAUDE.md est toujours chargé ; un Skill n'est chargé que si sa description colle à la tâche." },

      { id: "c4", type: "qcm", points: 1, correct: 1,
        titre: "4. Un Skill, concrètement, c'est…",
        choix: ["Un plugin binaire à compiler",
                "Un dossier avec un fichier SKILL.md (frontmatter YAML name + description, puis instructions markdown), chargé à la demande",
                "Une clé API", "Un serveur distant"],
        fbBon: "Oui : SKILL.md + frontmatter (name/description) → chargement progressif quand la description matche.",
        fbMauvais: "Un Skill = un dossier + SKILL.md (frontmatter name/description) chargé à la demande." },

      { id: "c5", type: "qcm", points: 1, correct: 0,
        titre: "5. MCP signifie…",
        choix: ["Model Context Protocol", "Multi-Cloud Platform",
                "Managed Compute Provider", "Model Compression Pipeline"],
        fbBon: "Exact : Model Context Protocol.",
        fbMauvais: "MCP = Model Context Protocol." },

      { id: "c6", type: "qcm", points: 1, correct: 1,
        titre: "6. Skill vs serveur MCP : la bonne distinction est…",
        choix: ["Le Skill donne des capacités, le MCP donne des instructions",
                "Le Skill dit COMMENT se comporter (instructions), le MCP donne de NOUVELLES capacités (outils/connexions externes)",
                "Ce sont deux mots pour la même chose", "Le MCP remplace CLAUDE.md"],
        fbBon: "Oui : Skill = COMMENT (markdown) ; MCP = nouvelles capacités (lire une issue, ouvrir une PR, interroger une DB…).",
        fbMauvais: "Skill = COMMENT se comporter ; MCP = nouvelles capacités / connexions externes." },

      { id: "c7", type: "qcmMulti", points: 1, correct: [0, 1, 2],
        titre: "7. Le « harnais » de sécurité autour de l'agent inclut… (plusieurs réponses)",
        choix: ["Branche dédiée + tests obligatoires, pas de commit automatique",
                "Pré-vol : l'agent annonce les fichiers qu'il compte modifier",
                "Post-vol : résumé du diff + statut des tests, relu par un humain",
                "Laisser l'agent committer et pousser en autonomie totale"],
        fbBon: "Le harnais = pré-vol / exécution cadrée / post-vol relu. Jamais « IA en roue libre »." },

      { id: "c8", type: "qcm", points: 1, correct: 1,
        titre: "8. Signal ROUGE à surveiller pendant une tâche agentique :",
        choix: ["Les tests passent en 1 à 3 boucles",
                "L'agent modifie les tests pour masquer le bug (ou >3 boucles sans progrès)",
                "L'agent lit plusieurs fichiers", "L'agent propose un plan"],
        fbBon: "Exact : modifier les tests pour cacher le bug (ou boucler sans progrès) = rouge, on reprend la main.",
        fbMauvais: "Rouge = l'agent triche sur les tests / boucle sans progrès. Vert = tests en hausse, scope respecté." },

      { id: "c9", type: "qcm", points: 1, correct: 1,
        titre: "9. Où « vit » Claude Code ?",
        choix: ["Uniquement dans un onglet de navigateur",
                "Dans le terminal, l'IDE (VS Code / JetBrains) et une app bureau — là où on code",
                "Uniquement sur un serveur cloud", "Dans un tableur"],
        fbBon: "Oui : il vit là où tu travailles et accède au dépôt (lecture, édition, commandes du projet).",
        fbMauvais: "Claude Code vit dans le terminal / l'IDE / l'app bureau, avec accès au repo." },

      { id: "c10", type: "qcm", points: 1, correct: 1,
        titre: "10. RAG signifie…",
        choix: ["Rapid Access Gateway", "Retrieval-Augmented Generation",
                "Random Answer Generator", "Remote API Gateway"],
        fbBon: "Exact : Retrieval-Augmented Generation — on retrouve les passages pertinents et on les injecte dans le prompt.",
        fbMauvais: "RAG = Retrieval-Augmented Generation (retrouver vos passages et les injecter dans le prompt)." },

      { id: "c11", type: "qcmMulti", points: 1, correct: [0, 1, 2, 3],
        titre: "11. Les 4 étapes d'un pipeline RAG sont : (cochez les 4)",
        choix: ["Ingestion (extraction du texte)", "Chunking (découpage en morceaux)",
                "Embeddings (vectorisation des chunks)",
                "Retrieval + génération (récupérer les chunks proches, puis répondre)",
                "Fine-tuning du modèle", "Quantization des poids"],
        fbBon: "Ingestion → Chunking → Embeddings → Retrieval+génération. Ni fine-tuning ni quantization dans le RAG." },

      { id: "c12", type: "qcm", points: 1, correct: 1,
        titre: "12. La « quantization » d'un modèle, c'est…",
        choix: ["Augmenter le nombre de paramètres",
                "Compresser les poids (8, 5, 4 bits…) pour réduire la mémoire requise, avec une perte de qualité maîtrisée",
                "Chiffrer le modèle", "Le découper en chunks"],
        fbBon: "Exact : on passe de FP16 à moins de bits/poids pour tenir en mémoire.",
        fbMauvais: "Quantization = compresser les poids (moins de bits) pour réduire la mémoire, perte maîtrisée." },

      { id: "c13", type: "qcm", points: 1, correct: 2,
        titre: "13. Sur une machine « moyenne », quel niveau de quantization est le défaut le plus courant (meilleur rapport taille/qualité) ?",
        choix: ["Q8", "Q2", "Q4_K_M", "FP16"],
        fbBon: "Oui : Q4_K_M est le défaut le plus répandu.",
        fbMauvais: "Q4_K_M = le compromis par défaut le plus courant. Q8 si on a la mémoire, Q2 seulement en dernier recours." },

      { id: "c14", type: "qcm", points: 1, correct: 1,
        titre: "14. GGUF, c'est…",
        choix: ["Un modèle spécifique",
                "Le format de fichier standard des modèles côté llama.cpp / Ollama / LM Studio",
                "Une base vectorielle", "Un protocole réseau"],
        fbBon: "Exact : GGUF = le format de fichier standard (llama.cpp / Ollama / LM Studio).",
        fbMauvais: "GGUF = format de fichier standard des modèles quantizés (llama.cpp/Ollama/LM Studio)." },

      { id: "c15", type: "qcm", points: 1, correct: 1,
        titre: "15. Ollama vs LM Studio : la différence principale est…",
        choix: ["Ollama est payant, LM Studio gratuit",
                "Ollama est CLI-first / scriptable (« le Docker des LLM ») ; LM Studio est une app desktop à GUI riche",
                "Ollama ne tourne que sur Mac", "LM Studio n'expose pas d'API"],
        fbBon: "Oui : Ollama = CLI/serveur/automatisation ; LM Studio = GUI, exploration, « Chat with Documents ».",
        fbMauvais: "Ollama = CLI-first, scriptable ; LM Studio = GUI desktop. Les deux exposent une API compatible OpenAI." },

      { id: "c16", type: "qcm", points: 1, correct: 0,
        titre: "16. Les deux (Ollama et LM Studio) exposent en local une API…",
        choix: ["compatible OpenAI (on change juste l'URL de base et la clé)",
                "propriétaire incompatible", "uniquement GraphQL", "accessible seulement en SSH"],
        fbBon: "Exact : API compatible OpenAI en local — le code existant marche en changeant l'URL de base.",
        fbMauvais: "Les deux exposent une API compatible OpenAI en local (Ollama :11434, LM Studio :1234)." },

      { id: "c17", type: "qcm", points: 1, correct: 1,
        titre: "17. Pour faire tourner un LLM localement rapidement, la ressource qui « décide de tout » est…",
        choix: ["Le nombre de cœurs CPU",
                "La VRAM (mémoire GPU) — c'est elle qui détermine quel modèle vous pouvez charger",
                "La vitesse du disque SSD", "La bande passante réseau"],
        fbBon: "Exact : la VRAM (ou mémoire unifiée sur Apple Silicon) décide du modèle chargeable.",
        fbMauvais: "C'est la VRAM (mémoire GPU / unifiée) qui décide quel modèle tient et tourne vite." },

      { id: "c18", type: "qcmMulti", points: 1, correct: [0, 1, 2],
        titre: "18. Parmi ces outils, lesquels sont des BASES VECTORIELLES ? (plusieurs réponses)",
        choix: ["Chroma", "Qdrant", "FAISS", "Ollama", "LangChain"],
        fbBon: "Chroma, Qdrant, FAISS = bases/index vectoriels. Ollama = runtime LLM, LangChain = orchestration." },

      { id: "c19", type: "qcm", points: 1, correct: 1,
        titre: "19. Un « modèle d'embeddings » (ex. nomic-embed-text, bge-m3) sert à…",
        choix: ["Générer des images",
                "Transformer chaque chunk de texte en vecteur pour la recherche par similarité",
                "Compresser le modèle", "Accélérer le GPU"],
        fbBon: "Exact : l'embedding transforme le texte en vecteur → recherche par similarité cosinus dans le RAG.",
        fbMauvais: "Un modèle d'embeddings vectorise le texte (chunks + question) pour la recherche par similarité." },

      { id: "c20", type: "qcm", points: 1, correct: 0,
        titre: "20. La vitesse d'un LLM local se mesure en tokens/seconde. Repère de confort pour du chat fluide :",
        choix: ["> 15 t/s = fluide", "< 1 t/s suffit", "Peu importe la vitesse", "100 t/s minimum obligatoire"],
        fbBon: "Oui : > 15 t/s = fluide ; 5–10 t/s utilisable ; < 5 t/s pénible en interactif.",
        fbMauvais: "Repère : > 15 t/s fluide, 5–10 t/s utilisable, < 5 t/s pénible en chat (OK en batch)." }
    ]
  },

  confirmation:
    "Merci ! Votre score est affiché ci-dessous. " +
    "Les résultats agrégés (stats par question) seront partagés à l'équipe."
};

// Rend QUIZ accessible aux autres scripts.
window.QUIZ = QUIZ;
