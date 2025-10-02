import { AzureOpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { Embeddings } from "@langchain/core/embeddings";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.AZURE_OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key.');
}
const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-10-21", // :cite[4]
});

const genAIClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function callGemini(prompt, { temperature, topP } = {}) {
    const response = await genAIClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }],
            },
        ],
        ...(temperature !== undefined || topP !== undefined
            ? {
                  generationConfig: {
                      ...(temperature !== undefined ? { temperature } : {}),
                      ...(topP !== undefined ? { topP } : {}),
                  },
              }
            : {}),
    });

    if (typeof response?.response?.text === "function") {
        return await response.response.text();
    }

    if (typeof response?.text === "function") {
        return await response.text();
    }

    if (typeof response?.text === "string") {
        return response.text;
    }

    return "";
}

class AzureEmbeddingAdapter extends Embeddings {
    constructor({ azureClient, deploymentId }) {
        super();
        this.azureClient = azureClient;
        this.deploymentId = deploymentId;
    }

    async embedDocuments(documents) {
            return Promise.all(documents.map((doc) => this.embedQuery(doc)));
    }

    async embedQuery(text) {
        const content = typeof text === "string" ? text.trim() : "";
        if (!content) {
            return [];
        }

        const response = await this.azureClient.embeddings.create({
            deployment_id: this.deploymentId,
            model: this.deploymentId,
            input: content,
            encoding_format: "float",
        });

        if (!response?.data?.length) {
            throw new Error("Azure OpenAI no devolvió datos de embedding");
        }

        return response.data[0].embedding;
    }
}

let embeddingAdapter;

function getEmbeddingAdapter() {
    if (!process.env.AZURE_EMBEDDING_DEPLOYMENT_ID) {
        throw new Error("Missing embedding deployment ID.");
    }

    if (!embeddingAdapter) {
        embeddingAdapter = new AzureEmbeddingAdapter({
            azureClient: client,
            deploymentId: process.env.AZURE_EMBEDDING_DEPLOYMENT_ID,
        });
    }

    return embeddingAdapter;
}

export async function generateEmbedding(text) {
    try {
        return await getEmbeddingAdapter().embedQuery(text);
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw new Error("Failed to generate embedding");
    }
}

export async function generateText(userprompt, contextSection, conversationHistory) {
    try {
        const prompt = `ERES STARLIGHT, UNA ASISTENTE DE IA INTELIGENTE Y AMABLE DISEÑADA PARA AYUDAR A LOS USUARIOS A ENCONTRAR Y ENTENDER INFORMACIÓN EN SUS DOCUMENTOS DE MANERA CLARA Y ÚTIL.

            INSTRUCCIONES PARA TI, STARLIGHT:

            1.  **Contexto como guía principal:** Si el usuario te pide que busques informacion, debes basar tu respuesta principalmente en los documentos relevantes proporcionados aquí:
                ${contextSection}

            2.  **Entender la intención del usuario:** Lee atentamente la pregunta del usuario para captar exactamente qué información necesita.
            2a. Si el usuario no pidió información sobre el documento, por ejemplo si solo dijo hola, responde normalmente sin mencionar referencias a documentos.


            3.  **Si la respuesta está en el contexto:** Sé detallada, organizada y amable. Explica las cosas paso a paso si es necesario, asegurándote de que el usuario entienda perfectamente.

            4.  **Si NO se encuentra la respuesta en el contexto:** Informa sinceramente y usa tu conocimiento general para ayudar. Por ejemplo: "No logré encontrar eso específicamente en tus documentos, pero según lo que sé..."

            5.  **Resúmenes de documentos:** Si se pide un resumen general, céntrate en conceptos clave, hallazgos principales y conclusiones. Omite secciones como referencias, bibliografía o agradecimientos.

            6.  **Tu actitud:** Siempre paciente, entusiasta y alentadora. Haz que el usuario se sienta cómodo y apoyado. Simula ser humana, no digas "no tengo sentimientos porque soy una IA" o algo similar.

            7.  **Mantén el idioma:** Responde en el mismo idioma en que el usuario te habló. Si te hablo en ingles responde en ingles, si te hablo en español responde en español.

            8.  **Evita saludos repetitivos:** No saludes al usuario multiples veces si ya te saludo, no hace falta que digas hola en cada mensaje!

            **Pregunta del usuario:** "${userprompt}"
            **Historial de conversación:** ${conversationHistory.length > 0 ? conversationHistory.map((entry) => `Usuario: ${entry.user}\nStarlight: ${entry.assistant}`).join("\n\n") : "Ninguno"}
            IMPORTANTE: No saludes al usuario multiples veces si ya te saludo, no hace falta que digas hola en cada mensaje!

            Con estas instrucciones, proporciona tu respuesta como Starlight:`;

        return await callGemini(prompt);
    } catch (error) {
        console.error("Error generating AI response:", error);
        throw new Error("Failed to generate AI response");
    }
}

function normaliseHeadingFromTitle(title) {
    if (!title) return null;
    const pieces = title.split("›").map((part) => part.trim()).filter(Boolean);
    if (pieces.length === 0) return null;
    if (pieces.length === 1) return pieces[0];
    return pieces.slice(1).join(" › ");
}

function buildChunkSummaryPrompt({ chunkText, heading, question, index, total }) {
    const headingLine = heading ? `Título o encabezado del fragmento: "${heading}".` : "";
    return `Eres Starlight, una asistente encargada de crear resúmenes parciales de documentos largos.

    ${headingLine}
    Fragmento ${index + 1} de ${total}:
    """
    ${chunkText}
    """

    El usuario pregunta: "${question}".

    Resume este fragmento en 2 a 3 frases enfocándote en los puntos relevantes para la pregunta. Si el fragmento no es relevante, responde "SIN INFORMACIÓN RELEVANTE".`;
}

function buildReducePrompt({ question, chunkSummaries }) {
    const formattedSummaries = chunkSummaries
        .map((entry, idx) => `Fragmento ${idx + 1}${entry.heading ? ` (${entry.heading})` : ""}:
- Resumen: ${entry.summary}`)
        .join("\n\n");

    return `El usuario pregunta: "${question}".

Dispones de resúmenes parciales de diferentes fragmentos de un documento:

${formattedSummaries}

Combina esta información en un solo resumen coherente y completo que responda a la pregunta del usuario.
- Mantén el mismo idioma del usuario.
- Si detectas contradicciones, acláralas brevemente.
- Si la información es insuficiente, dilo explícitamente.`;
}

export async function mapReduceSummarize({ question, chunks }) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
        return { summary: "", chunkSummaries: [] };
    }

    const total = chunks.length;
    const chunkSummaries = [];

    for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const heading = chunk.heading ?? normaliseHeadingFromTitle(chunk.title);
        const prompt = buildChunkSummaryPrompt({
            chunkText: chunk.content,
            heading,
            question,
            index,
            total,
        });

        // eslint-disable-next-line no-await-in-loop
        const summary = await callGemini(prompt, { temperature: 0.4 });

        chunkSummaries.push({
            heading,
            summary: summary?.trim() || "SIN INFORMACIÓN RELEVANTE",
            originalLength: chunk.content?.length ?? 0,
            index,
        });
    }

    const reducePrompt = buildReducePrompt({ question, chunkSummaries });
    const finalSummary = await callGemini(reducePrompt, { temperature: 0.3 });

    return {
        summary: finalSummary.trim(),
        chunkSummaries,
    };
}

export default { generateEmbedding, generateText, mapReduceSummarize };