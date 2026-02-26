import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

interface AIAnalysisResult {
  extractedDate: string | null;
  confidence: "high" | "medium" | "low" | null;
  documentType: string | null;
  rawResponse: string;
  error?: string;
}

/**
 * Analyze a document using Google Gemini Vision to extract dates and document type.
 */
export async function analyzeDocument(fileUrl: string): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      extractedDate: null,
      confidence: null,
      documentType: null,
      rawResponse: "",
      error: "GEMINI_API_KEY non configurée",
    };
  }

  // Read the file from uploads directory
  const filePath = path.resolve(process.cwd(), fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl);
  if (!fs.existsSync(filePath)) {
    return {
      extractedDate: null,
      confidence: null,
      documentType: null,
      rawResponse: "",
      error: `Fichier non trouvé: ${fileUrl}`,
    };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  // Determine MIME type from extension
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  const mimeType = mimeMap[ext] || "application/octet-stream";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyse ce document justificatif (attestation de formation, certificat, diplôme, etc.).

Extrais les informations suivantes et réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) :
{
  "documentType": "type du document (ex: attestation AFGSU, certificat, diplôme, etc.)",
  "extractedDate": "date du document au format YYYY-MM-DD (date d'obtention ou de délivrance). Si plusieurs dates, prends la date d'obtention ou de fin de formation. Si aucune date trouvée, mets null.",
  "confidence": "high si la date est clairement lisible, medium si partiellement lisible, low si incertaine",
  "reasoning": "explication courte de comment tu as identifié la date"
}

Important :
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après
- Si tu ne peux pas lire le document ou trouver de date, mets extractedDate à null et confidence à "low"
- Le format de date DOIT être YYYY-MM-DD`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Try to parse JSON from the response, handling potential markdown wrapping
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonText);
      return {
        extractedDate: parsed.extractedDate || null,
        confidence: parsed.confidence || null,
        documentType: parsed.documentType || null,
        rawResponse: responseText,
      };
    } catch {
      return {
        extractedDate: null,
        confidence: null,
        documentType: null,
        rawResponse: responseText,
        error: "Impossible de parser la réponse IA",
      };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
    return {
      extractedDate: null,
      confidence: null,
      documentType: null,
      rawResponse: "",
      error: `Erreur Gemini: ${errorMessage}`,
    };
  }
}

/**
 * Process document validation: run AI analysis and compare with prerequisites.
 */
export async function processDocumentValidation(
  documentId: string,
  traineeId: string,
  sessionId?: string
): Promise<void> {
  try {
    // Mark as processing
    await storage.updateUserDocument(documentId, {
      aiStatus: "processing",
      status: "analyzing",
    });

    const doc = await storage.getUserDocument(documentId);
    if (!doc || !doc.fileUrl) {
      await storage.updateUserDocument(documentId, {
        aiStatus: "failed",
        status: "pending",
        aiError: "Document ou URL de fichier manquant",
      });
      return;
    }

    // Run AI analysis
    const result = await analyzeDocument(doc.fileUrl);

    if (result.error) {
      await storage.updateUserDocument(documentId, {
        aiStatus: "failed",
        status: "pending",
        aiError: result.error,
        aiRawResponse: result.rawResponse || null,
        aiAnalyzedAt: new Date(),
      });
      return;
    }

    // Determine validation status based on extracted date and prerequisites
    let validationStatus: string = "pending";

    if (result.extractedDate && sessionId) {
      try {
        // Get the session to find its program
        const session = await storage.getSession(sessionId);
        if (session) {
          const prerequisites = await storage.getProgramPrerequisites(session.programId);

          if (prerequisites.length > 0) {
            const extractedDate = new Date(result.extractedDate);
            const now = new Date();

            // Check if any prerequisite has a maxMonthsSinceCompletion constraint
            const hasTimeConstraint = prerequisites.some(p => p.maxMonthsSinceCompletion);

            if (hasTimeConstraint) {
              // Check against the most restrictive time constraint
              const maxMonths = Math.min(
                ...prerequisites
                  .filter(p => p.maxMonthsSinceCompletion)
                  .map(p => p.maxMonthsSinceCompletion!)
              );

              const expirationDate = new Date(extractedDate);
              expirationDate.setMonth(expirationDate.getMonth() + maxMonths);

              validationStatus = expirationDate > now ? "auto_valid" : "auto_invalid";
            } else {
              // No time constraint, just having a date is enough
              validationStatus = "auto_valid";
            }
          } else {
            // No prerequisites defined, date extracted successfully
            validationStatus = result.extractedDate ? "auto_valid" : "pending";
          }
        }
      } catch {
        // If prerequisite check fails, leave as pending
        validationStatus = "pending";
      }
    } else if (result.extractedDate) {
      // Date extracted but no session to validate against
      validationStatus = "auto_valid";
    }

    // Update document with AI results
    await storage.updateUserDocument(documentId, {
      aiStatus: "completed",
      status: validationStatus,
      aiExtractedDate: result.extractedDate,
      aiConfidence: result.confidence,
      aiRawResponse: result.rawResponse,
      aiAnalyzedAt: new Date(),
      aiError: null,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
    await storage.updateUserDocument(documentId, {
      aiStatus: "failed",
      status: "pending",
      aiError: errorMessage,
      aiAnalyzedAt: new Date(),
    });
  }
}
