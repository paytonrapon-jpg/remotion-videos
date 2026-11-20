# Emploi Social (Suisse)

Application locale pour trouver des offres d'emploi du **secteur social en Suisse**
(éducateur·rice social·e ES/HES, ASE, EDE, assistant·e social·e, travailleur·euse social·e,
travailleur·euse social·e famille, référent·e social·e, conseiller·ère social·e, curateur·rice, MSP,
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
- **CV au format suisse** (onglet « Mon CV ») : données personnelles, photo facultative, expériences
  antichronologiques avec taux, formations, langues (CECR), informatique, références. **Import** d'un CV
  existant (PDF, Word .docx ou sauvegarde .json), **téléchargement en PDF** avec aperçu, et option
  « Joindre ce CV aux candidatures ».
- **Postuler par lien** : collez le lien d'une annonce (jobup.ch, jobs.ch, job-room.ch, site
  d'institution) ou son texte. L'offre est lue, puis le CV et la lettre sont **adaptés à l'employeur** :
  titre du CV, profil, compétences et missions mises en avant, lettre ciblée. Le CV adapté (PDF) est
  joint à cette candidature uniquement ; tout reste modifiable et soumis à votre autorisation.
- **Recherche autour de chez vous** : votre NPA est localisé (service public geo.admin.ch) et les
  offres sont filtrées par distance (10 à 120 km), avec la distance affichée et une **carte**.
- **Candidatures spontanées** : l'application repère les structures du social qui recrutent près de
  chez vous (annonces des 60 derniers jours, agences de placement exclues). Vous les ajoutez à votre
  liste, complétez le contact (direction, RH), ou importez votre propre liste (copier-coller depuis
  Excel). Une lettre spontanée personnalisée est préparée pour chacune ; vous les relisez **à la
  suite** et autorisez chaque envoi (l'e-mail manquant peut être saisi pendant la relecture).
- **Objectif hebdomadaire** de candidatures, avec barre de progression.
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

## Utiliser l'application depuis votre téléphone

Le téléphone doit être connecté au **même Wi-Fi** que le Mac. Sur le Mac, lancez :

```
npm run telephone
```

Le Terminal affiche l'adresse à ouvrir sur le téléphone (par ex. `http://192.168.1.23:5175`) et un
**mot de passe**, à saisir une fois sur la page de connexion (l'appareil reste connecté 30 jours). Le Mac doit rester allumé avec la fenêtre du Terminal ouverte. Si macOS
demande d'autoriser les connexions entrantes pour « node », cliquez sur **Autoriser**.

## Mettre l'application en ligne (Render) : téléphone, iPad, partout

Le fichier `render.yaml` (à la racine du dépôt) configure tout : serveur à Francfort, disque permanent
pour vos données (sauvegardé chaque jour par Render), mot de passe obligatoire.

1. Créez un compte sur https://render.com (bouton « Sign in with GitHub »).
2. **New → Blueprint**, choisissez le dépôt `remotion-videos` et la branche `emploi-social`.
3. Renseignez `MOT_DE_PASSE` (10 caractères ou plus) ; `ANTHROPIC_API_KEY` est facultatif.
4. Validez (**Deploy Blueprint**) et ajoutez un moyen de paiement si Render le demande
   (formule payante nécessaire pour le disque permanent).
5. Après quelques minutes, ouvrez l'adresse `https://emploi-social-….onrender.com` sur n'importe quel
   appareil, entrez le mot de passe, et ajoutez-la à l'écran d'accueil du téléphone.

Pour l'envoi réel des e-mails, ajoutez dans Render (**Environment**) les variables `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` décrites ci-dessous.

## Envoyer réellement les e-mails

Copiez `.env.example` en `.env`, puis renseignez votre compte e-mail :

- **Gmail** : activez la validation en deux étapes, créez un
  [mot de passe d'application](https://myaccount.google.com/apppasswords), puis indiquez
  `SMTP_USER` (votre adresse) et `SMTP_PASS` (ce mot de passe).
- **Infomaniak, Bluewin…** : changez aussi `SMTP_HOST` (voir `.env.example`).

Relancez `npm start` : la pastille en haut passe de « Envoi simulé » à « Envoi réel ».

## Adaptation par Claude (facultatif)

Sans configuration, l'adaptation du CV et de la lettre suit des règles simples (titre ciblé, compétences
et missions réordonnées selon les mots de l'annonce). Avec une clé API Anthropic, Claude réécrit le profil,
reformule les compétences au plus près de l'annonce, rédige une vraie lettre ciblée, signale les écarts
avec l'offre (diplôme, langue…) et lit aussi les CV importés bien plus fidèlement. Consigne donnée à
Claude : ne jamais inventer d'expérience, de diplôme ou de compétence.

Ajoutez dans `.env` : `ANTHROPIC_API_KEY=…` (clé à créer sur https://platform.claude.com). Chaque
adaptation coûte quelques centimes.

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
