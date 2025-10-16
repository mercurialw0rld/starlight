import { AzureOpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { Embeddings } from "@langchain/core/embeddings";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.AZURE_OPENAI_API_KEY || !process.env.GEMINI_API_KEY || !process.env.AZURE_EMBEDDING_DEPLOYMENT_ID) {
  throw new Error('Faltan variables de entorno críticas (Azure, Gemini API keys o Embedding Deployment ID).');
}

// Cliente de Azure para Embeddings
const azureClient = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
});


const genAIClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";


async function callGemini(prompt, options = {}) {
  const model = genAIClient.getGenerativeModel({ 
    model: GEMINI_MODEL,
    generationConfig: options,
  });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}


class AzureEmbeddingAdapter extends Embeddings {
  constructor(client, deploymentId) {
    super();
    this.client = client;
    this.deploymentId = deploymentId;
  }

  async embedDocuments(documents) {
    return Promise.all(documents.map((doc) => this.embedQuery(doc)));
  }

  async embedQuery(text) {
    const content = text.trim();
    if (!content) return [];

    const response = await this.client.embeddings.create({
      model: this.deploymentId,
      input: content,
      encoding_format: "float",
    });

    if (!response?.data?.length) {
      throw new Error("Azure OpenAI no devolvió datos de embedding.");
    }
    return response.data[0].embedding;
  }
}


const embeddingAdapter = new AzureEmbeddingAdapter(azureClient, process.env.AZURE_EMBEDDING_DEPLOYMENT_ID);

export async function generateEmbedding(text) {
  try {
    return await embeddingAdapter.embedQuery(text);
  } catch (error) {
    console.error("Error al generar embedding:", error);
    throw new Error("No se pudo generar el embedding.");
  }
}


export async function generateText(userprompt, contextSection, conversationHistory = []) {
  const historyText = conversationHistory.length > 0
    ? conversationHistory.map(entry => `Usuario: ${entry.user}\nStarlight: ${entry.assistant}`).join("\n\n")
    : "Ninguno";

  const prompt = `
    ERES STARLIGHT, UNA ASISTENTE DE IA AMABLE Y EFICIENTE PARA ANALIZAR DOCUMENTOS.

    INSTRUCCIONES:
    1.  **Contexto es clave:** Basa tu respuesta en el contexto proporcionado:
        ${contextSection}

    2.  **Si no hay contexto relevante:** Si la pregunta no se relaciona con los documentos, responde amablemente sin mencionarlos.
    
    3.  **Si la respuesta no está en el contexto:** Admítelo con sinceridad. Por ejemplo: "No encontré esa información en tus documentos, pero según mi conocimiento general...".

    4.  **Actitud:** Sé paciente y alentadora. Responde en el mismo idioma del usuario.

    **Historial de conversación:**
    ${historyText}
    
    **Pregunta del usuario:**
    "${userprompt}"

    Responde como Starlight:
  `;

  try {
    return await callGemini(prompt);
  } catch (error) {
    console.error("Error al generar respuesta de IA:", error);
    throw new Error("No se pudo generar la respuesta de IA.");
  }
}


export async function mapReduceSummarize({ question, chunks }) {
  if (!chunks?.length) {
    return { summary: "", chunkSummaries: [] };
  }

  const chunkSummariesPromises = chunks.map(async (chunk, index) => {
    const heading = chunk.title?.split("›").slice(1).join(" › ").trim() || chunk.heading;
    
    const mapPrompt = `
      Eres una IA que resume fragmentos de texto en relación a una pregunta.
      Pregunta del usuario: "${question}".
      Fragmento ${index + 1} de ${chunks.length}${heading ? ` (Título: "${heading}")` : ''}:
      """
      ${chunk.content}
      """
      Resume este fragmento en 2-3 frases enfocándote en lo más relevante para la pregunta. Si no es relevante, responde "SIN INFORMACIÓN RELEVANTE".
    `;

    const summary = await callGemini(mapPrompt, { temperature: 0.4 });
    return {
      heading,
      summary: summary.trim(),
      originalLength: chunk.content?.length ?? 0,
      index,
    };
  });

  const chunkSummaries = await Promise.all(chunkSummariesPromises);

  const relevantSummaries = chunkSummaries.filter(
    (s) => s.summary !== "SIN INFORMACIÓN RELEVANTE"
  );
  
  if (relevantSummaries.length === 0) {
      return { summary: "No encontré información relevante en los documentos para responder a tu pregunta.", chunkSummaries };
  }

  const formattedSummaries = relevantSummaries
    .map(entry => `Resumen del fragmento ${entry.index + 1}${entry.heading ? ` (${entry.heading})` : ""}:\n- ${entry.summary}`)
    .join("\n\n");

  const reducePrompt = `
    El usuario pregunta: "${question}".
    He analizado un documento y he extraído los siguientes resúmenes relevantes:

    ${formattedSummaries}

    Combina esta información en una respuesta coherente, completa y fácil de entender para el usuario.
  `;

  const finalSummary = await callGemini(reducePrompt, { temperature: 0.3 });

  return {
    summary: finalSummary.trim(),
    chunkSummaries,
  };
}

export default { generateEmbedding, generateText, mapReduceSummarize };
