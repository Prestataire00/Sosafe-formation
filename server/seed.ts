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
  });

  const enterprise2 = await storage.createEnterprise({
    name: "Clinique Saint-Martin",
    siret: "44512345600012",
    address: "45 Avenue de la R\u00e9publique",
    city: "Lyon",
    postalCode: "69003",
    contactName: "Marie Leroy",
    contactEmail: "m.leroy@clinique-stmartin.fr",
    contactPhone: "04 72 33 44 55",
    sector: "Clinique priv\u00e9e",
    status: "active",
  });

  await storage.createEnterprise({
    name: "EHPAD Les Jardins",
    siret: "78945612300028",
    address: "8 Chemin des Roses",
    city: "Toulouse",
    postalCode: "31000",
    contactName: "Philippe Martin",
    contactEmail: "p.martin@ehpad-jardins.fr",
    contactPhone: "05 61 22 33 44",
    sector: "M\u00e9dico-social",
    status: "active",
  });

  const trainer1 = await storage.createTrainer({
    firstName: "Sophie",
    lastName: "Martin",
    email: "sophie.martin@so-safe.fr",
    phone: "06 12 34 56 78",
    specialty: "AFGSU / Urgences",
    bio: "Formatrice AFGSU certifi\u00e9e CESU, 10 ans d'exp\u00e9rience en formation aux gestes et soins d'urgence. Infirmi\u00e8re anesth\u00e9siste de formation.",
    status: "active",
    avatarUrl: null,
  });

  const trainer2 = await storage.createTrainer({
    firstName: "Thomas",
    lastName: "Durand",
    email: "thomas.durand@so-safe.fr",
    phone: "06 98 76 54 32",
    specialty: "Hygi\u00e8ne / Certibiocide",
    bio: "Expert en hygi\u00e8ne hospitali\u00e8re et pr\u00e9vention des infections. Certifi\u00e9 Certibiocide et formateur agr\u00e9\u00e9.",
    status: "active",
    avatarUrl: null,
  });

  const trainer3 = await storage.createTrainer({
    firstName: "Marie",
    lastName: "Lefebvre",
    email: "marie.lefebvre@so-safe.fr",
    phone: "06 45 67 89 01",
    specialty: "Pr\u00e9vention des risques",
    bio: "Consultante en pr\u00e9vention des risques professionnels. Sp\u00e9cialiste gestes et postures, TMS et s\u00e9curit\u00e9 au travail.",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainer({
    firstName: "Pierre",
    lastName: "Bernard",
    email: "pierre.bernard@so-safe.fr",
    phone: "06 23 45 67 89",
    specialty: "Management sant\u00e9",
    bio: "Coach en management pour \u00e9tablissements de sant\u00e9. Ancien directeur des soins, intervient sur le leadership et la gestion d'\u00e9quipes soignantes.",
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
  });

  await storage.createTrainee({
    firstName: "Chlo\u00e9",
    lastName: "Richard",
    email: "chloe.richard@clinique-stmartin.fr",
    phone: "06 33 44 55 66",
    company: "Clinique Saint-Martin",
    enterpriseId: enterprise2.id,
    status: "active",
    avatarUrl: null,
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
  });

  const prog1 = await storage.createProgram({
    title: "AFGSU Niveau 1",
    description: "Attestation de Formation aux Gestes et Soins d'Urgence de niveau 1. Formation obligatoire pour les personnels des \u00e9tablissements de sant\u00e9.",
    category: "AFGSU",
    duration: 12,
    price: 350,
    level: "beginner",
    objectives: "Acqu\u00e9rir les connaissances pour identifier une urgence, prot\u00e9ger, alerter et prendre en charge une personne en situation d'urgence.",
    prerequisites: "Aucun pr\u00e9requis",
    modality: "presentiel",
    status: "published",
    certifying: true,
    recyclingMonths: 48,
  });

  const prog2 = await storage.createProgram({
    title: "AFGSU Niveau 2",
    description: "Attestation de Formation aux Gestes et Soins d'Urgence de niveau 2. Destin\u00e9e aux professionnels de sant\u00e9 inscrits dans la 4\u00e8me partie du code de la sant\u00e9 publique.",
    category: "AFGSU",
    duration: 21,
    price: 600,
    level: "intermediate",
    objectives: "Ma\u00eetriser les gestes d'urgence avanc\u00e9s, la prise en charge en \u00e9quipe et l'utilisation de mat\u00e9riel m\u00e9dical d'urgence.",
    prerequisites: "AFGSU Niveau 1 valid\u00e9",
    modality: "presentiel",
    status: "published",
    certifying: true,
    recyclingMonths: 48,
  });

  const prog3 = await storage.createProgram({
    title: "Certibiocide",
    description: "Certification pour l'utilisation professionnelle de produits biocides. Obligatoire pour les professionnels manipulant des d\u00e9sinfectants en milieu hospitalier.",
    category: "Certibiocide",
    duration: 21,
    price: 800,
    level: "intermediate",
    objectives: "Conna\u00eetre la r\u00e9glementation biocide, les bonnes pratiques d'utilisation et les mesures de pr\u00e9vention.",
    prerequisites: "Aucun pr\u00e9requis",
    modality: "blended",
    status: "published",
    certifying: true,
    recyclingMonths: 60,
  });

  await storage.createProgram({
    title: "Gestes et Postures - Soignants",
    description: "Pr\u00e9vention des troubles musculosquelettiques pour les professionnels de sant\u00e9. Techniques de manutention des patients.",
    category: "Gestes et postures",
    duration: 14,
    price: 450,
    level: "beginner",
    objectives: "Adopter les bonnes postures, utiliser les aides techniques et pr\u00e9venir les TMS li\u00e9s aux activit\u00e9s de soins.",
    prerequisites: null,
    modality: "presentiel",
    status: "published",
    certifying: false,
    recyclingMonths: null,
  });

  await storage.createProgram({
    title: "Certificat de d\u00e9c\u00e8s - Formation m\u00e9decins",
    description: "Formation \u00e0 la r\u00e9daction du certificat de d\u00e9c\u00e8s selon les r\u00e8gles en vigueur. Cadre l\u00e9gal et m\u00e9dical.",
    category: "Certificat de d\u00e9c\u00e8s",
    duration: 7,
    price: 300,
    level: "intermediate",
    objectives: "Ma\u00eetriser le cadre juridique, r\u00e9diger un certificat de d\u00e9c\u00e8s conforme et g\u00e9rer les situations particuli\u00e8res.",
    prerequisites: "Dipl\u00f4me de m\u00e9decine",
    modality: "distanciel",
    status: "published",
    certifying: false,
    recyclingMonths: null,
  });

  await storage.createProgram({
    title: "Management d'\u00c9quipe Soignante",
    description: "D\u00e9veloppez vos comp\u00e9tences en management pour diriger efficacement vos \u00e9quipes soignantes.",
    category: "Management sant\u00e9",
    duration: 14,
    price: 900,
    level: "advanced",
    objectives: "Manager une \u00e9quipe soignante, g\u00e9rer les conflits, organiser le travail et les plannings.",
    prerequisites: null,
    modality: "blended",
    status: "draft",
    certifying: false,
    recyclingMonths: null,
  });

  const session1 = await storage.createSession({
    programId: prog1.id,
    trainerId: trainer1.id,
    title: "AFGSU 1 - Mars 2026 - Bordeaux",
    startDate: "2026-03-15",
    endDate: "2026-03-17",
    location: "Bordeaux - Centre de Formation SO'SAFE",
    modality: "presentiel",
    maxParticipants: 12,
    status: "planned",
    notes: "Formation sur 2 jours avec exercices pratiques sur mannequins.",
  });

  await storage.createSession({
    programId: prog2.id,
    trainerId: trainer1.id,
    title: "AFGSU 2 - F\u00e9vrier 2026 - Lyon",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    location: "Lyon - Espace Formation Sant\u00e9",
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
    location: "En ligne + 1 jour pr\u00e9sentiel Bordeaux",
    modality: "blended",
    maxParticipants: 15,
    status: "completed",
    notes: null,
  });

  await storage.createSession({
    programId: prog1.id,
    trainerId: trainer1.id,
    title: "AFGSU 1 - Avril 2026 - Toulouse",
    startDate: "2026-04-14",
    endDate: "2026-04-16",
    location: "Toulouse - Centre Hospitalier",
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

  console.log("Database seeded successfully with SO'SAFE data");
}
