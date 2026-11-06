# Emploi Social (Suisse)

Application locale pour trouver des offres d'emploi du **secteur social en Suisse**
(éducateur·rice social·e ES/HES, ASE, EDE, assistant·e social·e, curateur·rice, MSP,
animateur·rice socioculturel·le, job coach, ASA, responsable d'unité…) et envoyer ses
candidatures **uniquement après autorisation explicite**.

## Ce que fait l'application

- **Vraies offres suisses**, sans inscription : recherche sur
  [job-room.ch](https://www.job-room.ch), la bourse de l'emploi publique de la Confédération
  (SECO), qui regroupe aussi des annonces de jobup, jobs.ch, jobscout24…
  - Filtres : cantons (raccourci « Suisse romande »), taux d'activité, durée indéterminée/déterminée,
    date de publication, recherche libre.
  - Mots-clés en français **et en allemand** (Sozialpädagoge, Fachperson Betreuung…).
  - Les annonces hors métiers sociaux (soins, administration…) sont masquées, les doublons fusionnés.
- **Ajout manuel** des offres vues ailleurs (sozialinfo.ch, sites de fondations…).
- **Score de compatibilité** : métier, diplôme demandé (ES, HES, CFC ASE, EDE, MSP… et diplômes
  français), canton ou canton voisin, taux d'activité, langue de l'annonce, permis de conduire.
- **Lettre de motivation au format suisse**, adaptée au métier, avec taux, référence de l'annonce,
  autorisation de travail (permis B, C, G frontalier…). Version **PDF** mise en page pour les
  formulaires en ligne.
- **Dossier complet** : CV + certificats de travail + diplômes en pièces jointes.
- **Autorisation obligatoire** : rien ne part sans votre accord.
  - Vous relisez le contenu exact (destinataire, objet, lettre, documents) et cochez « J'autorise ».
  - L'autorisation porte sur une empreinte SHA-256 de ce contenu : si vous modifiez la lettre,
    le destinataire ou un document, elle est **annulée automatiquement**.
  - Le serveur refuse tout envoi non autorisé ; chaque autorisation et envoi est inscrit au journal.
  - Limite d'envois par jour (10 par défaut), modifiable.
- **Candidatures sur site** (le cas le plus fréquent en Suisse) : après autorisation, l'application
  copie la lettre, fournit le PDF, ouvre le formulaire de l'employeur, et vous confirmez le dépôt.
- **Suivi** : envoyée → entretien → acceptée/refusée, statistiques, relance proposée après 10 jours.
- **Vie privée** : tout est stocké sur votre ordinateur (`data/`), le serveur n'écoute qu'en local.

## Installation (Mac)

Prérequis : [Node.js](https://nodejs.org) version 22 ou plus récente.

```
cd emploi-social
npm install
npm start
```

Puis ouvrez **http://localhost:5175** et commencez par l'onglet **Profil** (canton, autorisation
de travail, diplômes, CV, certificats de travail).

Les offres sont réelles dès le départ. Les envois par e-mail sont **simulés** tant que l'e-mail
n'est pas configuré : ils sont enregistrés dans `data/outbox/*.eml` (ouvrables avec Mail).

## Envoyer réellement les e-mails

Copiez `.env.example` en `.env`, puis renseignez votre compte e-mail :

- **Gmail** : activez la validation en deux étapes, créez un
  [mot de passe d'application](https://myaccount.google.com/apppasswords), puis indiquez
  `SMTP_USER` (votre adresse) et `SMTP_PASS` (ce mot de passe).
- **Infomaniak, Bluewin…** : changez aussi `SMTP_HOST` (voir `.env.example`).

Relancez `npm start` : la pastille en haut passe de « Envoi simulé » à « Envoi réel ».

## Bon à savoir

- job-room.ch n'offre pas d'API publique documentée : l'application utilise l'interface de
  recherche du site. Si elle change, la recherche affichera une erreur (l'ajout manuel reste
  possible). Mode hors connexion avec offres fictives : `OFFRES_DEMO=1` dans `.env`.
- La plupart des annonces suisses se postulent via un formulaire en ligne, pas par e-mail.
- Pour un diplôme français, beaucoup d'employeurs demandent la reconnaissance du SEFRI.

## Développement

```
npm run dev       # serveur + interface avec rechargement (http://localhost:5173)
npm test          # tests du parcours d'autorisation et de la source suisse
npm run typecheck
```

- `server/` : API Express (`app.js`), autorisation et envoi (`envoi.js`), source job-room.ch
  (`jobRoom.js`), lettres, score, référentiel suisse.
- `web/` : interface React.
