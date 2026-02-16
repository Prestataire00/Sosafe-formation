import { storage } from "./storage";

export async function seedDatabase() {
  const existingTrainers = await storage.getTrainers();
  if (existingTrainers.length > 0) return;

  const trainer1 = await storage.createTrainer({
    firstName: "Sophie",
    lastName: "Martin",
    email: "sophie.martin@formaflow.fr",
    phone: "06 12 34 56 78",
    specialty: "Développement web",
    bio: "Formatrice expérimentée avec 10 ans d'expérience dans le développement web full-stack. Spécialisée React, Node.js et TypeScript.",
    status: "active",
    avatarUrl: null,
  });

  const trainer2 = await storage.createTrainer({
    firstName: "Thomas",
    lastName: "Durand",
    email: "thomas.durand@formaflow.fr",
    phone: "06 98 76 54 32",
    specialty: "Design UX/UI",
    bio: "Designer senior avec une expertise en conception d'interfaces utilisateur et en recherche utilisateur. Ancien lead designer chez une startup parisienne.",
    status: "active",
    avatarUrl: null,
  });

  const trainer3 = await storage.createTrainer({
    firstName: "Marie",
    lastName: "Lefebvre",
    email: "marie.lefebvre@formaflow.fr",
    phone: "06 45 67 89 01",
    specialty: "Marketing digital",
    bio: "Consultante en marketing digital et stratégie de contenu. Certifiée Google Ads et Facebook Blueprint.",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainer({
    firstName: "Pierre",
    lastName: "Bernard",
    email: "pierre.bernard@formaflow.fr",
    phone: "06 23 45 67 89",
    specialty: "Management",
    bio: "Coach certifié en management et leadership. Intervient auprès de grandes entreprises du CAC 40.",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainee({
    firstName: "Lucas",
    lastName: "Moreau",
    email: "lucas.moreau@entreprise.fr",
    phone: "06 11 22 33 44",
    company: "TechCorp France",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainee({
    firstName: "Emma",
    lastName: "Petit",
    email: "emma.petit@startup.io",
    phone: "06 55 66 77 88",
    company: "InnoStart",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainee({
    firstName: "Hugo",
    lastName: "Robert",
    email: "hugo.robert@agence.fr",
    phone: "06 99 00 11 22",
    company: "Agence Créative",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainee({
    firstName: "Chloé",
    lastName: "Richard",
    email: "chloe.richard@conseil.fr",
    phone: "06 33 44 55 66",
    company: "Conseil & Associés",
    status: "active",
    avatarUrl: null,
  });

  await storage.createTrainee({
    firstName: "Nathan",
    lastName: "Simon",
    email: "nathan.simon@digital.fr",
    phone: "06 77 88 99 00",
    company: null,
    status: "inactive",
    avatarUrl: null,
  });

  const prog1 = await storage.createProgram({
    title: "React & TypeScript Avancé",
    description: "Maîtrisez React avec TypeScript, les patterns avancés, la gestion d'état et les bonnes pratiques de développement moderne.",
    category: "Développement web",
    duration: 35,
    price: 2500,
    level: "advanced",
    objectives: "Maîtriser les hooks avancés, le state management, les tests et le déploiement d'applications React.",
    status: "published",
  });

  const prog2 = await storage.createProgram({
    title: "Design Thinking & UX Research",
    description: "Apprenez les méthodologies du Design Thinking et les techniques de recherche utilisateur pour concevoir des produits centrés sur l'utilisateur.",
    category: "Design",
    duration: 21,
    price: 1800,
    level: "intermediate",
    objectives: "Conduire des entretiens utilisateurs, créer des personas, prototyper et tester des solutions.",
    status: "published",
  });

  const prog3 = await storage.createProgram({
    title: "Marketing Digital & SEO",
    description: "Stratégies complètes de marketing digital incluant SEO, SEA, réseaux sociaux et content marketing.",
    category: "Marketing digital",
    duration: 14,
    price: 1200,
    level: "beginner",
    objectives: "Mettre en place une stratégie digitale, optimiser le référencement naturel et gérer des campagnes publicitaires.",
    status: "published",
  });

  await storage.createProgram({
    title: "Leadership & Management d'Équipe",
    description: "Développez vos compétences en management pour diriger efficacement vos équipes et inspirer la performance collective.",
    category: "Management",
    duration: 14,
    price: 1600,
    level: "intermediate",
    objectives: "Manager une équipe, gérer les conflits, motiver et développer les talents.",
    status: "draft",
  });

  await storage.createProgram({
    title: "Python pour la Data Science",
    description: "Introduction complète à Python pour l'analyse de données, le machine learning et la visualisation.",
    category: "Data & IA",
    duration: 28,
    price: 2200,
    level: "beginner",
    objectives: "Maîtriser Python, Pandas, NumPy, Matplotlib et scikit-learn pour l'analyse de données.",
    status: "published",
  });

  await storage.createSession({
    programId: prog1.id,
    trainerId: trainer1.id,
    title: "Session React - Mars 2026",
    startDate: "2026-03-15",
    endDate: "2026-03-19",
    location: "Paris - Campus Numérique",
    maxParticipants: 12,
    status: "planned",
    notes: "Formation intensive sur 5 jours avec projet fil rouge.",
  });

  await storage.createSession({
    programId: prog2.id,
    trainerId: trainer2.id,
    title: "Session UX Design - Février 2026",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    location: "Lyon - Espace Formation",
    maxParticipants: 10,
    status: "ongoing",
    notes: "Workshop pratique avec cas d'étude réel.",
  });

  await storage.createSession({
    programId: prog3.id,
    trainerId: trainer3.id,
    title: "Session Marketing - Janvier 2026",
    startDate: "2026-01-20",
    endDate: "2026-01-24",
    location: "En ligne (Zoom)",
    maxParticipants: 15,
    status: "completed",
    notes: null,
  });

  await storage.createSession({
    programId: prog1.id,
    trainerId: trainer1.id,
    title: "Session React - Avril 2026",
    startDate: "2026-04-14",
    endDate: "2026-04-18",
    location: "Bordeaux - La Cité Numérique",
    maxParticipants: 12,
    status: "planned",
    notes: null,
  });

  console.log("Database seeded successfully");
}
