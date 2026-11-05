// Autorisation et envoi des candidatures.
//
// Règle centrale : AUCUN e-mail ne part sans une autorisation explicite qui porte
// sur le contenu exact (destinataire, objet, message, pièce jointe). L'autorisation
// est une empreinte SHA-256 de ce contenu : la moindre modification l'annule.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { OUTBOX_DIR, UPLOAD_DIR } from "./store.js";

export function contenuEnvoi(candidature, profil) {
  return {
    canal: candidature.canal,
    de: profil.email,
    a: candidature.canal === "email" ? candidature.destinataire.trim() : "",
    url: candidature.canal === "site" ? candidature.offre.urlCandidature : "",
    objet: candidature.objet,
    message: candidature.message,
    pieceJointe: candidature.joindreCV && profil.cv ? { nom: profil.cv.nom, taille: profil.cv.taille, sha256: profil.cv.sha256 } : null,
  };
}

export const empreinte = (contenu) => createHash("sha256").update(JSON.stringify(contenu)).digest("hex");

export const smtpConfigure = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Problèmes bloquants avant de pouvoir autoriser. */
export function verifier(candidature, profil) {
  const erreurs = [];
  if (!profil.prenom || !profil.nom) erreurs.push("Renseignez vos nom et prénom dans le profil.");
  if (!EMAIL_RE.test(profil.email ?? "")) erreurs.push("Renseignez une adresse e-mail valide dans le profil.");
  if (candidature.canal === "email" && !EMAIL_RE.test(candidature.destinataire?.trim() ?? ""))
    erreurs.push("Adresse e-mail du recruteur manquante ou invalide.");
  if (candidature.canal === "site" && !candidature.offre.urlCandidature)
    erreurs.push("Aucun lien de candidature pour cette offre : passez par l'e-mail.");
  if (!candidature.objet?.trim()) erreurs.push("L'objet est vide.");
  if ((candidature.message?.trim().length ?? 0) < 80) erreurs.push("Le message est trop court.");
  if (/\[Prénom Nom\]/.test(candidature.message)) erreurs.push("Remplacez « [Prénom Nom] » dans le message.");
  if (candidature.joindreCV && !profil.cv) erreurs.push("Aucun CV : ajoutez-le dans le profil ou décochez la pièce jointe.");
  return erreurs;
}

let transport = null;
function getTransport() {
  if (!transport) {
    transport = smtpConfigure()
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 465),
          secure: Number(process.env.SMTP_PORT || 465) === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        })
      : nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  }
  return transport;
}

/**
 * Envoie l'e-mail. Sans SMTP configuré, mode simulation : le message est écrit
 * dans data/outbox/*.eml (ouvrable avec n'importe quel logiciel de messagerie).
 */
export async function envoyerEmail(contenu, profil, { relance = false } = {}) {
  const nom = [profil.prenom, profil.nom].join(" ");
  const mail = {
    from: { name: nom, address: process.env.SMTP_FROM || profil.email },
    replyTo: profil.email,
    to: contenu.a,
    subject: contenu.objet,
    text: contenu.message,
    attachments: [],
  };
  if (contenu.pieceJointe && !relance) {
    mail.attachments.push({ filename: contenu.pieceJointe.nom, path: path.join(UPLOAD_DIR, profil.cv.fichier) });
  }
  const info = await getTransport().sendMail(mail);
  if (smtpConfigure()) return { mode: "smtp", messageId: info.messageId };
  const fichier = `${new Date().toISOString().replace(/[:.]/g, "-")}-${contenu.a.replace(/[^a-z0-9@.-]/gi, "_")}.eml`;
  fs.writeFileSync(path.join(OUTBOX_DIR, fichier), info.message);
  return { mode: "simulation", messageId: info.messageId, fichier };
}

/** Réinitialise le transport (changement de configuration, tests). */
export const resetTransport = () => {
  transport = null;
};
