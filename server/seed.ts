import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  const existingTrainers = await storage.getTrainers();
  if (existingTrainers.length > 0) return;

  const adminPassword = await hashPassword("admin123");
  await storage.createUser({
    username: "admin",
    password: adminPassword,
    role: "admin",
    firstName: "Admin",
    lastName: "SO'SAFE",
    email: "admin@so-safe.fr",
    trainerId: null,
    traineeId: null,
    enterpriseId: null,
  });

  const enterprise1 = await storage.createEnterprise({
    name: "CHU de Bordeaux",
    siret: "26330001200016",
    address: "12 Rue Jean Burguet",
    city: "Bordeaux",
    postalCode: "33000",
    contactName: "Dr. Isabelle Dupont",
    contactEmail: "i.dupont@chu-bordeaux.fr",
    contactPhone: "05 56 79 56 79",
    sector: "Hospitalier",
    status: "active",
    formatJuridique: "public",
    tvaNumber: "FR12263300012",
    email: "contact@chu-bordeaux.fr",
    phone: "05 56 79 56 00",
    legalRepName: "Dr. Jean-Pierre Morel",
    legalRepEmail: "jp.morel@chu-bordeaux.fr",
    legalRepPhone: "05 56 79 56 01",
  });

  const enterprise2 = await storage.createEnterprise({
    name: "Clinique Saint-Martin",
    siret: "44512345600012",
    address: "45 Avenue de la République",
    city: "Lyon",
    postalCode: "69003",
    contactName: "Marie Leroy",
    contactEmail: "m.leroy@clinique-stmartin.fr",
    contactPhone: "04 72 33 44 55",
    sector: "Clinique privée",
    status: "active",
    formatJuridique: "SAS",
    tvaNumber: "FR87445123456",
    email: "contact@clinique-stmartin.fr",
    phone: "04 72 33 44 00",
    legalRepName: "Pierre Duval",
    legalRepEmail: "p.duval@clinique-stmartin.fr",
    legalRepPhone: "04 72 33 44 01",
  });

  const enterprise3 = await storage.createEnterprise({
    name: "EHPAD Les Jardins",
    siret: "78945612300028",
    address: "8 Chemin des Roses",
    city: "Toulouse",
    postalCode: "31000",
    contactName: "Philippe Martin",
    contactEmail: "p.martin@ehpad-jardins.fr",
    contactPhone: "05 61 22 33 44",
    sector: "Médico-social",
    status: "active",
    formatJuridique: "association",
    tvaNumber: null,
    email: "contact@ehpad-jardins.fr",
    phone: "05 61 22 33 00",
    legalRepName: "Claire Bonnet",
    legalRepEmail: "c.bonnet@ehpad-jardins.fr",
    legalRepPhone: null,
  });

  // Enterprise contacts
  await storage.createEnterpriseContact({
    enterpriseId: enterprise1.id,
    firstName: "Isabelle",
    lastName: "Dupont",
    email: "i.dupont@chu-bordeaux.fr",
    phone: "05 56 79 56 79",
    role: "direction",
    isPrimary: true,
  });
  await storage.createEnterpriseContact({
    enterpriseId: enterprise1.id,
    firstName: "Marc",
    lastName: "Tessier",
    email: "m.tessier@chu-bordeaux.fr",
    phone: "05 56 79 56 10",
    role: "finance",
    isPrimary: false,
  });
  await storage.createEnterpriseContact({
    enterpriseId: enterprise1.id,
    firstName: "Nathalie",
    lastName: "Garnier",
    email: "n.garnier@chu-bordeaux.fr",
    phone: "05 56 79 56 20",
    role: "formation",
    isPrimary: false,
  });

  await storage.createEnterpriseContact({
    enterpriseId: enterprise2.id,
    firstName: "Marie",
    lastName: "Leroy",
    email: "m.leroy@clinique-stmartin.fr",
    phone: "04 72 33 44 55",
    role: "rh",
    isPrimary: true,
  });
  await storage.createEnterpriseContact({
    enterpriseId: enterprise2.id,
    firstName: "Antoine",
    lastName: "Fabre",
    email: "a.fabre@clinique-stmartin.fr",
    phone: "04 72 33 44 12",
    role: "finance",
    isPrimary: false,
  });

  await storage.createEnterpriseContact({
    enterpriseId: enterprise3.id,
    firstName: "Philippe",
    lastName: "Martin",
    email: "p.martin@ehpad-jardins.fr",
    phone: "05 61 22 33 44",
    role: "direction",
    isPrimary: true,
  });
  await storage.createEnterpriseContact({
    enterpriseId: enterprise3.id,
    firstName: "Sylvie",
    lastName: "Roux",
    email: "s.roux@ehpad-jardins.fr",
    phone: "05 61 22 33 50",
    role: "rh",
    isPrimary: false,
  });

  const trainer1 = await storage.createTrainer({
    firstName: "Sophie",
    lastName: "Martin",
    email: "sophie.martin@so-safe.fr",
    phone: "06 12 34 56 78",
    specialty: "AFGSU / Urgences",
    bio: "Formatrice AFGSU certifiée CESU, 10 ans d'expérience en formation aux gestes et soins d'urgence. Infirmière anesthésiste de formation.",
    status: "active",
    avatarUrl: null,
  });

  const trainer2 = await storage.createTrainer({
    firstName: "Thomas",
    lastName: "Durand",
    email: "thomas.durand@so-safe.fr",
    phone: "06 98 76 54 32",
    specialty: "Hygiène / Certibiocide",
    bio: "Expert en hygiène hospitalière et prévention des infections. Certifié Certibiocide et formateur agréé.",
    status: "active",
    avatarUrl: null,
  });

  const trainer3 = await storage.createTrainer({
    firstName: "Marie",
    lastName: "Lefebvre",
    email: "marie.lefebvre@so-safe.fr",
    phone: "06 45 67 89 01",
    specialty: "Prévention des risques",
    bio: "Consultante en prévention des risques professionnels. Spécialiste gestes et postures, TMS et sécurité au travail.",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainer({
    firstName: "Pierre",
    lastName: "Bernard",
    email: "pierre.bernard@so-safe.fr",
    phone: "06 23 45 67 89",
    specialty: "Management santé",
    bio: "Coach en management pour établissements de santé. Ancien directeur des soins, intervient sur le leadership et la gestion d'équipes soignantes.",
    status: "active",
    avatarUrl: null,
  });

  const trainee1 = await storage.createTrainee({
    firstName: "Lucas",
    lastName: "Moreau",
    email: "lucas.moreau@chu-bordeaux.fr",
    phone: "06 11 22 33 44",
    company: "CHU de Bordeaux",
    enterpriseId: enterprise1.id,
    status: "active",
    avatarUrl: null,
    civility: "M.",
    dateOfBirth: "1990-05-12",
    cityOfBirth: "Bordeaux",
    department: "33",
    profileType: "salarie",
    poleEmploiId: null,
    dietaryRegime: null,
    imageRightsConsent: true,
    proStatut: null,
    proDenomination: null,
    proSiret: null,
    proTva: null,
    profession: "infirmiere",
    rppsNumber: null,
  });

  const trainee2 = await storage.createTrainee({
    firstName: "Emma",
    lastName: "Petit",
    email: "emma.petit@clinique-stmartin.fr",
    phone: "06 55 66 77 88",
    company: "Clinique Saint-Martin",
    enterpriseId: enterprise2.id,
    status: "active",
    avatarUrl: null,
    civility: "Mme",
    dateOfBirth: "1988-11-23",
    cityOfBirth: "Lyon",
    department: "69",
    profileType: "salarie",
    poleEmploiId: null,
    dietaryRegime: "vegetarien",
    imageRightsConsent: true,
    proStatut: null,
    proDenomination: null,
    proSiret: null,
    proTva: null,
    profession: "aide_soignant",
    rppsNumber: null,
  });

  const trainee3 = await storage.createTrainee({
    firstName: "Hugo",
    lastName: "Robert",
    email: "hugo.robert@chu-bordeaux.fr",
    phone: "06 99 00 11 22",
    company: "CHU de Bordeaux",
    enterpriseId: enterprise1.id,
    status: "active",
    avatarUrl: null,
    civility: "M.",
    dateOfBirth: "1995-03-08",
    cityOfBirth: "Pau",
    department: "64",
    profileType: "salarie",
    poleEmploiId: null,
    dietaryRegime: null,
    imageRightsConsent: false,
    proStatut: null,
    proDenomination: null,
    proSiret: null,
    proTva: null,
    profession: "medecin",
    rppsNumber: "10003456789",
  });

  await storage.createTrainee({
    firstName: "Chloé",
    lastName: "Richard",
    email: "chloe.richard@clinique-stmartin.fr",
    phone: "06 33 44 55 66",
    company: "Clinique Saint-Martin",
    enterpriseId: enterprise2.id,
    status: "active",
    avatarUrl: null,
    civility: "Mme",
    dateOfBirth: "1992-07-15",
    cityOfBirth: "Marseille",
    department: "13",
    profileType: "salarie",
    poleEmploiId: null,
    dietaryRegime: "sans_gluten",
    imageRightsConsent: true,
    proStatut: null,
    proDenomination: null,
    proSiret: null,
    proTva: null,
    profession: "sage_femme",
    rppsNumber: "10004567890",
  });

  await storage.createTrainee({
    firstName: "Nathan",
    lastName: "Simon",
    email: "nathan.simon@liberal.fr",
    phone: "06 77 88 99 00",
    company: null,
    enterpriseId: null,
    status: "active",
    avatarUrl: null,
    civility: "M.",
    dateOfBirth: "1985-01-20",
    cityOfBirth: "Toulouse",
    department: "31",
    profileType: "profession_liberale",
    poleEmploiId: null,
    dietaryRegime: null,
    imageRightsConsent: true,
    proStatut: "Infirmier libéral",
    proDenomination: "Cabinet Simon Soins",
    proSiret: "89012345600015",
    proTva: "FR45890123456",
    profession: "infirmiere",
    rppsNumber: "10001234567",
  });

  const prog1 = await storage.createProgram({
    title: "AFGSU Niveau 1",
    description: "Attestation de Formation aux Gestes et Soins d'Urgence de niveau 1. Formation obligatoire pour les personnels des établissements de santé.",
    categories: ["AFGSU", "Urgences", "Tout public santé"],
    duration: 12,
    price: 350,
    level: "beginner",
    objectives: "Acquérir les connaissances pour identifier une urgence, protéger, alerter et prendre en charge une personne en situation d'urgence.",
    prerequisites: "Aucun prérequis",
    modality: "presentiel",
    status: "published",
    certifying: true,
    recyclingMonths: 48,
    fundingTypes: ["fifpl", "dpc"],
  });

  const prog2 = await storage.createProgram({
    title: "AFGSU Niveau 2",
    description: "Attestation de Formation aux Gestes et Soins d'Urgence de niveau 2. Destinée aux professionnels de santé inscrits dans la 4ème partie du code de la santé publique.",
    categories: ["AFGSU", "Urgences", "Infirmière", "Aide-soignant"],
    duration: 21,
    price: 600,
    level: "intermediate",
    objectives: "Maîtriser les gestes d'urgence avancés, la prise en charge en équipe et l'utilisation de matériel médical d'urgence.",
    prerequisites: "AFGSU Niveau 1 validé",
    modality: "presentiel",
    status: "published",
    certifying: true,
    recyclingMonths: 48,
    fundingTypes: ["fifpl", "dpc", "opco"],
  });

  const prog3 = await storage.createProgram({
    title: "Certibiocide",
    description: "Certification pour l'utilisation professionnelle de produits biocides. Obligatoire pour les professionnels manipulant des désinfectants en milieu hospitalier.",
    categories: ["Certibiocide", "Hygiène", "Infirmière"],
    duration: 21,
    price: 800,
    level: "intermediate",
    objectives: "Connaître la réglementation biocide, les bonnes pratiques d'utilisation et les mesures de prévention.",
    prerequisites: "Aucun prérequis",
    modality: "blended",
    status: "published",
    certifying: true,
    recyclingMonths: 60,
    fundingTypes: ["opco", "personnel"],
  });

  await storage.createProgram({
    title: "Gestes et Postures - Soignants",
    description: "Prévention des troubles musculosquelettiques pour les professionnels de santé. Techniques de manutention des patients.",
    categories: ["Gestes et postures", "Prévention des risques", "Aide-soignant", "Infirmière"],
    duration: 14,
    price: 450,
    level: "beginner",
    objectives: "Adopter les bonnes postures, utiliser les aides techniques et prévenir les TMS liés aux activités de soins.",
    prerequisites: null,
    modality: "presentiel",
    status: "published",
    certifying: false,
    recyclingMonths: null,
    fundingTypes: ["opco", "personnel"],
  });

  await storage.createProgram({
    title: "Certificat de décès - Formation médecins",
    description: "Formation à la rédaction du certificat de décès selon les règles en vigueur. Cadre légal et médical.",
    categories: ["Certificat de décès", "Médecin"],
    duration: 7,
    price: 300,
    level: "intermediate",
    objectives: "Maîtriser le cadre juridique, rédiger un certificat de décès conforme et gérer les situations particulières.",
    prerequisites: "Diplôme de médecine",
    modality: "distanciel",
    status: "published",
    certifying: false,
    recyclingMonths: null,
    fundingTypes: ["dpc"],
  });

  await storage.createProgram({
    title: "Management d'Équipe Soignante",
    description: "Développez vos compétences en management pour diriger efficacement vos équipes soignantes.",
    categories: ["Management santé", "Cadre de santé"],
    duration: 14,
    price: 900,
    level: "advanced",
    objectives: "Manager une équipe soignante, gérer les conflits, organiser le travail et les plannings.",
    prerequisites: null,
    modality: "blended",
    status: "draft",
    certifying: false,
    recyclingMonths: null,
  });

  // Program prerequisites
  // AFGSU 2 requires AFGSU 1 within 48 months
  await storage.createProgramPrerequisite({
    programId: prog2.id,
    requiredProgramId: prog1.id,
    requiredCategory: "AFGSU",
    maxMonthsSinceCompletion: 48,
    requiredProfessions: [],
    requiresRpps: false,
    description: "AFGSU Niveau 1 valide (moins de 48 mois)",
  });

  // Certificat de décès requires medecin + RPPS or IDE diploma > 3 years
  const prog5 = (await storage.getPrograms()).find(p => p.title.includes("Certificat de décès"));
  if (prog5) {
    await storage.createProgramPrerequisite({
      programId: prog5.id,
      requiredProgramId: null,
      requiredCategory: null,
      maxMonthsSinceCompletion: null,
      minMonthsSinceCompletion: 36,
      requiredProfessions: ["medecin", "infirmiere"],
      requiresRpps: true,
      requiresDiploma: true,
      description: "N° RPPS obligatoire ou diplôme IDE obtenu il y a plus de 3 ans",
    });
  }

  const session1 = await storage.createSession({
    programId: prog1.id,
    trainerId: trainer1.id,
    title: "AFGSU 1 - Mars 2026 - Bordeaux",
    startDate: "2026-03-15",
    endDate: "2026-03-17",
    location: "Bordeaux - Centre de Formation SO'SAFE",
    locationAddress: "12 Rue Jean Burguet, 33000 Bordeaux",
    locationRoom: "Salle A - RDC",
    modality: "presentiel",
    maxParticipants: 12,
    status: "planned",
    notes: "Formation sur 2 jours avec exercices pratiques sur mannequins.",
  });

  await storage.createSession({
    programId: prog2.id,
    trainerId: trainer1.id,
    title: "AFGSU 2 - Février 2026 - Lyon",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    location: "Lyon - Espace Formation Santé",
    locationAddress: "45 Avenue de la République, 69003 Lyon",
    locationRoom: "Salle 201 - 2ème étage",
    modality: "presentiel",
    maxParticipants: 10,
    status: "ongoing",
    notes: "Formation intensive 3 jours avec mise en situation.",
  });

  await storage.createSession({
    programId: prog3.id,
    trainerId: trainer2.id,
    title: "Certibiocide - Janvier 2026",
    startDate: "2026-01-20",
    endDate: "2026-01-24",
    location: "En ligne + 1 jour présentiel Bordeaux",
    locationAddress: "12 Rue Jean Burguet, 33000 Bordeaux",
    locationRoom: null,
    modality: "blended",
    maxParticipants: 15,
    status: "completed",
    notes: null,
    virtualClassUrl: "https://zoom.us/j/1234567890?pwd=exemple",
  });

  await storage.createSession({
    programId: prog1.id,
    trainerId: trainer1.id,
    title: "AFGSU 1 - Avril 2026 - Toulouse",
    startDate: "2026-04-14",
    endDate: "2026-04-16",
    location: "Toulouse - Centre Hospitalier",
    locationAddress: "8 Chemin des Roses, 31000 Toulouse",
    locationRoom: "Salle de formation B",
    modality: "presentiel",
    maxParticipants: 12,
    status: "planned",
    notes: null,
  });

  await storage.createEnrollment({
    sessionId: session1.id,
    traineeId: trainee1.id,
    enterpriseId: enterprise1.id,
    status: "registered",
    certificateUrl: null,
    notes: null,
  });

  await storage.createEnrollment({
    sessionId: session1.id,
    traineeId: trainee2.id,
    enterpriseId: enterprise2.id,
    status: "registered",
    certificateUrl: null,
    notes: null,
  });

  await storage.createEnrollment({
    sessionId: session1.id,
    traineeId: trainee3.id,
    enterpriseId: enterprise1.id,
    status: "pending",
    certificateUrl: null,
    notes: null,
  });

  // Seed attendance sheets & records for session 1
  const sheet1 = await storage.createAttendanceSheet({
    sessionId: session1.id,
    date: "2026-03-10",
    period: "matin",
    notes: null,
  });
  const sheet2 = await storage.createAttendanceSheet({
    sessionId: session1.id,
    date: "2026-03-10",
    period: "apres-midi",
    notes: null,
  });
  const sheet3 = await storage.createAttendanceSheet({
    sessionId: session1.id,
    date: "2026-03-11",
    period: "journee",
    notes: null,
  });

  // Create attendance records for enrolled trainees
  await storage.createAttendanceRecord({ sheetId: sheet1.id, traineeId: trainee1.id, status: "present", signedAt: new Date("2026-03-10T08:30:00"), notes: null, signatureData: null, emargementToken: null });
  await storage.createAttendanceRecord({ sheetId: sheet1.id, traineeId: trainee2.id, status: "present", signedAt: new Date("2026-03-10T08:35:00"), notes: null, signatureData: null, emargementToken: null });
  await storage.createAttendanceRecord({ sheetId: sheet1.id, traineeId: trainee3.id, status: "absent", signedAt: null, notes: null, signatureData: null, emargementToken: null });

  await storage.createAttendanceRecord({ sheetId: sheet2.id, traineeId: trainee1.id, status: "present", signedAt: new Date("2026-03-10T13:30:00"), notes: null, signatureData: null, emargementToken: null });
  await storage.createAttendanceRecord({ sheetId: sheet2.id, traineeId: trainee2.id, status: "late", signedAt: new Date("2026-03-10T14:05:00"), notes: "Arrivé en retard de 35 min", signatureData: null, emargementToken: null });
  await storage.createAttendanceRecord({ sheetId: sheet2.id, traineeId: trainee3.id, status: "excused", signedAt: null, notes: "Justificatif médical", signatureData: null, emargementToken: null });

  await storage.createAttendanceRecord({ sheetId: sheet3.id, traineeId: trainee1.id, status: "present", signedAt: new Date("2026-03-11T09:00:00"), notes: null, signatureData: null, emargementToken: null });
  await storage.createAttendanceRecord({ sheetId: sheet3.id, traineeId: trainee2.id, status: "present", signedAt: new Date("2026-03-11T09:02:00"), notes: null, signatureData: null, emargementToken: null });
  await storage.createAttendanceRecord({ sheetId: sheet3.id, traineeId: trainee3.id, status: "present", signedAt: new Date("2026-03-11T09:10:00"), notes: null, signatureData: null, emargementToken: null });

  // Seed default organization settings (logo, name, etc.)
  const defaultSettings: { key: string; value: string }[] = [
    { key: "org_name", value: "SO'SAFE" },
    { key: "org_email", value: "contact@so-safe.fr" },
    { key: "org_phone", value: "06 00 00 00 00" },
    { key: "org_address", value: "481 Chemin du gros chêne, 83390 PUGET VILLE" },
    { key: "org_logo_url", value: "/logo-sosafe-official.png" },
  ];
  for (const s of defaultSettings) {
    await storage.upsertOrganizationSetting(s);
  }

  console.log("Database seeded successfully with SO'SAFE data");
}

/**
 * Ensures essential organization settings exist (logo, name, etc.).
 * Safe to call multiple times — only sets values if key is missing.
 */
export async function seedOrganizationDefaults() {
  const existing = await storage.getOrganizationSettings();
  const existingKeys = new Set(existing.map(s => s.key));

  const defaults: { key: string; value: string }[] = [
    { key: "org_name", value: "SO'SAFE" },
    { key: "org_email", value: "contact@so-safe.fr" },
    { key: "org_phone", value: "06 00 00 00 00" },
    { key: "org_address", value: "481 Chemin du gros chêne, 83390 PUGET VILLE" },
    { key: "org_logo_url", value: "/logo-sosafe-official.png" },
  ];

  for (const s of defaults) {
    if (!existingKeys.has(s.key)) {
      await storage.upsertOrganizationSetting(s);
    }
  }
}

/**
 * Ensures essential email templates and automation rules exist.
 * Safe to call multiple times — only creates what's missing.
 */
export async function seedAutomationDefaults() {
  const templates = await storage.getEmailTemplates();
  const rules = await storage.getAutomationRules();

  // ---- Confirmation email template ----
  const confirmTplName = "Confirmation d'inscription";
  let confirmTemplate = templates.find(t => t.name === confirmTplName);
  if (!confirmTemplate) {
    confirmTemplate = await storage.createEmailTemplate({
      name: confirmTplName,
      subject: "Confirmation de votre inscription — {titre_session}",
      body: `<p>Bonjour {prenom} {nom},</p>
<p>Nous avons le plaisir de vous confirmer votre inscription à la session de formation suivante :</p>
<ul>
  <li><strong>Formation :</strong> {titre_formation}</li>
  <li><strong>Session :</strong> {titre_session}</li>
  <li><strong>Dates :</strong> du {date_debut} au {date_fin}</li>
  <li><strong>Lieu :</strong> {lieu}</li>
  <li><strong>Modalité :</strong> {modalite}</li>
</ul>
<p>Vous recevrez prochainement les informations complémentaires (convocation, programme détaillé, etc.).</p>
<p>Cordialement,<br/>L'équipe SO'SAFE Formation</p>`,
      category: "inscription",
    });
    console.log("[seed] Created email template:", confirmTplName);
  }

  // ---- Cancellation email template ----
  const cancelTplName = "Annulation d'inscription";
  let cancelTemplate = templates.find(t => t.name === cancelTplName);
  if (!cancelTemplate) {
    cancelTemplate = await storage.createEmailTemplate({
      name: cancelTplName,
      subject: "Annulation de votre inscription — {titre_session}",
      body: `<p>Bonjour {prenom} {nom},</p>
<p>Nous vous informons que votre inscription à la session suivante a été annulée :</p>
<ul>
  <li><strong>Formation :</strong> {titre_formation}</li>
  <li><strong>Session :</strong> {titre_session}</li>
  <li><strong>Dates :</strong> du {date_debut} au {date_fin}</li>
</ul>
<p>Si vous souhaitez vous inscrire à une autre session, n'hésitez pas à consulter notre catalogue de formations.</p>
<p>Cordialement,<br/>L'équipe SO'SAFE Formation</p>`,
      category: "inscription",
    });
    console.log("[seed] Created email template:", cancelTplName);
  }

  // ---- Automation rule: send confirmation email ----
  const confirmRuleName = "Email de confirmation d'inscription";
  if (!rules.find(r => r.name === confirmRuleName)) {
    await storage.createAutomationRule({
      name: confirmRuleName,
      event: "enrollment_confirmed",
      action: "send_email",
      templateId: confirmTemplate.id,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", confirmRuleName);
  }

  // ---- Automation rule: send cancellation email ----
  const cancelRuleName = "Email d'annulation d'inscription";
  if (!rules.find(r => r.name === cancelRuleName)) {
    await storage.createAutomationRule({
      name: cancelRuleName,
      event: "enrollment_cancelled",
      action: "send_email",
      templateId: cancelTemplate.id,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", cancelRuleName);
  }

  // ========================================================================
  // CASCADE WORKFLOW RULES (Section 5.1 du cahier des charges)
  // ========================================================================

  // ---- 1. Devis signé → Génération convention ----
  const quoteSignedRuleName = "Cascade : Devis signé → Convention";
  if (!rules.find(r => r.name === quoteSignedRuleName)) {
    await storage.createAutomationRule({
      name: quoteSignedRuleName,
      event: "quote_signed",
      action: "generate_convention",
      templateId: null,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", quoteSignedRuleName);
  }

  // ---- 2. Convention signée → Convocation ----
  const conventionConvocationRuleName = "Cascade : Convention signée → Convocation";
  if (!rules.find(r => r.name === conventionConvocationRuleName)) {
    await storage.createAutomationRule({
      name: conventionConvocationRuleName,
      event: "convention_signed",
      action: "generate_convocation",
      templateId: null,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", conventionConvocationRuleName);
  }

  // ---- 2b. Convention signée → Facture ----
  const conventionInvoiceRuleName = "Cascade : Convention signée → Facture";
  if (!rules.find(r => r.name === conventionInvoiceRuleName)) {
    await storage.createAutomationRule({
      name: conventionInvoiceRuleName,
      event: "convention_signed",
      action: "create_invoice",
      templateId: null,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", conventionInvoiceRuleName);
  }

  // ---- 3. Formation terminée → Attestation de réalisation ----
  const completedAttestationRuleName = "Cascade : Formation terminée → Attestation";
  if (!rules.find(r => r.name === completedAttestationRuleName)) {
    await storage.createAutomationRule({
      name: completedAttestationRuleName,
      event: "enrollment_completed",
      action: "generate_attestation_presence",
      templateId: null,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", completedAttestationRuleName);
  }

  // ---- 4. Absence détectée → Email à l'apprenant ----
  const absenceTraineeTplName = "Notification d'absence — Apprenant";
  let absenceTraineeTemplate = templates.find(t => t.name === absenceTraineeTplName);
  if (!absenceTraineeTemplate) {
    absenceTraineeTemplate = await storage.createEmailTemplate({
      name: absenceTraineeTplName,
      subject: "Absence constatée — {titre_session}",
      body: `<p>Bonjour {prenom} {nom},</p>
<p>Nous avons constaté votre absence à la session de formation suivante :</p>
<ul>
  <li><strong>Formation :</strong> {titre_formation}</li>
  <li><strong>Session :</strong> {titre_session}</li>
  <li><strong>Dates :</strong> du {date_debut} au {date_fin}</li>
</ul>
<p>Cette absence a été signalée et peut avoir un impact sur la délivrance de votre attestation de formation.</p>
<p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre organisme de formation dans les plus brefs délais.</p>
<p>Cordialement,<br/>L'équipe {nom_organisme}</p>`,
      category: "suivi",
    });
    console.log("[seed] Created email template:", absenceTraineeTplName);
  }

  const absenceTraineeRuleName = "Cascade : Absence → Email apprenant";
  if (!rules.find(r => r.name === absenceTraineeRuleName)) {
    await storage.createAutomationRule({
      name: absenceTraineeRuleName,
      event: "absence_detected",
      action: "send_email",
      templateId: absenceTraineeTemplate.id,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", absenceTraineeRuleName);
  }

  // ---- 4b. Absence détectée → Email à l'entreprise (commanditaire) ----
  const absenceEnterpriseTplName = "Notification d'absence — Entreprise";
  let absenceEnterpriseTemplate = templates.find(t => t.name === absenceEnterpriseTplName);
  if (!absenceEnterpriseTemplate) {
    absenceEnterpriseTemplate = await storage.createEmailTemplate({
      name: absenceEnterpriseTplName,
      subject: "Absence constatée — {prenom} {nom} — {titre_session}",
      body: `<p>Bonjour,</p>
<p>Nous souhaitons vous informer de l'absence constatée de votre collaborateur/trice lors de la session de formation suivante :</p>
<ul>
  <li><strong>Stagiaire :</strong> {prenom} {nom}</li>
  <li><strong>Formation :</strong> {titre_formation}</li>
  <li><strong>Session :</strong> {titre_session}</li>
  <li><strong>Dates :</strong> du {date_debut} au {date_fin}</li>
</ul>
<p>Cette absence a été enregistrée et le certificat de réalisation ne pourra pas être délivré en l'état.</p>
<p>Cordialement,<br/>L'équipe {nom_organisme}</p>`,
      category: "suivi",
    });
    console.log("[seed] Created email template:", absenceEnterpriseTplName);
  }

  const absenceEnterpriseRuleName = "Cascade : Absence → Email entreprise";
  if (!rules.find(r => r.name === absenceEnterpriseRuleName)) {
    await storage.createAutomationRule({
      name: absenceEnterpriseRuleName,
      event: "absence_detected",
      action: "send_email_enterprise",
      templateId: absenceEnterpriseTemplate.id,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", absenceEnterpriseRuleName);
  }

  // ---- 4c. Absence détectée → Blocage certificat ----
  const absenceBlockRuleName = "Cascade : Absence → Blocage certificat";
  if (!rules.find(r => r.name === absenceBlockRuleName)) {
    await storage.createAutomationRule({
      name: absenceBlockRuleName,
      event: "absence_detected",
      action: "block_certificate",
      templateId: null,
      delay: 0,
      active: true,
      conditions: {},
    });
    console.log("[seed] Created automation rule:", absenceBlockRuleName);
  }

  // ---- 5. Fin de formation → Questionnaire de satisfaction ----
  const satisfactionRuleName = "Cascade : Fin formation → Satisfaction à chaud";
  if (!rules.find(r => r.name === satisfactionRuleName)) {
    await storage.createAutomationRule({
      name: satisfactionRuleName,
      event: "post_session_followup",
      action: "send_evaluation",
      templateId: null,
      delay: 0,
      active: true,
      conditions: { evaluationType: "satisfaction_hot" },
    });
    console.log("[seed] Created automation rule:", satisfactionRuleName);
  }
}
