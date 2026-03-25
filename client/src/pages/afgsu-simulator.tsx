import { useState, useRef } from "react";

// ============================================================
// AFGSU Profession Lists
// ============================================================

const AFGSU2_PROFESSIONS = [
  "Aide-soignant(e)",
  "Ambulancier(ère)",
  "Audioprothésiste",
  "Auxiliaire de puériculture",
  "Chirurgien-dentiste",
  "Diététicien(ne)",
  "Ergothérapeute",
  "Infirmier(ère) (IDE)",
  "Infirmier(ère) anesthésiste (IADE)",
  "Infirmier(ère) de bloc (IBODE)",
  "Infirmier(ère) en pratique avancée (IPA)",
  "Manipulateur d'électroradiologie",
  "Masseur-kinésithérapeute",
  "Médecin",
  "Opticien-lunetier",
  "Orthophoniste",
  "Orthoptiste",
  "Pédicure-podologue",
  "Pharmacien",
  "Préparateur en pharmacie",
  "Psychomotricien(ne)",
  "Puéricultrice",
  "Sage-femme",
  "Technicien de laboratoire",
];

const AFGSU1_PROFESSIONS = [
  "Agent d'accueil (établissement de santé)",
  "Agent de service hospitalier (ASH)",
  "Brancardier",
  "Personnel administratif (établissement de santé)",
  "Personnel technique (établissement de santé)",
  "Secrétaire médicale",
  "Autre personnel d'un établissement de santé",
];

type ResultState = {
  status: "valide" | "expire_bientot" | "perime" | "initial" | "non_eligible";
  type: string;
  profession?: string;
  expirationDate?: string;
  timeRemaining?: string;
  action: string;
  message: string;
};

function computeResult(
  profession: string,
  afgsuType: string,
  dateObtention: string
): ResultState {
  const isAfgsu2 = AFGSU2_PROFESSIONS.includes(profession);
  const isAfgsu1 = AFGSU1_PROFESSIONS.includes(profession);
  const detectedType = isAfgsu2 ? "AFGSU 2" : isAfgsu1 ? "AFGSU 1" : "";
  const type = afgsuType || detectedType;

  if (!profession && !afgsuType) {
    return { status: "initial", type: "", action: "", message: "" };
  }

  if (profession && !isAfgsu2 && !isAfgsu1) {
    return {
      status: "non_eligible",
      type: "",
      profession,
      action: "L'AFGSU est réservée aux personnels travaillant dans un établissement de santé ou médico-social.",
      message: "Non éligible à l'AFGSU",
    };
  }

  if (!dateObtention) {
    return {
      status: "initial",
      type: type || "AFGSU 1",
      profession: profession || undefined,
      action: `Vous êtes éligible à l'${type || (isAfgsu2 ? "AFGSU 2" : "AFGSU 1")}. Formation initiale : ${isAfgsu2 || afgsuType === "AFGSU 2" ? "3 jours (21h)" : "2 jours (14h)"}. Validité : 4 ans.`,
      message: `Éligible — ${type || (isAfgsu2 ? "AFGSU 2" : "AFGSU 1")} (formation initiale)`,
    };
  }

  const obtained = new Date(dateObtention + "T00:00:00");
  const now = new Date();
  const expiration = new Date(obtained);
  expiration.setFullYear(expiration.getFullYear() + 4);

  const diffMs = expiration.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const expirationStr = expiration.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Calculate human-readable time
  let timeRemaining: string;
  const absDays = Math.abs(diffDays);
  const years = Math.floor(absDays / 365);
  const months = Math.floor((absDays % 365) / 30);
  const days = absDays % 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  if (days > 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`);
  timeRemaining = parts.join(" ") || "0 jour";

  if (diffDays < 0) {
    return {
      status: "perime",
      type,
      profession: profession || undefined,
      expirationDate: expirationStr,
      timeRemaining: `Dépassé de ${timeRemaining}`,
      action: `Formation ${type} complète obligatoire (${type === "AFGSU 2" ? "3 jours — 21h" : "2 jours — 14h"}).`,
      message: `${type} — PÉRIMÉ`,
    };
  }

  if (diffDays <= 90) {
    return {
      status: "expire_bientot",
      type,
      profession: profession || undefined,
      expirationDate: expirationStr,
      timeRemaining: `${timeRemaining} restant`,
      action: "Programmer le recyclage IMMÉDIATEMENT (1 jour — 7h).",
      message: `${type} — EXPIRE BIENTÔT`,
    };
  }

  return {
    status: "valide",
    type,
    profession: profession || undefined,
    expirationDate: expirationStr,
    timeRemaining: `${timeRemaining} restant`,
    action: diffDays <= 365
      ? "Prévoir le recyclage cette année (1 jour — 7h)."
      : "Recyclage à programmer prochainement (1 jour — 7h, tous les 4 ans).",
    message: `${type} — VALIDE`,
  };
}

// ============================================================
// Component
// ============================================================

export default function AfgsuSimulator() {
  const [profession, setProfession] = useState("");
  const [afgsuType, setAfgsuType] = useState("");
  const [dateObtention, setDateObtention] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [autoType, setAutoType] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleProfessionChange = (val: string) => {
    setProfession(val);
    const isA2 = AFGSU2_PROFESSIONS.includes(val);
    const isA1 = AFGSU1_PROFESSIONS.includes(val);
    if (isA2) { setAfgsuType("AFGSU 2"); setAutoType(true); }
    else if (isA1) { setAfgsuType("AFGSU 1"); setAutoType(true); }
    else { setAutoType(false); }
  };

  const handleCalculate = () => {
    const res = computeResult(profession, afgsuType, dateObtention);
    setResult(res);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  const handleReset = () => {
    setProfession("");
    setAfgsuType("");
    setDateObtention("");
    setResult(null);
    setAutoType(false);
  };

  const resultBg = result
    ? result.status === "valide" ? "#d5ede5"
    : result.status === "expire_bientot" ? "#fdf2e3"
    : result.status === "perime" ? "#f8d7da"
    : result.status === "non_eligible" ? "#f8d7da"
    : "#e8f4fd"
    : "";

  const resultBorder = result
    ? result.status === "valide" ? "#27ae60"
    : result.status === "expire_bientot" ? "#f39c12"
    : result.status === "perime" ? "#e74c3c"
    : result.status === "non_eligible" ? "#e74c3c"
    : "#3498db"
    : "";

  const statusEmoji = result
    ? result.status === "valide" ? "✅"
    : result.status === "expire_bientot" ? "⚠️"
    : result.status === "perime" ? "❌"
    : result.status === "non_eligible" ? "❌"
    : "ℹ️"
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* So'Safe Header */}
      <div style={{ background: "#32373c", color: "#fff", padding: "0.75rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://www.so-safe.fr/" target="_blank" rel="noopener noreferrer">
            <img src="/logo-sosafe-white.png" alt="SO'SAFE" style={{ height: 32 }} />
          </a>
          <nav style={{ fontSize: "0.85rem", color: "#adb5bd" }}>
            <a href="https://www.so-safe.fr/" target="_blank" rel="noopener noreferrer" style={{ color: "#adb5bd", textDecoration: "none" }}>Accueil</a>
            <span style={{ margin: "0 0.5rem" }}>›</span>
            <a href="https://www.so-safe.fr/formations/" target="_blank" rel="noopener noreferrer" style={{ color: "#adb5bd", textDecoration: "none" }}>Formations</a>
            <span style={{ margin: "0 0.5rem" }}>›</span>
            <span style={{ color: "#fec700" }}>Simulateur AFGSU</span>
          </nav>
        </div>
      </div>
      <div style={{ width: "100%", height: 4, background: "linear-gradient(-45deg, #F6DE14, #F7B136)" }} />

      {/* Calculator Card */}
      <div style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)", padding: "2rem" }}>
          <h2 style={{ textAlign: "center", color: "#32373c", fontWeight: 700, fontSize: "clamp(1.4rem, 4vw, 1.8rem)", marginBottom: "0.5rem" }}>
            Simulateur AFGSU 1 & AFGSU 2
          </h2>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.9rem", marginBottom: "2rem" }}>
            Vérifiez votre éligibilité et calculez la date de recyclage
          </p>

          {/* Form */}
          <div style={{ background: "#ecf0f1", padding: "1.5rem", borderRadius: 8, marginBottom: "1.5rem" }}>
            {/* Profession */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: 600, color: "#34495e", marginBottom: 6, fontSize: "0.95rem" }}>
                Votre métier
              </label>
              <select
                value={profession}
                onChange={(e) => handleProfessionChange(e.target.value)}
                style={{
                  width: "100%", padding: "0.75rem", border: "2px solid #bdc3c7", borderRadius: 6,
                  fontSize: "0.9rem", background: "#fff", outline: "none",
                }}
              >
                <option value="">-- Sélectionnez votre métier --</option>
                <optgroup label="AFGSU 2 — Professionnels de santé">
                  {AFGSU2_PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </optgroup>
                <optgroup label="AFGSU 1 — Personnel non professionnel de santé">
                  {AFGSU1_PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </optgroup>
                <optgroup label="Hors établissement de santé">
                  <option value="__non_eligible">Je ne travaille pas dans un établissement de santé</option>
                </optgroup>
              </select>
              <p style={{ fontSize: "0.8rem", color: autoType ? "#27ae60" : "#7f8c8d", fontStyle: "italic", marginTop: 4, fontWeight: autoType ? 600 : 400 }}>
                {autoType
                  ? `${afgsuType} sélectionné automatiquement selon votre métier`
                  : "Le type d'AFGSU sera automatiquement sélectionné selon votre métier"}
              </p>
            </div>

            {/* Type AFGSU */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: 600, color: "#34495e", marginBottom: 6, fontSize: "0.95rem" }}>
                Type d'AFGSU
              </label>
              <select
                value={afgsuType}
                onChange={(e) => { setAfgsuType(e.target.value); setAutoType(false); }}
                style={{
                  width: "100%", padding: "0.75rem", border: "2px solid #bdc3c7", borderRadius: 6,
                  fontSize: "0.9rem", background: autoType ? "#e8eaed" : "#fff", outline: "none",
                  cursor: autoType ? "not-allowed" : "pointer",
                }}
              >
                <option value="">-- Sélectionnez --</option>
                <option value="AFGSU 1">AFGSU 1</option>
                <option value="AFGSU 2">AFGSU 2</option>
              </select>
              <p style={{ fontSize: "0.8rem", color: "#7f8c8d", fontStyle: "italic", marginTop: 4 }}>
                Sélectionnez manuellement ou choisissez votre métier ci-dessus
              </p>
            </div>

            {/* Date */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, color: "#34495e", marginBottom: 6, fontSize: "0.95rem" }}>
                Date d'obtention <span style={{ fontWeight: 400, color: "#7f8c8d", fontSize: "0.85rem" }}>(laissez vide pour une première formation)</span>
              </label>
              <input
                type="date"
                value={dateObtention}
                onChange={(e) => setDateObtention(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                style={{
                  width: "100%", padding: "0.75rem", border: "2px solid #bdc3c7", borderRadius: 6,
                  fontSize: "0.9rem", background: "#fff", outline: "none",
                }}
              />
            </div>

            {/* Buttons */}
            <button
              onClick={handleCalculate}
              disabled={!profession && !afgsuType}
              style={{
                width: "100%", padding: "0.875rem 1.5rem", background: profession || afgsuType ? "#fec700" : "#bdc3c7",
                color: "#32373c", border: "none", borderRadius: 6, fontSize: "1rem", fontWeight: 700,
                cursor: profession || afgsuType ? "pointer" : "not-allowed", transition: "background 0.3s",
                fontFamily: "inherit",
              }}
            >
              Calculer
            </button>
          </div>

          {/* Results */}
          {result && result.status !== "initial" && (
            <div
              ref={resultRef}
              style={{
                padding: "1.5rem", borderRadius: 8,
                borderLeft: `5px solid ${resultBorder}`,
                background: resultBg, marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2c3e50", marginBottom: "1rem" }}>
                {statusEmoji} {result.message}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem", color: "#2c3e50" }}>
                {result.profession && (
                  <div><strong style={{ minWidth: 160, display: "inline-block" }}>Métier :</strong> {result.profession}</div>
                )}
                {result.type && (
                  <div><strong style={{ minWidth: 160, display: "inline-block" }}>Type :</strong> {result.type}</div>
                )}
                {result.expirationDate && (
                  <div><strong style={{ minWidth: 160, display: "inline-block" }}>Date d'expiration :</strong> {result.expirationDate}</div>
                )}
                {result.timeRemaining && (
                  <div>
                    <strong style={{ minWidth: 160, display: "inline-block" }}>
                      {result.status === "perime" ? "Temps dépassé :" : "Temps restant :"}
                    </strong>
                    <span style={{
                      fontWeight: 600,
                      color: result.status === "valide" ? "#27ae60" : result.status === "expire_bientot" ? "#f39c12" : "#e74c3c"
                    }}>
                      {result.timeRemaining}
                    </span>
                  </div>
                )}
                <div>
                  <strong style={{ minWidth: 160, display: "inline-block" }}>Action recommandée :</strong>
                  {result.action}
                </div>
              </div>

              {/* CTA — trouver une session */}
              {(result.status === "perime" || result.status === "expire_bientot" || (result.status === "valide" && result.timeRemaining)) && (
                <a
                  href="https://www.so-safe.fr/formations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block", marginTop: "1.2rem", padding: "0.8rem 1.5rem",
                    background: "#27ae60", color: "#fff", textAlign: "center", borderRadius: 6,
                    fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
                    boxShadow: "0 4px 6px rgba(39,174,96,0.2)", transition: "all 0.25s",
                  }}
                >
                  🎓 Trouver une session SO'SAFE & s'inscrire
                </a>
              )}
            </div>
          )}

          {/* Initial / eligible result (no date entered) */}
          {result && result.status === "initial" && result.message && (
            <div
              ref={resultRef}
              style={{
                padding: "1.5rem", borderRadius: 8,
                borderLeft: "5px solid #3498db", background: "#e8f4fd",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2c3e50", marginBottom: "0.5rem" }}>
                ℹ️ {result.message}
              </div>
              <p style={{ fontSize: "0.9rem", color: "#2c3e50" }}>{result.action}</p>
              <a
                href="https://www.so-safe.fr/formations/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", marginTop: "1rem", padding: "0.8rem 1.5rem",
                  background: "#27ae60", color: "#fff", textAlign: "center", borderRadius: 6,
                  fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
                  boxShadow: "0 4px 6px rgba(39,174,96,0.2)",
                }}
              >
                🎓 Voir nos formations AFGSU
              </a>
            </div>
          )}

          {/* Reset */}
          {result && (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleReset}
                style={{
                  padding: "0.6rem 1.5rem", background: "transparent", color: "#6b7280",
                  border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.85rem",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ↻ Recommencer
              </button>
            </div>
          )}

          {/* Info block */}
          <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#32373c", marginBottom: "0.5rem" }}>
              À propos de l'AFGSU
            </h3>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.6 }}>
              <p style={{ marginBottom: "0.3rem" }}>• <strong>AFGSU 2</strong> — Professionnels de santé : formation initiale 3 jours (21h), recyclage 1 jour (7h)</p>
              <p style={{ marginBottom: "0.3rem" }}>• <strong>AFGSU 1</strong> — Personnel non médical : formation initiale 2 jours (14h), recyclage 1 jour (7h)</p>
              <p>• <strong>Validité</strong> : 4 ans. Le recyclage est obligatoire pour maintenir la certification.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "2rem 0", fontSize: "0.75rem", color: "#9ca3af" }}>
          <a href="https://www.so-safe.fr/" target="_blank" rel="noopener noreferrer" style={{ color: "#9ca3af", textDecoration: "none" }}>
            © {new Date().getFullYear()} SO'SAFE Formation — Tous droits réservés
          </a>
        </div>
      </div>
    </div>
  );
}
