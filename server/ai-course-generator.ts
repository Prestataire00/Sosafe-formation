import fs from "fs";
import path from "path";

interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface ScenarioChoice {
  id: string;
  text: string;
  feedback: string;
  points: number;
  nextNodeId: string | null;
}

interface ScenarioNode {
  id: string;
  situation: string;
  choices: ScenarioChoice[];
}

interface ScenarioConfig {
  startNodeId: string;
  nodes: ScenarioNode[];
}

interface SimulationConfig {
  subType: "ordering" | "matching" | "fill_blank";
  instructions: string;
  orderingItems?: string[];
  matchingPairs?: { left: string; right: string }[];
  fillBlankText?: string;
  fillBlankAnswers?: Record<string, string>;
  wordBank?: string[];
  maxScore?: number;
  passingScore?: number;
  allowRetry?: boolean;
  showHintsAfterFail?: boolean;
}

interface GeneratedBlock {
  type: "text" | "quiz" | "flashcard" | "scenario" | "simulation";
  title: string;
  content?: string;
  quizQuestions?: GeneratedQuizQuestion[];
  flashcards?: { front: string; back: string }[];
  scenarioConfig?: ScenarioConfig;
  simulationConfig?: SimulationConfig;
}

export interface GeneratedCourse {
  title: string;
  description: string;
  blocks: GeneratedBlock[];
}

export type PathType = "learning" | "assessment" | "combined";
export type CourseDuration = "court" | "moyen" | "long";

const DURATION_CONFIG: Record<CourseDuration, { min: number; max: number; label: string }> = {
  court: { min: 3, max: 5, label: "court (15 min)" },
  moyen: { min: 5, max: 8, label: "moyen (30 min)" },
  long: { min: 8, max: 12, label: "long (45-60 min)" },
};

const ALL_BLOCK_TYPES = ["text", "quiz", "flashcard", "scenario", "simulation"] as const;

async function extractTextFromPDF(filePath: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse") as any;
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

async function extractTextFromDocx(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function buildBlockTypeInstructions(blockTypes: string[]): string {
  const instructions: string[] = [];

  if (blockTypes.includes("text")) {
    instructions.push(`- Blocs "text" : reformule le contenu de maniere TRES detaillee et pedagogique. Chaque bloc texte doit faire au minimum 400 mots. Inclus : une introduction claire, des explications approfondies, des exemples concrets et realistes, des analogies, des listes a puces, des encadres "A retenir", des mises en garde "Attention". Structure avec des sous-titres en gras. Le champ "content" contient le texte complet.`);
  }
  if (blockTypes.includes("quiz")) {
    instructions.push(`- Blocs "quiz" : genere 5 a 8 questions QCM a 4 options. Une seule bonne reponse par question. Varie les types : definitions, mises en situation professionnelle, analyse de cas, vrai/faux reformule en QCM, questions de reflexion. Les questions doivent etre substantielles et pousser a la reflexion, pas juste de la memorisation.`);
  }
  if (blockTypes.includes("flashcard")) {
    instructions.push(`- Blocs "flashcard" : genere 6 a 10 cartes recto/verso avec les concepts cles. Le recto pose une question ou donne un concept, le verso donne une explication detaillee (pas juste un mot). Utilise des formulations variees : definitions, exemples, cas pratiques, comparaisons.`);
  }
  if (blockTypes.includes("scenario")) {
    instructions.push(`- Blocs "scenario" : cree un scenario a embranchements IMMERSIF avec 4 a 6 noeuds. Chaque noeud presente une situation detaillee et realiste (3-5 phrases minimum par situation) et 2-3 choix avec feedback explicatif (2-3 phrases par feedback). Les choix menent a d'autres noeuds ou terminent le scenario (nextNodeId: null). Le meilleur choix donne le plus de points. Les situations doivent etre des mises en situation professionnelles credibles.
    Format scenarioConfig : { "startNodeId": "node1", "nodes": [{ "id": "node1", "situation": "Description...", "choices": [{ "id": "c1", "text": "Option A", "feedback": "Explication...", "points": 10, "nextNodeId": "node2" }, { "id": "c2", "text": "Option B", "feedback": "Explication...", "points": 5, "nextNodeId": "node2" }] }] }`);
  }
  if (blockTypes.includes("simulation")) {
    instructions.push(`- Blocs "simulation" : cree un exercice pratique interactif et substantiel. Choisis parmi les sous-types :
    * "ordering" : 5 a 8 items a remettre dans le bon ordre. Les instructions doivent etre detaillees. Format: { "subType": "ordering", "instructions": "...", "orderingItems": ["item correct 1", "item correct 2", ...], "maxScore": 100, "passingScore": 60, "allowRetry": true }
    * "matching" : 5 a 8 paires a associer. Format: { "subType": "matching", "instructions": "...", "matchingPairs": [{ "left": "Concept", "right": "Definition" }], "maxScore": 100, "passingScore": 60, "allowRetry": true }
    * "fill_blank" : texte a trous avec au moins 4 blancs. Ajoute des leurres dans la banque de mots. Format: { "subType": "fill_blank", "instructions": "...", "fillBlankText": "Le {blank1} est un {blank2}.", "fillBlankAnswers": { "blank1": "mot1", "blank2": "mot2" }, "wordBank": ["mot1", "mot2", "leurre1", "leurre2"], "maxScore": 100, "passingScore": 60, "allowRetry": true }`);
  }

  return instructions.join("\n");
}

function buildJsonFormat(blockTypes: string[], moduleTitle?: string): string {
  const titlePlaceholder = moduleTitle || "Titre du module deduit du contenu";
  const blocks: string[] = [];

  if (blockTypes.includes("text")) {
    blocks.push(`    {
      "type": "text",
      "title": "Titre du bloc",
      "content": "Contenu pedagogique reformule..."
    }`);
  }
  if (blockTypes.includes("quiz")) {
    blocks.push(`    {
      "type": "quiz",
      "title": "Quiz — Verification des connaissances",
      "quizQuestions": [
        { "question": "La question ?", "options": ["A", "B", "C", "D"], "correctAnswer": 0 }
      ]
    }`);
  }
  if (blockTypes.includes("flashcard")) {
    blocks.push(`    {
      "type": "flashcard",
      "title": "Flashcards — Points cles",
      "flashcards": [{ "front": "Concept", "back": "Definition" }]
    }`);
  }
  if (blockTypes.includes("scenario")) {
    blocks.push(`    {
      "type": "scenario",
      "title": "Scenario — Mise en situation",
      "scenarioConfig": {
        "startNodeId": "node1",
        "nodes": [
          { "id": "node1", "situation": "Description de la situation...", "choices": [
            { "id": "c1a", "text": "Choix A", "feedback": "Feedback A", "points": 10, "nextNodeId": "node2" },
            { "id": "c1b", "text": "Choix B", "feedback": "Feedback B", "points": 5, "nextNodeId": "node2" }
          ]},
          { "id": "node2", "situation": "Suite...", "choices": [
            { "id": "c2a", "text": "Choix A", "feedback": "Feedback A", "points": 10, "nextNodeId": null },
            { "id": "c2b", "text": "Choix B", "feedback": "Feedback B", "points": 3, "nextNodeId": null }
          ]}
        ]
      }
    }`);
  }
  if (blockTypes.includes("simulation")) {
    blocks.push(`    {
      "type": "simulation",
      "title": "Exercice pratique",
      "simulationConfig": {
        "subType": "ordering",
        "instructions": "Remettez les etapes dans le bon ordre",
        "orderingItems": ["Etape 1", "Etape 2", "Etape 3"],
        "maxScore": 100, "passingScore": 60, "allowRetry": true
      }
    }`);
  }

  return `Reponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) au format :
{
  "title": "${titlePlaceholder}",
  "description": "Description courte du parcours (1-2 phrases)",
  "blocks": [
${blocks.join(",\n")}
  ]
}`;
}

function buildPrompt(
  truncatedText: string,
  moduleTitle?: string,
  pathType: PathType = "combined",
  duration: CourseDuration = "moyen",
  blockTypes?: string[]
): string {
  const durationConf = DURATION_CONFIG[duration];
  const effectiveTypes = blockTypes && blockTypes.length > 0 ? blockTypes : getDefaultBlockTypes(pathType);

  const typesList = effectiveTypes.map(t => `"${t}"`).join(", ");
  const blockInstructions = buildBlockTypeInstructions(effectiveTypes);
  const jsonFormat = buildJsonFormat(effectiveTypes, moduleTitle);

  const hasScenario = effectiveTypes.includes("scenario");
  const hasSimulation = effectiveTypes.includes("simulation");
  const advancedNote = (hasScenario || hasSimulation)
    ? `\n\nATTENTION SPECIALE pour les blocs avances :
${hasScenario ? "- Les scenarios doivent avoir au minimum 3 noeuds et maximum 5 noeuds, avec des choix realistes lies au contenu du cours. Les points vont de 0 (mauvais choix) a 10 (choix optimal)." : ""}
${hasSimulation ? "- Les simulations doivent etre directement liees au contenu du cours. Varie les sous-types (ordering, matching, fill_blank) si tu en generes plusieurs." : ""}`
    : "";

  return `Tu es un expert en ingenierie pedagogique. A partir du contenu de cours suivant, cree un parcours e-learning structure et interactif.

CONTENU DU COURS :
---
${truncatedText}
---

DUREE CIBLE : Parcours ${durationConf.label}. Genere entre ${durationConf.min} et ${durationConf.max} blocs.

TYPES DE BLOCS A UTILISER : ${typesList}
Tu dois UNIQUEMENT utiliser ces types de blocs, pas d'autres.

INSTRUCTIONS PAR TYPE DE BLOC :
${blockInstructions}

STRUCTURE DU PARCOURS :
1. Commence toujours par un bloc "text" d'introduction (si "text" est dans les types autorises)
2. Alterne les types de blocs pour maintenir l'engagement de l'apprenant
3. Termine par un bloc d'evaluation ou de synthese (quiz, scenario, ou texte recapitulatif)
4. Repartis les types de blocs de maniere equilibree sur tout le parcours
${advancedNote}

${jsonFormat}

REGLES :
- Minimum ${durationConf.min} blocs, maximum ${durationConf.max} blocs
- Types autorises : ${typesList} UNIQUEMENT
- Les quiz doivent avoir exactement 4 options par question
- correctAnswer est l'index (0-3) de la bonne reponse
- Le contenu doit etre en francais
- Reponds UNIQUEMENT avec le JSON, sans texte avant ou apres`;
}

function getDefaultBlockTypes(pathType: PathType): string[] {
  switch (pathType) {
    case "learning": return ["text", "flashcard"];
    case "assessment": return ["text", "quiz"];
    case "combined": return ["text", "quiz", "flashcard"];
  }
}

export interface GenerateOptions {
  filePath: string;
  moduleTitle?: string;
  pathType?: PathType;
  duration?: CourseDuration;
  blockTypes?: string[];
}

export async function generateCourseFromDocument(
  filePath: string,
  moduleTitle?: string,
  pathType: PathType = "combined",
  duration: CourseDuration = "moyen",
  blockTypes?: string[]
): Promise<GeneratedCourse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configuree. Ajoutez-la dans votre fichier .env");
  }

  // 1. Detect file type and extract text
  const ext = path.extname(filePath).toLowerCase();
  let text: string;

  if (ext === ".pdf") {
    text = await extractTextFromPDF(filePath);
  } else if (ext === ".docx" || ext === ".doc") {
    text = await extractTextFromDocx(filePath);
  } else {
    throw new Error(`Format de fichier non supporte: ${ext}. Utilisez PDF ou Word (.docx)`);
  }

  if (!text || text.trim().length < 50) {
    throw new Error("Le document ne contient pas assez de texte exploitable.");
  }

  // Truncate to ~15000 chars to stay within token limits
  const truncatedText = text.slice(0, 15000);

  // 2. Send to OpenAI
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });

  const effectiveTypes = blockTypes && blockTypes.length > 0 ? blockTypes : undefined;
  const prompt = buildPrompt(truncatedText, moduleTitle, pathType, duration, effectiveTypes);

  // Use higher max_tokens for richer content
  const hasAdvancedTypes = effectiveTypes?.some(t => t === "scenario" || t === "simulation");
  const maxTokens = duration === "long" || hasAdvancedTypes ? 12000 : 8192;

  let responseText: string;
  try {
    console.log(`[AI Generate] Calling OpenAI GPT-4o-mini (pathType=${pathType}, duration=${duration}, blockTypes=${effectiveTypes?.join(",") || "default"})...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    });
    responseText = (completion.choices[0]?.message?.content || "").trim();
    console.log("[AI Generate] OpenAI response length:", responseText.length);
  } catch (err: any) {
    console.error("[AI Generate] OpenAI API error:", err?.message || err);
    throw new Error(`Erreur API OpenAI: ${err?.message || "Verifiez votre cle OPENAI_API_KEY"}`);
  }

  // Parse response
  let jsonText = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonText) as GeneratedCourse;

    // Validate structure
    if (!parsed.title || !parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      throw new Error("Structure de reponse invalide");
    }

    const allowed = effectiveTypes || getDefaultBlockTypes(pathType);

    // Sanitize and validate each block
    parsed.blocks = parsed.blocks.map((block, idx) => {
      if (!ALL_BLOCK_TYPES.includes(block.type as any)) {
        block.type = "text";
      }
      // Convert disallowed block types to "text"
      if (!allowed.includes(block.type)) {
        block.type = "text";
      }
      if (!block.title) {
        block.title = `Bloc ${idx + 1}`;
      }
      if (block.type === "quiz" && block.quizQuestions) {
        block.quizQuestions = block.quizQuestions.map((q) => ({
          question: q.question || "Question",
          options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A", "B", "C", "D"],
          correctAnswer: typeof q.correctAnswer === "number" ? Math.min(q.correctAnswer, 3) : 0,
        }));
      }
      if (block.type === "flashcard" && block.flashcards) {
        block.flashcards = block.flashcards.map((f) => ({
          front: f.front || "",
          back: f.back || "",
        }));
      }
      if (block.type === "scenario" && block.scenarioConfig) {
        // Validate scenario structure
        const sc = block.scenarioConfig;
        if (!sc.startNodeId || !sc.nodes || !Array.isArray(sc.nodes) || sc.nodes.length === 0) {
          block.type = "text";
          block.content = block.title;
          delete block.scenarioConfig;
        } else {
          // Ensure all nodes have required fields
          sc.nodes = sc.nodes.map((node, nIdx) => ({
            id: node.id || `node${nIdx + 1}`,
            situation: node.situation || "Situation...",
            choices: Array.isArray(node.choices) ? node.choices.map((c, cIdx) => ({
              id: c.id || `c${nIdx + 1}${String.fromCharCode(97 + cIdx)}`,
              text: c.text || "Choix",
              feedback: c.feedback || "",
              points: typeof c.points === "number" ? c.points : 0,
              nextNodeId: c.nextNodeId !== undefined ? c.nextNodeId : null,
            })) : [],
          }));
        }
      }
      if (block.type === "simulation" && block.simulationConfig) {
        const sim = block.simulationConfig;
        if (!sim.subType || !["ordering", "matching", "fill_blank"].includes(sim.subType)) {
          block.type = "text";
          block.content = block.title;
          delete block.simulationConfig;
        } else {
          sim.maxScore = sim.maxScore || 100;
          sim.passingScore = sim.passingScore || 60;
          sim.allowRetry = sim.allowRetry !== false;
          sim.showHintsAfterFail = sim.showHintsAfterFail !== false;
        }
      }
      return block;
    });

    if (moduleTitle) {
      parsed.title = moduleTitle;
    }

    return parsed;
  } catch (parseErr) {
    console.error("[AI Generate] Parse error. Raw response:", responseText.slice(0, 500));
    throw new Error(`Impossible de parser la reponse de l'IA. Reessayez.`);
  }
}
