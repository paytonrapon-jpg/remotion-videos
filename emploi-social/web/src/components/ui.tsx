import { useEffect, useRef, type ReactNode } from "react";
import { STATUTS, type Statut } from "../api";

export function Modal({ titre, onClose, children, large }: { titre: string; onClose: () => void; children: ReactNode; large?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog ref={ref} className={`modal ${large ? "large" : ""}`} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-label={titre}>
      <div className="modal-tete">
        <h2>{titre}</h2>
        <button className="btn-icone" onClick={onClose} aria-label="Fermer">✕</button>
      </div>
      <div className="modal-corps">{children}</div>
    </dialog>
  );
}

export function Puces<T extends string>({
  options,
  valeurs,
  onChange,
  label,
}: {
  options: { valeur: T; libelle: string; titre?: string }[];
  valeurs: T[];
  onChange: (v: T[]) => void;
  label: string;
}) {
  return (
    <div className="puces" role="group" aria-label={label}>
      {options.map((o) => {
        const actif = valeurs.includes(o.valeur);
        return (
          <button
            type="button"
            key={o.valeur}
            className={`puce ${actif ? "active" : ""}`}
            aria-pressed={actif}
            title={o.titre}
            onClick={() => onChange(actif ? valeurs.filter((v) => v !== o.valeur) : [...valeurs, o.valeur])}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}

export function Score({ score }: { score: number }) {
  const ton = score >= 75 ? "haut" : score >= 50 ? "moyen" : "bas";
  return (
    <div className={`score ${ton}`} title={`Compatibilité avec votre profil : ${score} %`} aria-label={`Compatibilité ${score} %`}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="15.5" className="piste" />
        <circle cx="18" cy="18" r="15.5" className="valeur" strokeDasharray={`${(score / 100) * 97.4} 97.4`} />
      </svg>
      <span>{score}</span>
    </div>
  );
}

export const BadgeStatut = ({ statut }: { statut: Statut }) => (
  <span className={`badge ${STATUTS[statut].ton}`}>{STATUTS[statut].libelle}</span>
);

export const Erreurs = ({ erreurs }: { erreurs: string[] }) =>
  erreurs.length ? (
    <div className="alerte erreur" role="alert">
      <strong>À corriger avant d'autoriser :</strong>
      <ul>{erreurs.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  ) : null;
