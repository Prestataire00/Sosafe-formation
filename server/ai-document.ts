import fs from "fs";
import path from "path";
import { storage } from "./storage";

interface AIAnalysisResult {
  extractedDate: string | null;
  confidence: "high" | "medium" | "low" | null;
  documentType: string | null;
  isRelevantDocument: boolean;
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
      isRelevantDocument: false,
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
      isRelevantDocument: false,
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
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyse ce document et détermine s'il s'agit d'un justificatif de formation légitime (attestation de formation, certificat, diplôme, titre professionnel, etc.).

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks) :
{
  "documentType": "type du document (ex: attestation AFGSU, certificat, diplôme, CV, lettre, facture, etc.)",
  "isRelevantDocument": true/false,
  "extractedDate": "date du document au format YYYY-MM-DD (date d'obtention ou de délivrance). Si plusieurs dates, prends la date d'obtention ou de fin de formation. Si aucune date trouvée, mets null.",
  "confidence": "high si la date est clairement lisible, medium si partiellement lisible, low si incertaine",
  "reasoning": "explication courte"
}

Règles CRITIQUES pour isRelevantDocument :
- true UNIQUEMENT si le document est : un diplôme, une attestation de formation, un certificat, un titre professionnel, une attestation de réussite, un relevé de notes
- false si le document est : un CV, une lettre de motivation, une facture, un devis, une carte d'identité, un bulletin de salaire, un contrat, ou tout document qui n'est PAS un justificatif de formation/diplôme
- En cas de doute, mets false

Important :
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après
- Si isRelevantDocument est false, mets extractedDate à null et confidence à "low"
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
        isRelevantDocument: parsed.isRelevantDocument === true,
        rawResponse: responseText,
      };
    } catch {
      return {
        extractedDate: null,
        confidence: null,
        documentType: null,
        isRelevantDocument: false,
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
      isRelevantDocument: false,
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

    // Reject non-relevant documents (CV, letters, invoices, etc.)
    if (!result.isRelevantDocument) {
      await storage.updateUserDocument(documentId, {
        aiStatus: "completed",
        status: "auto_invalid",
        aiExtractedDate: result.extractedDate,
        aiConfidence: result.confidence,
        aiRawResponse: result.rawResponse,
        aiAnalyzedAt: new Date(),
        aiError: `Document non conforme : ${result.documentType || "type non reconnu"}. Un diplôme, attestation ou certificat de formation est requis.`,
      });
      return;
    }

    if (result.extractedDate && sessionId) {
      try {
        // Get the session to find its program
        const session = await storage.getSession(sessionId);
        if (session) {
          const program = await storage.getProgram(session.programId);
          const prerequisites = await storage.getProgramPrerequisites(session.programId);

          if (prerequisites.length > 0) {
            const extractedDate = new Date(result.extractedDate);
            const now = new Date();

            // Check if any prerequisite has a maxMonthsSinceCompletion constraint (document must be recent)
            const hasMaxConstraint = prerequisites.some(p => p.maxMonthsSinceCompletion);
            // Check if any prerequisite has a minMonthsSinceCompletion constraint (diploma must be old enough)
            const hasMinConstraint = prerequisites.some(p => p.minMonthsSinceCompletion);

            if (hasMaxConstraint) {
              const maxMonths = Math.min(
                ...prerequisites
                  .filter(p => p.maxMonthsSinceCompletion)
                  .map(p => p.maxMonthsSinceCompletion!)
              );

              // Month-to-month: add maxMonths to the extracted date
              const expirationDate = new Date(extractedDate);
              expirationDate.setMonth(expirationDate.getMonth() + maxMonths);

              validationStatus = expirationDate > now ? "auto_valid" : "auto_invalid";
            } else if (hasMinConstraint) {
              // Diploma must have been obtained at least X months ago (month-to-month)
              const minMonths = Math.max(
                ...prerequisites
                  .filter(p => p.minMonthsSinceCompletion)
                  .map(p => p.minMonthsSinceCompletion!)
              );

              // Month-to-month: add minMonths to extracted date, compare to now
              const minDate = new Date(extractedDate);
              minDate.setMonth(minDate.getMonth() + minMonths);

              validationStatus = now >= minDate ? "auto_valid" : "auto_invalid";
            } else {
              // No time constraint, just having a date is enough
              validationStatus = "auto_valid";
            }
          } else if (program && program.recyclingMonths) {
            // No prerequisites but program has a recycling period — validate against it
            const extractedDate = new Date(result.extractedDate);
            const now = new Date();
            const expiryDate = new Date(extractedDate);
            expiryDate.setMonth(expiryDate.getMonth() + program.recyclingMonths);

            validationStatus = expiryDate > now ? "auto_valid" : "auto_invalid";
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

    // Auto-create TraineeCertification if validated (Issue 4)
    if (validationStatus === "auto_valid" && result.extractedDate && sessionId) {
      try {
        const sessionForCert = await storage.getSession(sessionId);
        const programForCert = sessionForCert ? await storage.getProgram(sessionForCert.programId) : null;
        if (programForCert) {
          // Check for existing identical certification
          const existingCerts = await storage.getTraineeCertifications(traineeId);
          const alreadyExists = existingCerts.some(c =>
            c.programId === programForCert.id && c.obtainedAt === result.extractedDate
          );

          if (!alreadyExists) {
            let expiresAt: string | null = null;
            if (programForCert.recyclingMonths) {
              const expDate = new Date(result.extractedDate);
              expDate.setMonth(expDate.getMonth() + programForCert.recyclingMonths);
              expiresAt = expDate.toISOString().split("T")[0];
            }

            await storage.createTraineeCertification({
              traineeId,
              programId: programForCert.id,
              type: result.documentType || "diplome",
              label: `${result.documentType || "diplome"} - ${programForCert.title}`,
              obtainedAt: result.extractedDate,
              expiresAt,
              status: "valid",
              documentUrl: doc.fileUrl,
            });
          }
        }
      } catch (certErr) {
        console.error(`Auto-certification creation failed for document ${documentId}:`, certErr);
      }
    }
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
