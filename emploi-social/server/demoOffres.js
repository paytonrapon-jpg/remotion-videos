// Offres FICTIVES utilisées tant que l'API France Travail n'est pas configurée.
// Employeurs inventés, adresses e-mail en example.org (domaine réservé, jamais livré).
import { diplomesCites } from "./referentiel.js";

const jours = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const brut = [
  {
    id: "demo-01", intitule: "Éducateur spécialisé H/F – MECS", employeur: "Association Les Tilleuls (exemple)",
    lieu: "34 - Montpellier", departement: "34", contrat: "CDI", dureeTravail: "35 h, internat (week-ends 1 sur 3)",
    salaire: "CCN 66 – à partir de 2 150 € brut + prime Ségur", experience: "Débutant accepté", rome: "K1207",
    description: "Au sein d'une Maison d'Enfants à Caractère Social accueillant 24 adolescents (12-18 ans) confiés par l'ASE, vous assurez l'accompagnement éducatif au quotidien, co-construisez les projets personnalisés, travaillez en lien avec les familles et les partenaires (école, santé, juge des enfants). DE Éducateur spécialisé exigé. Permis B souhaité.",
    contactEmail: "recrutement@tilleuls.example.org", contactNom: "Mme Laurent, cheffe de service", publie: 1,
  },
  {
    id: "demo-02", intitule: "Moniteur-éducateur – Foyer d'hébergement adultes handicapés", employeur: "APF Sud (exemple)",
    lieu: "30 - Nîmes", departement: "30", contrat: "CDD", dureeTravail: "CDD 6 mois, temps plein", salaire: "CCN 66",
    experience: "1 an souhaité", rome: "K1207",
    description: "Accompagnement d'adultes en situation de handicap psychique dans les actes de la vie quotidienne, animation d'activités, participation aux réunions d'équipe pluridisciplinaire. DE Moniteur-éducateur ou DE Éducateur spécialisé.",
    contactEmail: "rh@apf-sud.example.org", publie: 3,
  },
  {
    id: "demo-03", intitule: "Accompagnant éducatif et social (AES) – MAS", employeur: "Résidence Les Oliviers (exemple)",
    lieu: "34 - Lunel", departement: "34", contrat: "CDI", dureeTravail: "Temps plein, horaires en 10 h", salaire: "2 000 € brut + Ségur",
    experience: "Débutant accepté", rome: "K1301",
    description: "Dans une Maison d'Accueil Spécialisée pour personnes polyhandicapées, vous accompagnez les résidents dans les soins d'hygiène, les repas et les activités de stimulation. DEAES ou AMP exigé.",
    contactEmail: "candidatures@oliviers.example.org", publie: 2,
  },
  {
    id: "demo-04", intitule: "Assistant de service social – Polyvalence de secteur", employeur: "Département (exemple)",
    lieu: "13 - Marseille 3e", departement: "13", contrat: "CDD", dureeTravail: "CDD 1 an renouvelable",
    salaire: "Grille fonction publique territoriale", experience: "Débutant accepté", rome: "K1201",
    description: "Accueil, évaluation et accompagnement social global des publics du secteur, instruction des dossiers d'aide, évaluation des informations préoccupantes, travail en réseau. DEASS obligatoire.",
    contactEmail: "recrutement.social@departement.example.org", publie: 5,
  },
  {
    id: "demo-05", intitule: "Éducateur de jeunes enfants – Multi-accueil 40 berceaux", employeur: "Crèche Les Petits Pas (exemple)",
    lieu: "69 - Lyon 7e", departement: "69", contrat: "CDI", dureeTravail: "35 h", salaire: "2 300 € brut",
    experience: "Débutant accepté", rome: "K1202",
    description: "Vous impulsez le projet pédagogique, accompagnez l'équipe d'auxiliaires, soutenez la parentalité et favorisez l'éveil des enfants. DE EJE exigé.",
    contactEmail: "direction@petitspas.example.org", publie: 1,
  },
  {
    id: "demo-06", intitule: "Conseiller en économie sociale et familiale – CHRS", employeur: "Habitat & Insertion (exemple)",
    lieu: "31 - Toulouse", departement: "31", contrat: "CDI", dureeTravail: "35 h, du lundi au vendredi", salaire: "CCN 51",
    experience: "2 ans", rome: "K1205",
    description: "Accompagnement budgétaire et à l'accès au logement de personnes hébergées en CHRS, animation d'ateliers collectifs, partenariat avec les bailleurs. DE CESF exigé.",
    contactEmail: "emploi@habitat-insertion.example.org", publie: 7,
  },
  {
    id: "demo-07", intitule: "TISF – Protection de l'enfance à domicile", employeur: "Familles Services 34 (exemple)",
    lieu: "34 - Sète", departement: "34", contrat: "CDI", dureeTravail: "28 h hebdomadaires", salaire: "Selon CCN BAD",
    experience: "Débutant accepté", rome: "K1305",
    description: "Interventions au domicile de familles dans le cadre de mesures de protection de l'enfance : soutien à la parentalité, organisation de la vie quotidienne. DE TISF exigé, permis B et véhicule indispensables.",
    contactEmail: "rh@familles34.example.org", publie: 4,
  },
  {
    id: "demo-08", intitule: "Aide à domicile H/F", employeur: "Aide & Présence (exemple)",
    lieu: "34 - Béziers", departement: "34", contrat: "CDI", dureeTravail: "Temps partiel choisi 24 à 30 h", salaire: "12,30 € brut / h + IK",
    experience: "Débutant accepté", rome: "K1302",
    description: "Aide aux personnes âgées dans les actes essentiels du quotidien : courses, repas, entretien du logement, accompagnement. Titre ADVF ou DEAES apprécié. Permis B exigé.",
    contactEmail: "agence.beziers@aidepresence.example.org", publie: 0,
  },
  {
    id: "demo-09", intitule: "Médiateur social – Quartier prioritaire", employeur: "Lien Social Urbain (exemple)",
    lieu: "13 - Marseille 15e", departement: "13", contrat: "CDD", dureeTravail: "CDD 12 mois, horaires décalés", salaire: "1 950 € brut",
    experience: "Débutant accepté", rome: "K1204",
    description: "Présence active de proximité, prévention des conflits, orientation des habitants vers les services publics. Titre pro Médiateur social ou expérience équivalente.",
    contactEmail: "", urlCandidature: "https://www.example.org/postuler/mediateur", publie: 6,
  },
  {
    id: "demo-10", intitule: "Conseiller en insertion professionnelle – Chantier d'insertion", employeur: "Recyclerie Solidaire (exemple)",
    lieu: "30 - Alès", departement: "30", contrat: "CDI", dureeTravail: "35 h", salaire: "2 100 € brut",
    experience: "1 an", rome: "K1801",
    description: "Accompagnement socioprofessionnel de 20 salariés en parcours d'insertion, levée des freins, relations entreprises. Titre pro CIP ou diplôme du travail social.",
    contactEmail: "contact@recyclerie.example.org", publie: 8,
  },
  {
    id: "demo-11", intitule: "Chef de service éducatif – ITEP", employeur: "Association Horizon (exemple)",
    lieu: "34 - Montpellier", departement: "34", contrat: "CDI", dureeTravail: "Cadre au forfait", salaire: "CCN 66 – cadre classe 2",
    experience: "3 ans d'encadrement", rome: "K1403",
    description: "Encadrement d'une équipe de 15 professionnels, garantie des projets personnalisés, astreintes. CAFERUIS exigé, DEES apprécié.",
    contactEmail: "direction@horizon.example.org", publie: 2,
  },
  {
    id: "demo-12", intitule: "Animateur socioculturel – Centre social", employeur: "Centre social La Passerelle (exemple)",
    lieu: "69 - Villeurbanne", departement: "69", contrat: "CDD", dureeTravail: "CDD 8 mois", salaire: "Convention ALISFA",
    experience: "Débutant accepté", rome: "K1206",
    description: "Conception et animation d'actions collectives familles et jeunes, accompagnement de projets d'habitants. BPJEPS Animation sociale apprécié.",
    contactEmail: "lapasserelle@centresocial.example.org", publie: 9,
  },
  {
    id: "demo-13", intitule: "Éducateur spécialisé – Prévention spécialisée", employeur: "Club de Prévention Rive Gauche (exemple)",
    lieu: "31 - Toulouse", departement: "31", contrat: "CDI", dureeTravail: "35 h, travail de rue en soirée", salaire: "CCN 66",
    experience: "Débutant accepté", rome: "K1207",
    description: "Travail de rue auprès des 11-25 ans, accompagnement individuel et actions collectives, partenariat avec collèges et missions locales. DEES exigé.",
    contactEmail: "recrutement@prevention-rg.example.org", publie: 3,
  },
  {
    id: "demo-14", intitule: "Accompagnant éducatif et social – SAVS", employeur: "ESAT & SAVS Les Cèdres (exemple)",
    lieu: "30 - Nîmes", departement: "30", contrat: "CDD", dureeTravail: "CDD remplacement 3 mois", salaire: "CCN 66",
    experience: "Débutant accepté", rome: "K1301",
    description: "Soutien à l'autonomie d'adultes en situation de handicap vivant en logement autonome : budget, démarches, vie sociale. DEAES exigé, permis B indispensable.",
    contactEmail: "savs@cedres.example.org", publie: 1,
  },
];

const LIBELLES = { CDI: "Contrat à durée indéterminée", CDD: "Contrat à durée déterminée" };

export const DEMO_OFFRES = brut.map(({ id, publie, ...o }) => ({
  ...o,
  source: "demo",
  externalId: id,
  contratLibelle: LIBELLES[o.contrat] ?? o.contrat,
  contactNom: o.contactNom ?? "",
  urlCandidature: o.urlCandidature ?? "",
  diplomesCites: diplomesCites(`${o.intitule} ${o.description}`),
  datePublication: jours(publie),
}));
