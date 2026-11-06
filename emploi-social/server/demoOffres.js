// Offres FICTIVES (mode démo OFFRES_DEMO=1 et tests). Employeurs inventés,
// adresses en example.org (domaine réservé, aucun message ne peut y être livré).
import { diplomesCites, metierDuTitre } from "./referentiel.js";

const jours = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const brut = [
  {
    id: "demo-01", intitule: "Éducateur·rice social·e ES/HES à 80 % – foyer pour adolescent·e·s", employeur: "Fondation Les Tilleuls (exemple)",
    lieu: "1004 Lausanne", canton: "VD", contrat: "indetermine", tauxMin: 80, tauxMax: 80, entree: "1er janvier",
    description: "Au sein d'un foyer accueillant 10 adolescent·e·s placé·e·s par la DGEJ, vous assurez l'accompagnement éducatif au quotidien, co-construisez les projets éducatifs individualisés et travaillez en réseau avec les familles et les partenaires. Diplôme d'éducateur·rice social·e ES ou HES exigé. Horaires irréguliers (soirs, week-ends). Conditions selon CCT du secteur social vaudois.",
    contactEmail: "rh@tilleuls.example.org", contactNom: "Mme Laurent", publie: 1,
  },
  {
    id: "demo-02", intitule: "Assistant·e socio-éducatif·ve (ASE) 60–80 %", employeur: "Résidence Les Oliviers (exemple)",
    lieu: "1950 Sion", canton: "VS", contrat: "indetermine", tauxMin: 60, tauxMax: 80, entree: "Dès que possible",
    description: "Accompagnement d'adultes en situation de handicap mental dans les actes de la vie quotidienne et les activités. CFC d'ASE exigé. Connaissances en communication alternative appréciées.",
    contactEmail: "emploi@oliviers.example.org", publie: 2,
  },
  {
    id: "demo-03", intitule: "Assistant·e social·e HES à 90 % – service social communal", employeur: "Commune de Carouge (exemple)",
    lieu: "1227 Carouge", canton: "GE", contrat: "determine", tauxMin: 90, tauxMax: 90, entree: "1er février, CDD 12 mois",
    description: "Accueil, évaluation et accompagnement social des habitant·e·s, aides financières communales, travail en réseau avec l'Hospice général. Bachelor HES en travail social exigé. Permis de travail valable.",
    contactEmail: "", urlCandidature: "https://www.example.org/postuler/as-carouge", publie: 4,
  },
  {
    id: "demo-04", intitule: "Éducatrice ou éducateur de l'enfance ES à 80 % – crèche", employeur: "Crèche Les Petits Pas (exemple)",
    lieu: "1700 Fribourg", canton: "FR", contrat: "indetermine", tauxMin: 80, tauxMax: 80, entree: "Mars",
    description: "Vous participez au projet pédagogique d'une structure de 44 places, accompagnez les enfants de 4 mois à 4 ans et soutenez les familles. Diplôme ES d'éducateur·rice de l'enfance (EDE) exigé.",
    contactEmail: "direction@petitspas.example.org", publie: 1,
  },
  {
    id: "demo-05", intitule: "Maître·sse socioprofessionnel·le (MSP) à 100 % – atelier bois", employeur: "Atelier Horizon (exemple)",
    lieu: "2000 Neuchâtel", canton: "NE", contrat: "indetermine", tauxMin: 100, tauxMax: 100, entree: "Dès que possible",
    description: "Encadrement d'une équipe de travailleurs en situation de handicap dans un atelier de menuiserie. CFC dans un métier du bois et diplôme ES de MSP (ou en cours).",
    contactEmail: "rh@horizon.example.org", publie: 3,
  },
  {
    id: "demo-06", intitule: "Curateur·rice professionnel·le à 80 %", employeur: "Office des curatelles (exemple)",
    lieu: "1400 Yverdon-les-Bains", canton: "VD", contrat: "indetermine", tauxMin: 80, tauxMax: 80, entree: "À convenir",
    description: "Gestion d'un portefeuille de mandats de curatelle confiés par la Justice de paix. Bachelor HES en travail social ou formation jugée équivalente.",
    contactEmail: "recrutement@curatelles.example.org", publie: 6,
  },
  {
    id: "demo-07", intitule: "Animateur·rice socioculturel·le à 50 % – maison de quartier", employeur: "Maison de quartier des Pâquis (exemple)",
    lieu: "1201 Genève", canton: "GE", contrat: "determine", tauxMin: 50, tauxMax: 50, entree: "Janvier, remplacement 6 mois",
    description: "Accueil libre des 12-17 ans, projets avec les habitant·e·s, travail hors murs. Bachelor HES en animation socioculturelle ou formation équivalente.",
    contactEmail: "mq@paquis.example.org", publie: 5,
  },
  {
    id: "demo-08", intitule: "Job coach – conseiller·ère en insertion à 80–100 %", employeur: "Tremplin Emploi (exemple)",
    lieu: "2800 Delémont", canton: "JU", contrat: "indetermine", tauxMin: 80, tauxMax: 100, entree: "1er mars",
    description: "Accompagnement vers l'emploi de bénéficiaires de l'aide sociale et de l'AI, prospection d'entreprises. Formation en travail social ou brevet fédéral de spécialiste en insertion.",
    contactEmail: "contact@tremplin.example.org", publie: 2,
  },
];

export const DEMO_OFFRES = brut.map(({ id, publie, ...o }) => ({
  ...o,
  source: "demo",
  externalId: id,
  reference: "",
  contratLibelle: o.contrat === "indetermine" ? "Durée indéterminée" : "Durée déterminée",
  taux: o.tauxMin === o.tauxMax ? `${o.tauxMax} %` : `${o.tauxMin}–${o.tauxMax} %`,
  langue: "fr",
  metier: metierDuTitre(o.intitule),
  contactNom: o.contactNom ?? "",
  contactTelephone: "",
  urlCandidature: o.urlCandidature ?? "",
  urlAnnonce: "",
  diplomesCites: diplomesCites(`${o.intitule} ${o.description}`),
  datePublication: jours(publie),
}));
