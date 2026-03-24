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
export type CourseDuration = "court" | "moyen" | "long" | "custom";

const DURATION_CONFIG: Record<string, { min: number; max: number; label: string }> = {
  court: { min: 3, max: 5, label: "court (15 min)" },
  moyen: { min: 8, max: 12, label: "moyen (45-60 min)" },
  long: { min: 12, max: 18, label: "long (1h30-2h)" },
};

function getDurationConfig(duration: string, durationMinutes?: number): { min: number; max: number; label: string } {
  if (durationMinutes && durationMinutes > 0) {
    // ~1 block per 7 minutes, with min 2 and max 25
    const targetBlocks = Math.round(durationMinutes / 7);
    const min = Math.max(2, targetBlocks - 1);
    const max = Math.max(min + 1, targetBlocks + 1);
    return { min, max, label: `${durationMinutes} minutes (${min}-${max} blocs)` };
  }
  return DURATION_CONFIG[duration] || DURATION_CONFIG.moyen;
}

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
    instructions.push(`- Blocs "text" : reprends le contenu du document source de maniere TRES detaillee et pedagogique, SANS le resumer ni le synthetiser. Chaque bloc texte doit faire au MINIMUM 800 mots (1500+ mots pour l'introduction et les blocs principaux). Ecris UNIQUEMENT des phrases et des paragraphes en texte brut. Pas de balises HTML, pas de caracteres speciaux de formatage. AERE bien le texte : fais des paragraphes courts de 3 a 5 phrases maximum, puis saute une ligne avant le paragraphe suivant. Chaque nouveau concept ou idee doit commencer un nouveau paragraphe. Inclus : une introduction claire et substantielle, des explications approfondies avec contexte historique ou reglementaire quand pertinent, des exemples concrets et realistes issus du terrain, des analogies parlantes, des cas pratiques illustratifs. Ecris de maniere fluide et naturelle, comme un cours magistral transcrit. Le champ "content" contient le texte complet en phrases. NE PAS faire de contenu superficiel ou trop court. ECRIS BEAUCOUP, ne te limite pas.`);
  }
  if (blockTypes.includes("quiz")) {
    instructions.push(`- Blocs "quiz" : genere 8 a 12 questions QCM a 4 options. Une seule bonne reponse par question. Varie les types : definitions, mises en situation professionnelle, analyse de cas, vrai/faux reformule en QCM, questions de reflexion, application pratique. Les questions doivent etre substantielles et pousser a la reflexion, pas juste de la memorisation. Chaque question doit avoir un contexte ou une mise en situation.`);
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
  blockTypes?: string[],
  durationMinutes?: number
): string {
  const durationConf = getDurationConfig(duration, durationMinutes);
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

IMPORTANT — MISE EN FORME :
- Ecris UNIQUEMENT du texte brut : des phrases et des paragraphes. Rien d'autre.
- N'utilise JAMAIS de caracteres speciaux de formatage : pas de * (asterisque), pas de # (diese), pas de balises HTML (<strong>, <em>, <h3>, <br/>, etc.), pas de markdown
- Separe les paragraphes par un simple saut de ligne (\\n\\n)
- Fais des paragraphes COURTS et AERES : 3 a 5 phrases par paragraphe, puis une ligne vide. Le texte doit etre agreable a lire, pas un mur de texte compact
- Pas de listes a puces, pas de tirets en debut de ligne, pas de numerotation. Ecris tout sous forme de phrases completes dans des paragraphes fluides
- Le texte doit se lire comme un cours magistral : naturel, detaille, pedagogique, agreable

IMPORTANT — NIVEAU DE DETAIL (TRES LONG) :
- NE RESUME PAS et NE SYNTHETISE PAS le document source. Tu dois REPRENDRE et DEVELOPPER le contenu en detail, en ECRIVANT BEAUCOUP
- Chaque bloc texte doit etre un veritable cours complet et tres long, pas un resume. Vise 800 a 1500 mots par bloc texte
- Reprends les explications, les definitions, les procedures, les exemples du document source DANS LEUR INTEGRALITE
- Ajoute du contexte, des explications supplementaires, des exemples concrets pour enrichir le contenu. Developpe chaque notion sur plusieurs paragraphes
- L'introduction doit etre tres longue et detaillee (1500+ mots) : presenter le sujet en profondeur, le contexte historique et reglementaire, les enjeux, les objectifs d'apprentissage, le public concerne, les prerequis
- Les blocs suivants doivent traiter chaque partie du document en profondeur, sans sauter de contenu. Chaque concept merite plusieurs paragraphes d'explication

CONTENU DU COURS (a reprendre en detail, sans resumer) :
---
${truncatedText}
---

DUREE CIBLE : Parcours ${durationConf.label}. Genere entre ${durationConf.min} et ${durationConf.max} blocs.

TYPES DE BLOCS A UTILISER : ${typesList}
Tu dois UNIQUEMENT utiliser ces types de blocs, pas d'autres.

INSTRUCTIONS PAR TYPE DE BLOC :
${blockInstructions}

STRUCTURE DU PARCOURS :
1. Commence toujours par un bloc "text" d'introduction TRES LONG ET DETAILLE (si "text" est dans les types autorises). Ce bloc doit faire au minimum 1500 mots et couvrir en profondeur : presentation du sujet, contexte historique et reglementaire, enjeux professionnels, objectifs pedagogiques detailles, public vise, prerequis eventuels, plan du parcours. Developpe chaque point sur plusieurs paragraphes aeres
2. Alterne les types de blocs pour maintenir l'engagement de l'apprenant
3. Chaque bloc texte doit reprendre le contenu du document source en le developpant, pas en le resumant
4. Termine par un bloc d'evaluation ou de synthese (quiz, scenario, ou texte recapitulatif)
5. Repartis les types de blocs de maniere equilibree sur tout le parcours
${advancedNote}

${jsonFormat}

REGLES :
- Minimum ${durationConf.min} blocs, maximum ${durationConf.max} blocs
- Types autorises : ${typesList} UNIQUEMENT
- Les quiz doivent avoir exactement 4 options par question
- correctAnswer est l'index (0-3) de la bonne reponse
- Le contenu doit etre en francais
- JAMAIS de caracteres * ni # ni balises HTML dans le contenu — uniquement du texte brut en phrases et paragraphes
- Ne resume pas le document, reprends-le en detail et enrichis-le
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
  durationMinutes?: number;
  blockTypes?: string[];
}

export async function generateCourseFromDocument(
  filePath: string,
  moduleTitle?: string,
  pathType: PathType = "combined",
  duration: CourseDuration = "moyen",
  blockTypes?: string[],
  durationMinutes?: number
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

  // Use more source material for longer courses
  const effectiveMinutes = durationMinutes || (duration === "long" ? 120 : duration === "moyen" ? 60 : 15);
  const maxChars = effectiveMinutes >= 90 ? 40000 : effectiveMinutes >= 30 ? 30000 : 15000;
  const truncatedText = text.slice(0, maxChars);

  // 2. Send to OpenAI
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });

  const effectiveTypes = blockTypes && blockTypes.length > 0 ? blockTypes : undefined;
  const prompt = buildPrompt(truncatedText, moduleTitle, pathType, duration, effectiveTypes, durationMinutes);

  // Use gpt-4o for longer courses to get more detailed content
  const useFullModel = effectiveMinutes >= 30;
  const model = useFullModel ? "gpt-4o" : "gpt-4o-mini";
  const maxTokens = effectiveMinutes >= 90 ? 16000 : effectiveMinutes >= 30 ? 14000 : 8192;

  let responseText: string;
  try {
    console.log(`[AI Generate] Calling OpenAI ${model} (pathType=${pathType}, duration=${duration}, blockTypes=${effectiveTypes?.join(",") || "default"})...`);
    const completion = await openai.chat.completions.create({
      model,
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
