# Emploi Social

Application locale pour trouver des offres d'emploi du **secteur social** (éducateur spécialisé,
moniteur-éducateur, AES, EJE, assistant de service social, CESF, TISF, CIP, chef de service…)
et envoyer ses candidatures **uniquement après autorisation explicite**.

## Ce que fait l'application

- **Offres** : recherche via l'API officielle France Travail (13 métiers du social), filtres par
  département, contrat et mots-clés ; ajout manuel des offres trouvées ailleurs.
- **Score de compatibilité** pour chaque offre (métier, diplôme d'État demandé, département,
  contrat, permis), avec les raisons affichées.
- **Brouillon automatique** : objet + lettre de motivation adaptée au métier, à partir de votre
  profil (diplômes, expériences, compétences). Tout reste modifiable.
- **Autorisation obligatoire** : rien ne part sans votre accord.
  - Vous relisez le contenu exact (destinataire, objet, lettre, CV) et cochez « J'autorise ».
  - L'autorisation porte sur une empreinte SHA-256 de ce contenu : si vous modifiez la lettre,
    le destinataire ou votre CV, elle est **annulée automatiquement**.
  - Le serveur refuse tout envoi non autorisé, et chaque autorisation/envoi est inscrit au journal.
  - Limite d'envois par jour (10 par défaut), modifiable.
- **Suivi** : envoyée → entretien → acceptée/refusée, statistiques, relance proposée après
  10 jours (la relance demande elle aussi votre autorisation).
- **Candidatures sur site** : quand l'offre n'a pas d'e-mail, l'application copie la lettre,
  ouvre le formulaire de l'employeur et vous confirmez le dépôt.
- **Vie privée** : tout est stocké sur votre ordinateur (`data/`), le serveur n'écoute qu'en local.

## Installation (Mac)

Prérequis : [Node.js](https://nodejs.org) version 22 ou plus récente.

```
cd emploi-social
npm install
npm start
```

Puis ouvrez **http://localhost:5175**. Commencez par l'onglet **Profil** (diplômes, département,
CV en PDF).

Sans configuration, l'application tourne en **mode découverte** : offres fictives et envois
simulés (les e-mails sont enregistrés dans `data/outbox/*.eml`, ouvrables avec Mail).

## Passer en réel

Copiez `.env.example` en `.env`, complétez, puis relancez `npm start`.

1. **Vraies offres (gratuit)** : créez un compte sur [francetravail.io](https://francetravail.io),
   créez une application abonnée à l'API « Offres d'emploi v2 », puis renseignez
   `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET`.
2. **Vrais envois depuis Gmail** : activez la validation en deux étapes, créez un
   [mot de passe d'application](https://myaccount.google.com/apppasswords), puis renseignez
   `SMTP_USER` (votre adresse Gmail) et `SMTP_PASS` (le mot de passe d'application).

Les pastilles en haut de l'écran indiquent le mode actif (« Offres d'exemple » / « France Travail »,
« Envoi simulé » / « Envoi réel »).

## Développement

```
npm run dev       # serveur + interface avec rechargement (http://localhost:5173)
npm test          # tests du parcours d'autorisation
npm run typecheck
```

- `server/` : API Express (`app.js`), autorisation et envoi (`envoi.js`), France Travail,
  lettres, score.
- `web/` : interface React.
