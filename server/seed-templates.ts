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
    bpf: "Bilan Pédagogique et Financier",
    badge: "Badge de réussite",
    questionnaire_satisfaction: "Questionnaire de satisfaction",
    evaluation_pre_formation: "Évaluation pré-formation",
    evaluation_acquis: "Évaluation des acquis",
    protocole_individuel: "Protocole individuel de formation",
  };

  const docDefaults = documentDefaults || {};
  let documentsUpdated = 0;
  for (const [type, content] of Object.entries(docDefaults)) {
    if (!content || !content.trim()) continue;
    if (existingDocTypes.has(type)) {
      // Update existing template content if it still contains hardcoded "SO'SAFE"
      const existing = existingDocs.find((d) => d.type === type);
      if (existing && existing.content.includes("SO'SAFE")) {
        await storage.updateDocumentTemplate(existing.id, { content } as any);
        documentsUpdated++;
      }
      continue;
    }
    await storage.createDocumentTemplate({
      name: docTypeLabels[type] || type,
      type,
      content,
    } as any);
    results.documents++;
  }
  (results as any).documentsUpdated = documentsUpdated;

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

/**
 * Convert Digiforma array-of-objects fields to plain text.
 */
function textsToString(arr: Array<{ text?: string }> | null | undefined, separator = "\n"): string {
  if (!arr || !Array.isArray(arr)) return "";
  return arr.map(item => (typeof item === "string" ? item : item?.text || "")).filter(Boolean).join(separator);
}

function stepsToString(steps: Array<{ text?: string; substeps?: Array<{ text?: string }> }> | null | undefined): string {
  if (!steps || !Array.isArray(steps)) return "";
  return steps.map(step => {
    const title = step.text || "";
    const subs = (step.substeps || []).map(s => `  - ${s.text || ""}`).join("\n");
    return subs ? `${title}\n${subs}` : title;
  }).filter(Boolean).join("\n");
}

/**
 * Seed So'Safe / Digiforma training programs from the exported JSON.
 * @param reset - if true, delete ALL existing programs first
 */
export async function seedDigiformaPrograms(reset = false) {
  let deleted = 0;
  if (reset) {
    const existing = await storage.getPrograms();
    for (const p of existing) {
      await storage.deleteProgram(p.id);
      deleted++;
    }
  }
  const existing = await storage.getPrograms();
  const existingTitles = new Set(existing.map((p: any) => p.title.toLowerCase()));
  let created = 0;
  let skipped = 0;

  // Try to load from Digiforma JSON export first
  let digiformaPrograms: any[] | null = null;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../scripts/digiforma-data/programs.json");
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      digiformaPrograms = raw?.data?.programs || null;
    }
  } catch { /* fallback to hardcoded */ }

  // Convert Digiforma data to our program format
  const programs: any[] = digiformaPrograms
    ? digiformaPrograms.filter((p: any) => p.onSale).map((p: any) => ({
        title: (p.name || "").trim(),
        subtitle: p.subtitle || null,
        description: (p.description || "").replace(/\r\n/g, "\n").trim(),
        categories: [p.category?.name, ...(p.tags || []).map((t: any) => t.name)].filter(Boolean),
        duration: p.durationInHours || 0,
        price: 0, // prices not in Digiforma export, set via admin
        level: "all_levels",
        objectives: textsToString(p.goals, "\n"),
        prerequisites: textsToString(p.prerequisites, "\n") || "Aucun prérequis.",
        modality: p.remote ? "distanciel" : "presentiel",
        status: "published" as const,
        certifying: !!p.cpf,
        targetAudience: textsToString(p.targets, "\n"),
        teachingMethods: textsToString(p.pedagogicalResources, "\n"),
        evaluationMethods: textsToString(p.assessments, "\n"),
        accessibilityInfo: (p.handicappedAccessibility || "").replace(/\r\n/g, "\n").trim(),
        programContent: stepsToString(p.steps),
        imageUrl: p.image?.url || null,
        fundingTypes: p.cpf ? ["cpf", "opco", "entreprise"] : ["opco", "entreprise"],
        maxParticipants: p.capacity?.max || 12,
      }))
    : [
    // === AFGSU ===
    {
      title: "AFGSU 1",
      description: "Formation aux gestes et soins d'urgence de niveau 1. Acquisition des connaissances nécessaires à l'identification d'une urgence à caractère médical et à sa prise en charge seul ou en équipe, en attendant l'arrivée de l'équipe médicale.",
      categories: ["AFGSU", "Urgences"],
      duration: 14,
      price: 350,
      level: "beginner",
      imageUrl: "https://cdn.filestackcontent.com/nUtcDBeiQMKl0KR2Hbou",
      objectives: "Identifier une urgence à caractère médical et sa prise en charge. Participer à la réponse à une urgence collective ou une situation sanitaire exceptionnelle. Acquérir les gestes d'urgence vitale et potentielle.",
      prerequisites: "Aucun prérequis. Personnel non professionnel de santé exerçant en établissement de santé, structure médico-sociale, cabinet libéral, maison de santé, centre de santé.",
      modality: "presentiel",
      status: "published",
      certifying: true,
      recyclingMonths: 48,
      targetAudience: "Personnels non professionnels de santé exerçant en établissement de santé, structure médico-sociale, cabinet libéral, maison de santé, centre de santé, ou demandeurs d'emploi souhaitant travailler en ETS/EMS.",
      teachingMethods: "Apports théoriques, mises en situation pratiques, ateliers gestuels, simulations sur mannequins, cas cliniques.",
      evaluationMethods: "Évaluation continue par mise en situation pratique. Attestation AFGSU 1 délivrée par le CESU.",
      fundingTypes: ["fifpl", "opco"],
      programContent: "Module 1 : Urgences vitales (arrêt cardiaque, obstruction des voies aériennes, hémorragies)\nModule 2 : Urgences potentielles (malaise, traumatismes, brûlures)\nModule 3 : Risques collectifs et situations sanitaires exceptionnelles",
    },
    {
      title: "AFGSU 2",
      description: "Formation aux gestes et soins d'urgence de niveau 2 pour les professionnels de santé. Acquisition des connaissances nécessaires à la prise en charge des urgences médicales avec utilisation de matériel d'urgence.",
      categories: ["AFGSU", "Urgences"],
      duration: 21,
      price: 750,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/FuUHoBK6RtuNW9xuQxcR",
      objectives: "Acquérir les connaissances théoriques et pratiques nécessaires à l'identification d'une urgence médicale et à sa prise en charge en équipe, en utilisant des techniques non invasives en attendant l'arrivée de l'équipe médicale.",
      prerequisites: "Aucun prérequis. Réservé aux professionnels de santé inscrits dans la 4ème partie du Code de la Santé Publique.",
      modality: "presentiel",
      status: "published",
      certifying: true,
      recyclingMonths: 48,
      targetAudience: "Professionnels de santé (médecins, infirmiers, aides-soignants, kinésithérapeutes, pharmaciens, sages-femmes…), étudiants en santé, aides médico-psychologiques, accompagnants éducatifs et sociaux.",
      teachingMethods: "Apports théoriques, mises en situation pratiques haute-fidélité, ateliers gestuels, simulations sur mannequins, débriefings structurés, cas cliniques.",
      evaluationMethods: "Évaluation continue par mise en situation pratique. Attestation AFGSU 2 délivrée par le CESU départemental. Validité 4 ans.",
      fundingTypes: ["fifpl", "opco", "entreprise"],
      resultIndicators: "Taux de satisfaction : 99% | Taux de recommandation : 100% | Taux de réussite : 100% | Note : 9.9/10 (340 avis)",
      programContent: "Jour 1 : Urgences vitales — Arrêt cardiaque, DSA/DAE, obstruction voies aériennes, hémorragies\nJour 2 : Urgences potentielles — Malaises, traumatismes, brûlures, accouchement inopiné\nJour 3 : Risques collectifs, SSE, situations d'exception, mise en situation globale",
    },
    {
      title: "AFGSU 2 — Urgences médicales au cabinet dentaire",
      description: "AFGSU 2 adaptée à l'environnement du cabinet dentaire. Format intensif sur 2 jours. Acquisition des gestes d'urgence spécifiques à la pratique dentaire.",
      categories: ["AFGSU", "Urgences", "Dentaire"],
      duration: 21,
      price: 900,
      imageUrl: "https://cdn.filestackcontent.com/OagqkrQMyWwr4Fiio0LA",
      level: "intermediate",
      objectives: "Identifier et prendre en charge les urgences médicales au cabinet dentaire. Maîtriser les gestes d'urgence adaptés à l'environnement dentaire. Gérer une situation de crise en cabinet.",
      prerequisites: "Aucun prérequis.",
      modality: "presentiel",
      status: "published",
      certifying: true,
      recyclingMonths: 48,
      targetAudience: "Chirurgiens-dentistes, orthodontistes, assistantes dentaires.",
      teachingMethods: "Apports théoriques, simulations haute-fidélité en environnement cabinet dentaire, ateliers gestuels, débriefings.",
      evaluationMethods: "Évaluation continue par mise en situation. Attestation AFGSU 2 délivrée par le CESU départemental.",
      fundingTypes: ["fifpl", "opco"],
      programContent: "Jour 1 (8h-20h) : Urgences vitales au cabinet — Arrêt cardiaque, DSA, obstruction VA, hémorragies, malaise vagal, choc anaphylactique\nJour 2 (8h-20h) : Urgences potentielles et risques collectifs — Traumatismes faciaux, intoxications, SSE, simulation globale",
    },
    {
      title: "Recyclage AFGSU 1",
      description: "Mise à jour des compétences en gestes et soins d'urgence de niveau 1. Recyclage obligatoire tous les 4 ans pour maintenir la validité de l'attestation AFGSU 1.",
      categories: ["AFGSU", "Urgences", "Recyclage"],
      duration: 7,
      price: 250,
      level: "beginner",
      imageUrl: "https://cdn.filestackcontent.com/2ekv6bNdSUiXDvYGngq4",
      objectives: "Réactualiser les connaissances et les gestes techniques relatifs aux urgences vitales et potentielles. Maintenir la validité de l'attestation AFGSU 1.",
      prerequisites: "Titulaire d'une attestation AFGSU 1 de moins de 4 ans.",
      modality: "presentiel",
      status: "published",
      certifying: true,
      recyclingMonths: 48,
      targetAudience: "Personnels non professionnels de santé titulaires d'une AFGSU 1 valide.",
      teachingMethods: "Révision théorique, ateliers pratiques, mises en situation, simulations.",
      evaluationMethods: "Évaluation continue par mise en situation. Attestation AFGSU 1 renouvelée par le CESU.",
      fundingTypes: ["fifpl", "opco"],
      programContent: "Révision des urgences vitales (ACR, DSA, hémorragies)\nRévision des urgences potentielles\nMises en situation et cas cliniques\nActualisation des recommandations",
    },
    {
      title: "Recyclage AFGSU 2",
      description: "Mise à jour des compétences en gestes et soins d'urgence de niveau 2. Recyclage obligatoire tous les 4 ans pour les professionnels de santé.",
      categories: ["AFGSU", "Urgences", "Recyclage"],
      duration: 7,
      price: 250,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/rYQ5qUqRSKaXO5rtW8ce",
      objectives: "Réactualiser les connaissances relatives aux urgences vitales et potentielles. Intégrer les dernières recommandations de prise en charge.",
      prerequisites: "Titulaire de l'AFGSU 2 ou d'une actualisation de moins de 4 ans.",
      modality: "presentiel",
      status: "published",
      certifying: true,
      recyclingMonths: 48,
      targetAudience: "Professionnels de santé titulaires d'une AFGSU 2 valide.",
      teachingMethods: "Révision théorique, simulations haute-fidélité, ateliers gestuels, débriefings structurés.",
      evaluationMethods: "Évaluation continue. Attestation AFGSU 2 renouvelée par le CESU départemental.",
      fundingTypes: ["fifpl", "opco", "entreprise"],
      resultIndicators: "Taux de satisfaction : 98% | Taux de recommandation : 100% | Taux de réussite : 100% | Note : 9.9/10 (269 avis)",
      programContent: "Révision des urgences vitales et potentielles\nUtilisation du matériel d'urgence\nSimulations sur mannequins et cas cliniques\nActualisation des recommandations scientifiques",
    },
    // === EUSIM ===
    {
      title: "EUSIM 1 — Formation Formateur en Simulation",
      description: "Formation de formateurs en simulation en santé. Acquisition des compétences pédagogiques pour concevoir et animer des séances de simulation.",
      categories: ["EUSIM", "Simulation", "Formation de formateurs"],
      duration: 21,
      price: 1500,
      level: "advanced",
      imageUrl: "https://cdn.filestackcontent.com/UijhGYwTai5oiHXGDcFw",
      objectives: "Concevoir un scénario de simulation. Animer une séance de simulation en santé. Conduire un débriefing structuré. Intégrer la simulation dans un programme de formation.",
      prerequisites: "Professionnel de santé ou formateur avec expérience clinique.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Professionnels de santé souhaitant devenir formateurs en simulation, cadres de santé, enseignants en IFSI/IFAS.",
      teachingMethods: "Cours magistraux, ateliers pratiques de simulation, conception de scénarios, animation de débriefings, retours d'expérience.",
      evaluationMethods: "Évaluation par mise en situation d'animation. Attestation de formation EUSIM niveau 1.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Jour 1 : Bases de la simulation en santé, théories de l'apprentissage\nJour 2 : Conception de scénarios, briefing, animation\nJour 3 : Débriefing structuré, évaluation, intégration curriculaire",
    },
    {
      title: "EUSIM 2 — Formation Formateur en Simulation avancée",
      description: "Formation avancée de formateurs en simulation. Perfectionnement des compétences en débriefing, gestion des situations complexes et recherche en simulation.",
      categories: ["EUSIM", "Simulation", "Formation de formateurs"],
      duration: 21,
      price: 1500,
      level: "advanced",
      imageUrl: "https://cdn.filestackcontent.com/ntVS1KFTlC7X1cV1Ogrn",
      objectives: "Perfectionner les techniques de débriefing. Gérer les situations de débriefing difficiles. Évaluer les compétences par la simulation. Initier une démarche de recherche en simulation.",
      prerequisites: "Avoir suivi EUSIM 1 ou équivalent. Expérience en animation de simulation.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Formateurs en simulation ayant suivi EUSIM 1, responsables de centres de simulation.",
      teachingMethods: "Ateliers avancés, peer-coaching, analyse vidéo, supervision de débriefings.",
      evaluationMethods: "Évaluation par mise en situation avancée. Attestation EUSIM niveau 2.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Jour 1 : Débriefing avancé, modèles théoriques approfondis\nJour 2 : Gestion des situations difficiles, facteurs humains\nJour 3 : Évaluation par simulation, recherche, projet personnel",
    },
    // === Gériatrie ===
    {
      title: "Accompagner autrement les personnes vivant avec une démence — L'expérience Demenz-Balance-Modell®",
      description: "Approche innovante d'accompagnement des personnes vivant avec une démence basée sur le modèle Demenz-Balance-Modell®. Comprendre les besoins fondamentaux et adapter sa posture professionnelle.",
      categories: ["Gériatrie", "Démence"],
      duration: 7,
      price: 350,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/hZSWG4SvSBq5Ct9O6Xpy",
      objectives: "Comprendre le vécu des personnes vivant avec une démence. Adapter sa posture professionnelle. Utiliser les outils du Demenz-Balance-Modell® au quotidien.",
      prerequisites: "Professionnel exerçant auprès de personnes âgées.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Soignants, aides-soignants, infirmiers, cadres de santé exerçant en EHPAD, gériatrie, SSR.",
      teachingMethods: "Apports théoriques, exercices expérientiels, mises en situation, analyse de pratiques.",
      evaluationMethods: "Évaluation par questionnaire et mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Le modèle Demenz-Balance-Modell®\nComprendre les comportements des personnes désorientées\nAdapter la communication et la relation d'aide\nOutils pratiques pour le quotidien",
    },
    // === Hypnose ===
    {
      title: "Hypnose en situation d'urgences et de soin",
      description: "Formation à l'utilisation de l'hypnose dans le contexte des urgences et des soins. Techniques de communication hypnotique et gestion de la douleur et de l'anxiété.",
      categories: ["Hypnose", "Urgences"],
      duration: 28,
      price: 1200,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/D7Iiq1dcQF6vu1sX3kfQ",
      objectives: "Maîtriser les techniques d'hypnose conversationnelle en situation d'urgence. Gérer la douleur et l'anxiété par l'hypnose. Intégrer l'hypnose dans sa pratique soignante quotidienne.",
      prerequisites: "Professionnel de santé en exercice.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Infirmiers, médecins urgentistes, ambulanciers, aides-soignants, IADE.",
      teachingMethods: "Cours théoriques, démonstrations, exercices en binômes, mises en situation réalistes, supervision.",
      evaluationMethods: "Évaluation continue par mise en situation. Attestation de formation.",
      fundingTypes: ["fifpl", "opco", "entreprise"],
      programContent: "Jour 1-2 : Bases de l'hypnose — induction, suggestion, communication thérapeutique\nJour 3 : Hypnose en situation d'urgence — douleur aiguë, anxiété, gestes invasifs\nJour 4 : Perfectionnement et mises en situation complexes",
    },
    {
      title: "Hypnose et périnatalité",
      description: "Formation à l'hypnose appliquée à la périnatalité. Accompagnement de la grossesse, de l'accouchement et du post-partum par les techniques hypnotiques.",
      categories: ["Hypnose", "Périnatalité"],
      duration: 42,
      price: 1800,
      level: "advanced",
      imageUrl: "https://cdn.filestackcontent.com/koKzT2cUTMymefwlKAjE",
      objectives: "Accompagner la grossesse, l'accouchement et le post-partum par l'hypnose. Maîtriser les techniques spécifiques à la périnatalité. Gérer la douleur obstétricale par l'hypnose.",
      prerequisites: "Professionnel de santé en périnatalité (sage-femme, obstétricien, anesthésiste).",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Sages-femmes, obstétriciens, anesthésistes, puéricultrices.",
      teachingMethods: "Cours théoriques, démonstrations, exercices pratiques, supervision clinique, études de cas.",
      evaluationMethods: "Évaluation continue. Attestation de formation en hypnose périnatale.",
      fundingTypes: ["fifpl", "opco"],
      programContent: "Module 1 (2j) : Bases de l'hypnose et communication thérapeutique\nModule 2 (2j) : Hypnose et grossesse — préparation, gestion de l'anxiété\nModule 3 (2j) : Hypnose et accouchement — gestion de la douleur, accompagnement",
    },
    // === IDE / IPA ===
    {
      title: "Certificat de décès",
      description: "Formation à la rédaction du certificat de décès. Aspects médico-légaux, réglementaires et pratiques de la constatation et de la certification des décès.",
      categories: ["IDE/IPA", "Médico-légal"],
      duration: 12,
      price: 400,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/GQH86HDVQQyfuCHIObj2",
      objectives: "Maîtriser les aspects réglementaires de la certification des décès. Rédiger correctement un certificat de décès. Identifier les situations médico-légales nécessitant un signalement.",
      prerequisites: "Médecin ou IPA en exercice.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Médecins, internes, IPA autorisés à certifier les décès.",
      teachingMethods: "Cours magistraux, cas cliniques, exercices pratiques de rédaction, analyse de certificats.",
      evaluationMethods: "QCM et cas pratiques. Attestation de formation.",
      fundingTypes: ["fifpl", "opco"],
      programContent: "Jour 1 : Cadre réglementaire, examen du corps, causes de décès\nJour 2 : Rédaction du certificat, cas particuliers (mort suspecte, obstacle médico-légal), exercices",
    },
    // === Kiné ===
    {
      title: "Prise en charge des cervicalgies",
      description: "Formation spécialisée dans la prise en charge kinésithérapeutique des cervicalgies. Bilan, diagnostic et techniques de traitement.",
      categories: ["Kiné", "Rééducation"],
      duration: 16,
      price: 600,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/y4e6xdfeSjq2XsKeeMkJ",
      objectives: "Réaliser un bilan complet des cervicalgies. Maîtriser les techniques de traitement manuel et actif. Construire un programme de rééducation personnalisé.",
      prerequisites: "Diplôme de masseur-kinésithérapeute.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Masseurs-kinésithérapeutes.",
      teachingMethods: "Apports théoriques, ateliers pratiques, démonstrations techniques, exercices en binômes.",
      evaluationMethods: "Évaluation par mise en situation pratique. Attestation de formation.",
      fundingTypes: ["fifpl"],
      programContent: "Jour 1 : Anatomie et biomécanique cervicale, bilan et diagnostic différentiel\nJour 2 : Techniques de traitement — thérapie manuelle, exercices actifs, programme personnalisé",
    },
    // === Pédiatrie ===
    {
      title: "Initiation Premiers Secours Enfant & Nourrisson",
      description: "Initiation aux gestes de premiers secours spécifiques aux enfants et nourrissons. Formation courte accessible à tous.",
      categories: ["Pédiatrie", "Premiers secours"],
      duration: 3.5,
      price: 80,
      level: "beginner",
      imageUrl: "https://cdn.filestackcontent.com/cPkcnk1SIKXI4H5ZfcuU",
      objectives: "Connaître les gestes de premiers secours adaptés à l'enfant et au nourrisson. Réagir face à une urgence pédiatrique. Alerter les secours de manière efficace.",
      prerequisites: "Aucun prérequis.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Parents, assistantes maternelles, personnel de crèche, enseignants, grand public.",
      teachingMethods: "Démonstrations sur mannequins pédiatriques, exercices pratiques, mises en situation.",
      evaluationMethods: "Participation active. Attestation de participation.",
      fundingTypes: ["particulier"],
      programContent: "Les gestes qui sauvent : étouffement, arrêt cardiaque, hémorragies\nSpécificités de l'enfant et du nourrisson\nAppeler les secours — quand et comment\nPrévention des accidents domestiques",
    },
    {
      title: "Les Urgences pédiatriques",
      description: "Formation complète sur la prise en charge des urgences pédiatriques. Spécificités de l'enfant et du nourrisson dans les situations d'urgence.",
      categories: ["Pédiatrie", "Urgences"],
      duration: 14,
      price: 600,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/ptKdF0wSTyWe2Y07xz3H",
      objectives: "Identifier et prendre en charge les urgences pédiatriques. Maîtriser les gestes d'urgence adaptés à l'enfant. Connaître les spécificités pharmacologiques et physiologiques pédiatriques.",
      prerequisites: "Professionnel de santé.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Infirmiers, médecins, puéricultrices, sages-femmes, ambulanciers.",
      teachingMethods: "Cours théoriques, simulations sur mannequins pédiatriques, cas cliniques, débriefings.",
      evaluationMethods: "Évaluation par mise en situation. Attestation de formation.",
      fundingTypes: ["fifpl", "opco"],
      programContent: "Jour 1 : Urgences vitales pédiatriques — ACR, détresse respiratoire, convulsions, déshydratation\nJour 2 : Urgences traumatiques et médicales — traumatismes, brûlures, intoxications, maltraitance",
    },
    // === Santé mentale ===
    {
      title: "Gestion pratique de la violence et de l'agressivité du patient et de son entourage",
      description: "Formation à la gestion des situations de violence et d'agressivité en milieu de soins. Prévention, désamorçage et techniques de protection.",
      categories: ["Santé mentale", "Gestion de crise"],
      duration: 14,
      price: 500,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/t1zfKnHR92Mh7FvvgKVA",
      objectives: "Identifier les signes précurseurs de violence. Maîtriser les techniques de désamorçage verbal. Connaître les techniques de protection et d'intervention. Gérer le post-incident.",
      prerequisites: "Professionnel exerçant en milieu de soins.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Tout professionnel de santé confronté à la violence : urgences, psychiatrie, gériatrie, libéral.",
      teachingMethods: "Apports théoriques, jeux de rôle, mises en situation réalistes, techniques corporelles de protection, débriefings.",
      evaluationMethods: "Évaluation par mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Jour 1 : Comprendre la violence — mécanismes, facteurs de risque, communication non-violente, désamorçage\nJour 2 : Agir — techniques de protection, contention adaptée, gestion post-incident, soutien aux victimes",
    },
    {
      title: "Premiers Secours en Santé Mentale — Module Standard (PSSM)",
      description: "Formation aux Premiers Secours en Santé Mentale (PSSM). Apprendre à repérer les troubles psychiques et à intervenir pour aider une personne en difficulté.",
      categories: ["Santé mentale", "Premiers secours"],
      duration: 14,
      price: 250,
      level: "beginner",
      imageUrl: "https://cdn.filestackcontent.com/gXzhEOimSHgSNwliwI",
      objectives: "Repérer les troubles de santé mentale. Adopter un comportement adapté face à une personne en souffrance psychique. Informer et orienter vers les professionnels compétents.",
      prerequisites: "Aucun prérequis.",
      modality: "presentiel",
      status: "published",
      certifying: true,
      targetAudience: "Tout public, professionnels de santé, travailleurs sociaux, RH, managers.",
      teachingMethods: "Cours théoriques, mises en situation, exercices en groupe, témoignages vidéo.",
      evaluationMethods: "Participation active et mise en situation. Certificat de secouriste en santé mentale.",
      fundingTypes: ["opco", "entreprise", "particulier"],
      programContent: "Jour 1 : Troubles dépressifs, troubles anxieux — repérer, aborder, écouter, orienter\nJour 2 : Troubles psychotiques, troubles liés aux substances — crise suicidaire, attaque de panique, psychose",
    },
    // === Simulation ===
    {
      title: "Débriefing difficile en Simulation",
      description: "Formation au débriefing dans les situations difficiles en simulation. Gestion des émotions, des conflits et des résistances pendant le débriefing.",
      categories: ["Simulation", "Formation de formateurs"],
      duration: 7,
      price: 500,
      level: "advanced",
      imageUrl: "https://cdn.filestackcontent.com/Q0Cz8iQgQWOhP3SGtseZ",
      objectives: "Identifier les situations de débriefing difficile. Maîtriser les techniques de gestion des émotions et des conflits. Adapter son débriefing aux situations complexes.",
      prerequisites: "Expérience en animation de simulation (EUSIM 1 ou équivalent recommandé).",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Formateurs en simulation expérimentés.",
      teachingMethods: "Analyses vidéo, exercices pratiques, mises en situation, peer-coaching.",
      evaluationMethods: "Évaluation par mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Identifier les signaux de difficulté pendant un débriefing\nTechniques de gestion émotionnelle\nGérer les résistances et les conflits\nSupervision et retours entre pairs",
    },
    {
      title: "Peer-coaching en simulation",
      description: "Formation au peer-coaching entre formateurs en simulation. Développer une culture d'amélioration continue par l'observation et le retour entre pairs.",
      categories: ["Simulation", "Formation de formateurs"],
      duration: 13,
      price: 700,
      level: "advanced",
      imageUrl: "https://cdn.filestackcontent.com/8IHlIctKRZqCFWJ56qqQ",
      objectives: "Mettre en place un dispositif de peer-coaching. Observer et analyser les pratiques de débriefing. Donner et recevoir un feedback constructif.",
      prerequisites: "Expérience en animation de simulation.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Formateurs en simulation, responsables pédagogiques.",
      teachingMethods: "Observation de pairs, feedback structuré, exercices pratiques, analyse vidéo.",
      evaluationMethods: "Évaluation par participation et mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Jour 1 : Principes du peer-coaching, grilles d'observation, feedback constructif\nJour 1.5 : Observation croisée, retours entre pairs, plan d'amélioration",
    },
    {
      title: "Sim'Coach",
      description: "Formation de coaching en simulation en santé. Accompagnement personnalisé des formateurs pour améliorer leurs pratiques de simulation.",
      categories: ["Simulation", "Formation de formateurs"],
      duration: 14,
      price: 800,
      level: "advanced",
      imageUrl: "https://cdn.filestackcontent.com/B8LiksPgTmKp6UajHV7P",
      objectives: "Accompagner individuellement les formateurs en simulation. Évaluer et améliorer les pratiques de simulation. Développer une posture de coach en simulation.",
      prerequisites: "Formateur en simulation avec expérience.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Formateurs expérimentés en simulation, coordinateurs de centres de simulation.",
      teachingMethods: "Coaching individuel, observation, feedback personnalisé, analyse de pratiques.",
      evaluationMethods: "Évaluation par mise en situation de coaching. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Jour 1 : Posture de coach, outils d'observation et d'évaluation\nJour 2 : Coaching en situation réelle, retours personnalisés, plan d'accompagnement",
    },
    // === Urgences ===
    {
      title: "Escape Game Damage Control",
      description: "Escape game pédagogique sur le thème du damage control en situation d'urgence. Approche ludique et immersive pour travailler le travail d'équipe et la prise de décision sous pression.",
      categories: ["Urgences", "Simulation", "Team building"],
      duration: 3.5,
      price: 0,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/bgS0FIqSXmO85IoOTxqW",
      objectives: "Renforcer le travail d'équipe en situation de crise. Développer la prise de décision sous pression. Appliquer les principes du damage control de manière ludique.",
      prerequisites: "Professionnel de santé.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Équipes soignantes, services d'urgence, équipes SMUR.",
      teachingMethods: "Escape game immersif, travail d'équipe, débriefing collectif.",
      evaluationMethods: "Débriefing collectif. Formation sur mesure uniquement.",
      fundingTypes: ["entreprise"],
      programContent: "Scénario immersif de damage control\nÉnigmes et défis en équipe sous contrainte de temps\nDébriefing structuré sur le travail d'équipe et la prise de décision",
    },
    {
      title: "Gestes et Soins d'Urgence en milieu Nautique",
      description: "Formation aux gestes d'urgence spécifiques au milieu nautique et aquatique. Prise en charge des noyades, hypothermies et traumatismes en milieu aquatique.",
      categories: ["Urgences", "Nautique"],
      duration: 7,
      price: 400,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/mvd6T2rISSORxf1HkmMZ",
      objectives: "Prendre en charge une noyade. Gérer une hypothermie. Réaliser les gestes d'urgence en milieu nautique. Organiser les secours en milieu aquatique.",
      prerequisites: "Savoir nager. Professionnel exerçant en milieu nautique ou aquatique.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Personnels de bases nautiques, moniteurs de voile, sauveteurs, professionnels du milieu maritime.",
      teachingMethods: "Cours théoriques, exercices en milieu aquatique, simulations, débriefings.",
      evaluationMethods: "Évaluation par mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Prise en charge de la noyade — extraction, réanimation\nHypothermie — prévention, détection, traitement\nTraumatismes en milieu aquatique\nOrganisation des secours",
    },
    {
      title: "Le soignant face à une situation sanitaire exceptionnelle",
      description: "Formation à la gestion des situations sanitaires exceptionnelles (SSE). Plans de secours, organisation de crise et prise en charge de nombreuses victimes.",
      categories: ["Urgences", "SSE"],
      duration: 14,
      price: 600,
      level: "intermediate",
      imageUrl: "https://cdn.filestackcontent.com/Jnp6BM0RCiOeaWVE4Cl0",
      objectives: "Connaître les plans de secours (Plan Blanc, ORSEC). Organiser la prise en charge de nombreuses victimes. Participer à la cellule de crise. Trier et catégoriser les victimes.",
      prerequisites: "Professionnel de santé.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Infirmiers, médecins, cadres de santé, directeurs d'établissement.",
      teachingMethods: "Cours théoriques, exercices de terrain, simulations de catastrophe, débriefings.",
      evaluationMethods: "Évaluation par mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise"],
      programContent: "Jour 1 : Cadre réglementaire — Plan Blanc, ORSEC, ORSAN. Triage et catégorisation\nJour 2 : Prise en charge de nombreuses victimes, gestion de crise, exercice grandeur nature",
    },
    {
      title: "Prise en charge de l'arrêt cardiaque et utilisation du Défibrillateur Externe Automatisé",
      description: "Formation à la prise en charge de l'arrêt cardiaque et à l'utilisation du DAE. Formation essentielle pour tout professionnel et tout citoyen.",
      categories: ["Urgences", "Premiers secours"],
      duration: 7,
      price: 200,
      level: "beginner",
      imageUrl: "https://cdn.filestackcontent.com/O6IGusHaR7mttFMyWuSW",
      objectives: "Reconnaître un arrêt cardiaque. Réaliser une RCP de qualité. Utiliser un DAE. Alerter les secours efficacement.",
      prerequisites: "Aucun prérequis.",
      modality: "presentiel",
      status: "published",
      certifying: false,
      targetAudience: "Tout public, professionnels de santé, personnel d'entreprise, agents de sécurité.",
      teachingMethods: "Démonstrations, exercices sur mannequins, mises en situation avec DAE, débriefings.",
      evaluationMethods: "Évaluation par mise en situation. Attestation de formation.",
      fundingTypes: ["opco", "entreprise", "particulier"],
      programContent: "Reconnaître l'arrêt cardiaque — signes, alerte\nRCP : massage cardiaque et ventilation\nUtilisation du DAE — étapes, sécurité\nMises en situation réalistes",
    },
  ];

  let updated = 0;
  for (const prog of programs) {
    if (existingTitles.has(prog.title.toLowerCase())) {
      // Update existing program with fresh Digiforma data
      const match = existing.find((p: any) => p.title.toLowerCase() === prog.title.toLowerCase());
      if (match) {
        const updates: Record<string, any> = {};
        // Always sync these fields from Digiforma
        if (prog.description && prog.description !== match.description) updates.description = prog.description;
        if (prog.objectives && prog.objectives !== match.objectives) updates.objectives = prog.objectives;
        if (prog.prerequisites && prog.prerequisites !== match.prerequisites) updates.prerequisites = prog.prerequisites;
        if (prog.targetAudience && prog.targetAudience !== match.targetAudience) updates.targetAudience = prog.targetAudience;
        if (prog.teachingMethods && prog.teachingMethods !== match.teachingMethods) updates.teachingMethods = prog.teachingMethods;
        if (prog.evaluationMethods && prog.evaluationMethods !== match.evaluationMethods) updates.evaluationMethods = prog.evaluationMethods;
        if (prog.programContent && prog.programContent !== (match as any).programContent) updates.programContent = prog.programContent;
        if (prog.accessibilityInfo && prog.accessibilityInfo !== match.accessibilityInfo) updates.accessibilityInfo = prog.accessibilityInfo;
        if (prog.imageUrl && !match.imageUrl) updates.imageUrl = prog.imageUrl;
        if (prog.duration && prog.duration !== match.duration) updates.duration = prog.duration;
        if (prog.categories && JSON.stringify(prog.categories) !== JSON.stringify(match.categories)) updates.categories = prog.categories;
        if (Object.keys(updates).length > 0) {
          await storage.updateProgram(match.id, updates as any);
          updated++;
        }
      }
      skipped++;
      continue;
    }
    await storage.createProgram(prog as any);
    created++;
  }

  return { created, skipped, updated, deleted, total: programs.length };
}
