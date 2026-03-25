import { storage } from "./storage";

/**
 * Seed ALL templates: emails, SMS, documents, surveys, automation rules.
 * Skips any template whose name already exists.
 * @param documentDefaults - HTML defaults from DOCUMENT_DEFAULTS (passed from caller to avoid cross-folder import)
 */
export async function seedAllTemplates(documentDefaults?: Record<string, string>) {
  const results = { emails: 0, sms: 0, documents: 0, surveys: 0, automations: 0 };

  // ════════════════════════════════════════════════════════════════
  // 1. EMAIL TEMPLATES
  // ════════════════════════════════════════════════════════════════
  const existingEmails = await storage.getEmailTemplates();
  const existingEmailNames = new Set(existingEmails.map((e) => e.name));

  const emailTemplates = [
    // ── APPRENANTS ──
    {
      name: "Confirmation d'inscription",
      subject: "Confirmation de votre inscription — {nom_formation}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "titre_session", "date_debut", "date_fin", "lieu", "modalite", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant} {nom_apprenant},</p>
<p>Nous avons le plaisir de vous confirmer votre inscription à la formation :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;width:140px;">Formation</td><td style="padding:8px 12px;font-weight:600;">{nom_formation}</td></tr>
<tr><td style="padding:8px 12px;color:#6b7280;">Session</td><td style="padding:8px 12px;">{titre_session}</td></tr>
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;">Dates</td><td style="padding:8px 12px;">Du {date_debut} au {date_fin}</td></tr>
<tr><td style="padding:8px 12px;color:#6b7280;">Lieu</td><td style="padding:8px 12px;">{lieu}</td></tr>
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;">Modalité</td><td style="padding:8px 12px;">{modalite}</td></tr>
</table>
<p>Vous recevrez prochainement votre convocation avec les informations pratiques détaillées.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Convocation à la formation",
      subject: "Convocation — {nom_formation} du {date_debut}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "titre_session", "date_debut", "date_fin", "lieu", "modalite", "nom_formateur", "nom_organisme", "telephone_organisme", "email_organisme"],
      body: `<p>Bonjour {prenom_apprenant} {nom_apprenant},</p>
<p>Vous êtes convoqué(e) à la formation suivante :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;width:140px;">Formation</td><td style="padding:8px 12px;font-weight:600;">{nom_formation}</td></tr>
<tr><td style="padding:8px 12px;color:#6b7280;">Dates</td><td style="padding:8px 12px;">Du {date_debut} au {date_fin}</td></tr>
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;">Lieu</td><td style="padding:8px 12px;">{lieu}</td></tr>
<tr><td style="padding:8px 12px;color:#6b7280;">Formateur</td><td style="padding:8px 12px;">{nom_formateur}</td></tr>
</table>
<h3>Informations pratiques</h3>
<ul>
<li>Merci de vous présenter <strong>15 minutes avant le début</strong> de la formation</li>
<li>Munissez-vous d'une pièce d'identité</li>
<li>Apportez de quoi prendre des notes</li>
</ul>
<p>En cas d'empêchement, merci de nous prévenir dès que possible.</p>
<p>Contact : {telephone_organisme} — {email_organisme}</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Rappel formation J-7",
      subject: "Rappel : votre formation {nom_formation} dans 7 jours",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "date_debut", "date_fin", "lieu", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Nous vous rappelons que votre formation <strong>{nom_formation}</strong> débute dans <strong>7 jours</strong>.</p>
<p>📅 Du {date_debut} au {date_fin}<br/>📍 {lieu}</p>
<p>N'hésitez pas à nous contacter pour toute question.</p>
<p>À très bientôt !<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Rappel formation J-3",
      subject: "Rappel : votre formation {nom_formation} dans 3 jours",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "date_debut", "lieu", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Votre formation <strong>{nom_formation}</strong> approche ! Elle débute dans <strong>3 jours</strong>.</p>
<p>📅 {date_debut}<br/>📍 {lieu}</p>
<p>Pensez à préparer les documents nécessaires.</p>
<p>À très bientôt !<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Rappel formation J-1",
      subject: "C'est demain ! Formation {nom_formation}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "date_debut", "lieu", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Votre formation <strong>{nom_formation}</strong> commence <strong>demain</strong> !</p>
<p>📅 {date_debut}<br/>📍 {lieu}</p>
<p>Présentez-vous 15 minutes avant le début. N'oubliez pas votre pièce d'identité.</p>
<p>Bonne formation !<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi évaluation pré-formation",
      subject: "Évaluation de positionnement — {nom_formation}",
      category: "evaluations",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Avant le début de votre formation <strong>{nom_formation}</strong>, nous vous invitons à compléter un questionnaire de positionnement.</p>
<p>Ce questionnaire permet d'évaluer vos connaissances initiales afin d'adapter le contenu pédagogique à vos besoins. Il ne s'agit pas d'un examen.</p>
<p>Durée estimée : 5 à 10 minutes.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi évaluation à chaud",
      subject: "Votre avis nous intéresse — {nom_formation}",
      category: "evaluations",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Vous venez de terminer la formation <strong>{nom_formation}</strong>. Félicitations !</p>
<p>Votre avis est précieux pour améliorer nos formations. Merci de prendre quelques minutes pour répondre à notre questionnaire de satisfaction.</p>
<p>Durée estimée : 5 minutes.</p>
<p>Merci pour votre participation !<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi évaluation à froid",
      subject: "Suivi post-formation — {nom_formation}",
      category: "evaluations",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Il y a quelques semaines, vous avez suivi la formation <strong>{nom_formation}</strong>.</p>
<p>Afin de mesurer l'impact de cette formation sur votre pratique professionnelle, nous vous invitons à compléter un court questionnaire de suivi.</p>
<p>Vos retours nous permettent d'améliorer continuellement la qualité de nos formations.</p>
<p>Merci par avance,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Relance évaluation non répondue",
      subject: "Rappel : votre évaluation pour {nom_formation}",
      category: "evaluations",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Nous n'avons pas encore reçu votre réponse au questionnaire d'évaluation de la formation <strong>{nom_formation}</strong>.</p>
<p>Votre avis est essentiel pour la qualité de nos formations. Le questionnaire ne prend que quelques minutes.</p>
<p>Merci de votre aide,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi attestation de formation",
      subject: "Votre attestation de formation — {nom_formation}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "date_debut", "date_fin", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant} {nom_apprenant},</p>
<p>Suite à votre participation à la formation <strong>{nom_formation}</strong> du {date_debut} au {date_fin}, veuillez trouver ci-joint votre attestation de formation.</p>
<p>Ce document certifie votre présence et l'atteinte des objectifs pédagogiques.</p>
<p>Conservez-le précieusement, il pourra vous être demandé par votre employeur ou votre OPCO.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi certificat de réalisation",
      subject: "Certificat de réalisation — {nom_formation}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant} {nom_apprenant},</p>
<p>Veuillez trouver ci-joint votre certificat de réalisation pour la formation <strong>{nom_formation}</strong>.</p>
<p>Ce document atteste de la réalisation de l'action de formation conformément aux dispositions légales.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Annulation d'inscription",
      subject: "Annulation de votre inscription — {nom_formation}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "titre_session", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant} {nom_apprenant},</p>
<p>Nous vous informons que votre inscription à la formation <strong>{nom_formation}</strong> (session : {titre_session}) a été annulée.</p>
<p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez vous réinscrire, n'hésitez pas à nous contacter.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Bienvenue sur le portail apprenant",
      subject: "Bienvenue sur votre espace apprenant — {nom_organisme}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Votre espace apprenant <strong>{nom_organisme}</strong> est désormais accessible !</p>
<p>Vous y retrouverez :</p>
<ul>
<li>Vos formations et parcours e-learning</li>
<li>Vos documents (attestations, certificats, convocations)</li>
<li>Vos évaluations et résultats</li>
<li>L'émargement numérique</li>
</ul>
<p>Bonne formation !<br/><strong>{nom_organisme}</strong></p>`,
    },
    // ── CLIENTS / ENTREPRISES ──
    {
      name: "Envoi convention de formation",
      subject: "Convention de formation — {nom_formation}",
      category: "clients",
      type: "automatic",
      variables: ["contact_entreprise", "nom_entreprise", "nom_formation", "date_debut", "date_fin", "nom_organisme"],
      body: `<p>Bonjour {contact_entreprise},</p>
<p>Veuillez trouver ci-joint la convention de formation pour :</p>
<p><strong>{nom_formation}</strong><br/>Du {date_debut} au {date_fin}</p>
<p>Merci de nous retourner un exemplaire signé dans les meilleurs délais.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi devis",
      subject: "Devis N°{numero_devis} — {nom_formation}",
      category: "factures_devis",
      type: "manual",
      variables: ["contact_entreprise", "nom_entreprise", "numero_devis", "nom_formation", "montant_formation", "nom_organisme"],
      body: `<p>Bonjour {contact_entreprise},</p>
<p>Suite à votre demande, veuillez trouver ci-joint notre devis N°{numero_devis} pour la formation <strong>{nom_formation}</strong>.</p>
<p>Montant : <strong>{montant_formation} € HT</strong></p>
<p>Ce devis est valable 30 jours. N'hésitez pas à nous contacter pour toute question.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi facture",
      subject: "Facture N°{numero_facture} — {nom_formation}",
      category: "factures_devis",
      type: "automatic",
      variables: ["contact_entreprise", "nom_entreprise", "numero_facture", "nom_formation", "montant_formation", "nom_organisme"],
      body: `<p>Bonjour {contact_entreprise},</p>
<p>Veuillez trouver ci-joint la facture N°{numero_facture} relative à la formation <strong>{nom_formation}</strong>.</p>
<p>Montant : <strong>{montant_formation} € TTC</strong></p>
<p>Règlement attendu sous 30 jours à réception.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Relance facture impayée",
      subject: "Relance — Facture N°{numero_facture} impayée",
      category: "factures_devis",
      type: "manual",
      variables: ["contact_entreprise", "nom_entreprise", "numero_facture", "montant_formation", "nom_organisme"],
      body: `<p>Bonjour {contact_entreprise},</p>
<p>Sauf erreur de notre part, la facture N°{numero_facture} d'un montant de <strong>{montant_formation} € TTC</strong> reste impayée à ce jour.</p>
<p>Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.</p>
<p>Si le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    // ── INTERVENANTS / FORMATEURS ──
    {
      name: "Attribution de session — Formateur",
      subject: "Nouvelle session attribuée — {nom_formation}",
      category: "intervenants",
      type: "automatic",
      variables: ["nom_formateur", "nom_formation", "titre_session", "date_debut", "date_fin", "lieu", "nom_organisme"],
      body: `<p>Bonjour {nom_formateur},</p>
<p>Une nouvelle session vous a été attribuée :</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;width:140px;">Formation</td><td style="padding:8px 12px;font-weight:600;">{nom_formation}</td></tr>
<tr><td style="padding:8px 12px;color:#6b7280;">Session</td><td style="padding:8px 12px;">{titre_session}</td></tr>
<tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#6b7280;">Dates</td><td style="padding:8px 12px;">Du {date_debut} au {date_fin}</td></tr>
<tr><td style="padding:8px 12px;color:#6b7280;">Lieu</td><td style="padding:8px 12px;">{lieu}</td></tr>
</table>
<p>Connectez-vous à votre espace formateur pour préparer cette session.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi convention d'intervention",
      subject: "Convention d'intervention — {nom_formation}",
      category: "intervenants",
      type: "automatic",
      variables: ["nom_formateur", "nom_formation", "date_debut", "date_fin", "nom_organisme"],
      body: `<p>Bonjour {nom_formateur},</p>
<p>Veuillez trouver ci-joint la convention d'intervention pour la formation <strong>{nom_formation}</strong> du {date_debut} au {date_fin}.</p>
<p>Merci de nous retourner un exemplaire signé.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Rappel session formateur J-3",
      subject: "Rappel : session {nom_formation} dans 3 jours",
      category: "intervenants",
      type: "automatic",
      variables: ["nom_formateur", "nom_formation", "date_debut", "lieu", "nombre_stagiaires", "nom_organisme"],
      body: `<p>Bonjour {nom_formateur},</p>
<p>Pour rappel, votre session <strong>{nom_formation}</strong> débute dans 3 jours.</p>
<p>📅 {date_debut}<br/>📍 {lieu}<br/>👥 {nombre_stagiaires} stagiaire(s) inscrit(s)</p>
<p>Bon courage !<br/><strong>{nom_organisme}</strong></p>`,
    },
    // ── FINANCEURS ──
    {
      name: "Envoi attestation FIFPL",
      subject: "Attestation FIFPL — {nom_formation}",
      category: "financeurs_externes",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour,</p>
<p>Veuillez trouver ci-joint l'attestation FIFPL pour <strong>{prenom_apprenant} {nom_apprenant}</strong> relative à la formation <strong>{nom_formation}</strong>.</p>
<p>Ce document est à joindre à la demande de prise en charge FIFPL.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Envoi attestation DPC",
      subject: "Attestation DPC — {nom_formation}",
      category: "financeurs_externes",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour,</p>
<p>Veuillez trouver ci-joint l'attestation DPC pour <strong>{prenom_apprenant} {nom_apprenant}</strong> relative à la formation <strong>{nom_formation}</strong>.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    // ── SIGNATURE ÉLECTRONIQUE ──
    {
      name: "Demande de signature — Convention",
      subject: "Document à signer : Convention de formation — {nom_formation}",
      category: "signature_electronique",
      type: "automatic",
      variables: ["contact_entreprise", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {contact_entreprise},</p>
<p>Un document est en attente de votre signature électronique :</p>
<p><strong>Convention de formation — {nom_formation}</strong></p>
<p>Cliquez sur le lien ci-dessous pour signer le document de manière sécurisée.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    // ── NOTIFICATION ABSENCE ──
    {
      name: "Notification d'absence — Apprenant",
      subject: "Absence constatée — {nom_formation}",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_apprenant", "nom_formation", "titre_session", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant} {nom_apprenant},</p>
<p>Nous avons constaté votre absence lors de la session <strong>{titre_session}</strong> de la formation <strong>{nom_formation}</strong>.</p>
<p>Si cette absence est justifiée, merci de nous transmettre un justificatif dans les plus brefs délais.</p>
<p>Pour rappel, l'assiduité est obligatoire pour la validation de la formation.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    {
      name: "Notification d'absence — Entreprise",
      subject: "Absence constatée — {prenom_apprenant} {nom_apprenant} — {nom_formation}",
      category: "clients",
      type: "automatic",
      variables: ["contact_entreprise", "prenom_apprenant", "nom_apprenant", "nom_formation", "titre_session", "nom_organisme"],
      body: `<p>Bonjour {contact_entreprise},</p>
<p>Nous vous informons que <strong>{prenom_apprenant} {nom_apprenant}</strong> a été absent(e) lors de la session <strong>{titre_session}</strong> de la formation <strong>{nom_formation}</strong>.</p>
<p>Merci de nous contacter si nécessaire.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
    // ── RECYCLAGE / CERTIFICATION ──
    {
      name: "Rappel recyclage — Certification expirante",
      subject: "Votre certification {nom_formation} expire bientôt",
      category: "apprenants",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "nom_organisme"],
      body: `<p>Bonjour {prenom_apprenant},</p>
<p>Votre certification <strong>{nom_formation}</strong> arrive bientôt à expiration.</p>
<p>Pensez à planifier votre recyclage pour maintenir vos compétences à jour.</p>
<p>Consultez nos prochaines sessions disponibles sur notre site ou contactez-nous.</p>
<p>Cordialement,<br/><strong>{nom_organisme}</strong></p>`,
    },
  ];

  for (const tmpl of emailTemplates) {
    if (existingEmailNames.has(tmpl.name)) continue;
    await storage.createEmailTemplate(tmpl as any);
    results.emails++;
  }

  // ════════════════════════════════════════════════════════════════
  // 2. SMS TEMPLATES
  // ════════════════════════════════════════════════════════════════
  const existingSms = await storage.getSmsTemplates();
  const existingSmsNames = new Set(existingSms.map((s) => s.name));

  const smsTemplates = [
    {
      name: "Confirmation inscription SMS",
      category: "confirmation",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "date_debut"],
      body: `{prenom_apprenant}, votre inscription à {nom_formation} le {date_debut} est confirmée. SO'SAFE Formation`,
    },
    {
      name: "Convocation SMS",
      category: "convocation",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "date_debut", "lieu"],
      body: `{prenom_apprenant}, rappel: formation {nom_formation} le {date_debut} à {lieu}. Présentez-vous 15min avant. SO'SAFE`,
    },
    {
      name: "Rappel formation J-1 SMS",
      category: "rappel",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation", "lieu"],
      body: `{prenom_apprenant}, votre formation {nom_formation} c'est demain ! RDV à {lieu}. N'oubliez pas votre pièce d'identité. SO'SAFE`,
    },
    {
      name: "Rappel émargement SMS",
      category: "rappel",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation"],
      body: `{prenom_apprenant}, pensez à signer votre feuille d'émargement pour {nom_formation}. SO'SAFE`,
    },
    {
      name: "Rappel évaluation SMS",
      category: "rappel",
      type: "automatic",
      variables: ["prenom_apprenant", "nom_formation"],
      body: `{prenom_apprenant}, merci de compléter votre évaluation pour la formation {nom_formation}. Votre avis compte! SO'SAFE`,
    },
    {
      name: "Changement de session SMS",
      category: "urgent",
      type: "manual",
      variables: ["prenom_apprenant", "nom_formation"],
      body: `{prenom_apprenant}, IMPORTANT: modification concernant votre formation {nom_formation}. Consultez vos emails ou contactez-nous. SO'SAFE`,
    },
  ];

  for (const tmpl of smsTemplates) {
    if (existingSmsNames.has(tmpl.name)) continue;
    await storage.createSmsTemplate(tmpl as any);
    results.sms++;
  }

  // ════════════════════════════════════════════════════════════════
  // 3. DOCUMENT TEMPLATES (from defaults)
  // ════════════════════════════════════════════════════════════════
  const existingDocs = await storage.getDocumentTemplates();
  const existingDocTypes = new Set(existingDocs.map((d) => d.type));

  const docTypeLabels: Record<string, string> = {
    convention: "Convention de formation",
    contrat_particulier: "Contrat de formation (particulier)",
    contrat_vae: "Contrat VAE",
    politique_confidentialite: "Politique de confidentialité",
    devis: "Devis",
    devis_sous_traitance: "Devis sous-traitance",
    convention_intervention: "Convention d'intervention formateur",
    contrat_cadre: "Contrat cadre de sous-traitance",
    facture: "Facture",
    facture_blended: "Facture formation blended",
    facture_specifique: "Facture formation spécifique",
    convocation: "Convocation",
    attestation: "Attestation de fin de formation",
    certificat: "Certificat",
    programme: "Programme de formation",
    reglement: "Règlement intérieur",
    cgv: "Conditions Générales de Vente",
    etiquette_envoi: "Étiquette d'envoi postal",
    certificat_realisation: "Certificat de réalisation",
    attestation_assiduite: "Attestation d'assiduité",
    attestation_dpc: "Attestation DPC",
    attestation_fifpl: "Attestation FIFPL",
    admissibilite_vae: "Admissibilité VAE",
    autorisation_image: "Autorisation d'exploitation d'image",
    fiche_fipl: "Fiche FIFPL",
    rapport_emargement: "Rapport d'émargement",
    livret_accueil: "Livret d'accueil",
  };

  const docDefaults = documentDefaults || {};
  for (const [type, content] of Object.entries(docDefaults)) {
    if (existingDocTypes.has(type)) continue;
    if (!content || !content.trim()) continue;
    await storage.createDocumentTemplate({
      name: docTypeLabels[type] || type,
      type,
      content,
    } as any);
    results.documents++;
  }

  // ════════════════════════════════════════════════════════════════
  // 4. SURVEY / EVALUATION TEMPLATES
  // ════════════════════════════════════════════════════════════════
  const existingSurveys = await storage.getSurveyTemplates();
  const existingSurveyTypes = new Set(existingSurveys.map((s: any) => s.evaluationType));

  const surveyTemplates = [
    {
      title: "Évaluation pré-formation (Positionnement)",
      description: "Questionnaire de positionnement initial avant la formation. Permet d'adapter le contenu pédagogique.",
      category: "assessment",
      status: "active",
      evaluationType: "pre_formation",
      respondentType: "trainee",
      questions: [
        { question: "Comment évaluez-vous votre niveau de connaissances sur le sujet ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Êtes-vous à l'aise avec les pratiques liées à cette formation ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Quelles sont vos attentes principales ?", type: "text", options: [] },
        { question: "Avez-vous déjà suivi une formation similaire ?", type: "choice", options: ["Non, jamais", "Oui, il y a plus de 2 ans", "Oui, récemment"] },
        { question: "Évaluez votre capacité actuelle à mettre en pratique les compétences visées", type: "rating", options: ["1", "2", "3", "4", "5"] },
      ],
    },
    {
      title: "Questionnaire de satisfaction à chaud",
      description: "Évaluation de satisfaction immédiatement après la formation. Indicateur Qualiopi obligatoire.",
      category: "satisfaction",
      status: "active",
      evaluationType: "satisfaction_hot",
      respondentType: "trainee",
      questions: [
        { question: "La formation a-t-elle répondu à vos attentes ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Comment évaluez-vous la qualité pédagogique de la formation ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Comment évaluez-vous la qualité du/des formateur(s) ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Les supports pédagogiques étaient-ils adaptés ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "L'organisation logistique était-elle satisfaisante ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Recommanderiez-vous cette formation à un(e) collègue ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Qu'avez-vous le plus apprécié dans cette formation ?", type: "text", options: [] },
        { question: "Quels points pourraient être améliorés ?", type: "text", options: [] },
      ],
    },
    {
      title: "Évaluation à froid (J+60)",
      description: "Évaluation différée pour mesurer l'impact de la formation sur la pratique professionnelle, 60 jours après.",
      category: "assessment",
      status: "active",
      evaluationType: "evaluation_cold",
      respondentType: "trainee",
      coldDelayDays: 60,
      questions: [
        { question: "Avez-vous pu appliquer les connaissances acquises ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Quel impact la formation a-t-elle eu sur votre pratique professionnelle ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Vos compétences se sont-elles améliorées depuis la formation ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Recommanderiez-vous cette formation ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Quels obstacles avez-vous rencontrés pour appliquer vos acquis ?", type: "text", options: [] },
        { question: "Votre organisation vous a-t-elle soutenu dans l'application des acquis ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
      ],
    },
    {
      title: "Évaluation du formateur",
      description: "Évaluation de la qualité d'intervention du formateur par les stagiaires.",
      category: "feedback",
      status: "active",
      evaluationType: "trainer_eval",
      respondentType: "trainee",
      questions: [
        { question: "Le formateur maîtrisait-il le sujet ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Le formateur était-il pédagogue et clair dans ses explications ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Le formateur a-t-il su animer et dynamiser le groupe ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Le formateur a-t-il été à l'écoute des participants ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Le rythme de la formation était-il adapté ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Commentaires libres sur le formateur", type: "text", options: [] },
      ],
    },
    {
      title: "Évaluation manager (N+1)",
      description: "Questionnaire adressé au responsable hiérarchique pour évaluer l'impact de la formation.",
      category: "feedback",
      status: "active",
      evaluationType: "manager_eval",
      respondentType: "manager",
      coldDelayDays: 90,
      questions: [
        { question: "Avez-vous constaté une amélioration des compétences du collaborateur ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Le collaborateur applique-t-il les acquis de la formation ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "La formation a-t-elle répondu aux besoins identifiés ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Quel impact sur la performance de l'équipe ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Commentaires ou observations", type: "text", options: [] },
      ],
    },
    {
      title: "Évaluation financeur / commanditaire",
      description: "Questionnaire adressé au commanditaire (OPCO, entreprise, financeur) pour évaluer la prestation.",
      category: "feedback",
      status: "active",
      evaluationType: "commissioner_eval",
      respondentType: "enterprise",
      questions: [
        { question: "La formation correspondait-elle au cahier des charges ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "La qualité administrative (documents, réactivité) était-elle satisfaisante ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Êtes-vous satisfait du rapport qualité/prix ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Feriez-vous de nouveau appel à nos services ?", type: "rating", options: ["1", "2", "3", "4", "5"] },
        { question: "Commentaires ou suggestions", type: "text", options: [] },
      ],
    },
  ];

  for (const tmpl of surveyTemplates) {
    if (existingSurveyTypes.has(tmpl.evaluationType)) continue;
    await storage.createSurveyTemplate(tmpl as any);
    results.surveys++;
  }

  // ════════════════════════════════════════════════════════════════
  // 5. ADDITIONAL AUTOMATION RULES
  // ════════════════════════════════════════════════════════════════
  const existingRules = await storage.getAutomationRules();
  const existingRuleNames = new Set(existingRules.map((r: any) => r.name));

  // Get the newly created email templates for linking
  const allEmails = await storage.getEmailTemplates();
  const emailByName = (name: string) => allEmails.find((e) => e.name === name);

  const automationRules = [
    {
      name: "Convocation automatique J-7",
      event: "session_reminder_7d",
      action: "send_email",
      templateId: emailByName("Convocation à la formation")?.id || null,
      delay: 0,
      active: true,
      conditions: {},
    },
    {
      name: "Rappel formation J-3",
      event: "session_reminder_3d",
      action: "send_email",
      templateId: emailByName("Rappel formation J-3")?.id || null,
      delay: 0,
      active: true,
      conditions: {},
    },
    {
      name: "Rappel formation J-1",
      event: "session_reminder_1d",
      action: "send_email",
      templateId: emailByName("Rappel formation J-1")?.id || null,
      delay: 0,
      active: true,
      conditions: {},
    },
    {
      name: "Évaluation pré-formation J-1",
      event: "session_reminder_1d",
      action: "send_evaluation",
      templateId: null,
      delay: 0,
      active: false,
      conditions: { evaluationType: "pre_formation" },
    },
    {
      name: "Satisfaction à chaud J+1",
      event: "post_session_followup",
      action: "send_evaluation",
      templateId: null,
      delay: 0,
      active: true,
      conditions: { evaluationType: "satisfaction_hot" },
    },
    {
      name: "Évaluation à froid J+60",
      event: "enrollment_completed",
      action: "send_evaluation",
      templateId: null,
      delay: 60 * 24 * 60, // 60 days in minutes
      active: false,
      conditions: { evaluationType: "evaluation_cold" },
    },
    {
      name: "Envoi attestation fin de formation",
      event: "enrollment_completed",
      action: "generate_document_and_send",
      templateId: null,
      delay: 0,
      active: true,
      conditions: { documentType: "attestation" },
    },
    {
      name: "Envoi certificat de réalisation",
      event: "enrollment_completed",
      action: "generate_document_and_send",
      templateId: null,
      delay: 0,
      active: true,
      conditions: { documentType: "certificat_realisation" },
    },
    {
      name: "Rappel recyclage certification 3 mois",
      event: "certification_expiring_90d",
      action: "send_email",
      templateId: emailByName("Rappel recyclage — Certification expirante")?.id || null,
      delay: 0,
      active: true,
      conditions: {},
    },
  ];

  for (const rule of automationRules) {
    if (existingRuleNames.has(rule.name)) continue;
    await storage.createAutomationRule(rule as any);
    results.automations++;
  }

  return results;
}
