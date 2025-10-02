import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { generateEmbedding, generateText, mapReduceSummarize } from '../services/aiService.js';
import pool from '../db/db.js';

const router = express.Router();

const SUMMARY_KEYWORDS = [
  /\bsummary\b/i,
  /\bsummarise\b/i,
  /\bsummarize\b/i,
  /\bresumen\b/i,
  /\bresumir\b/i,
  /\bresumeme\b/i,
  /\bresume\b/i,
  /\boverview\b/i,
  /\bchapter\s+\d+\b/i,
  /\bcapítulo\s+\d+\b/i,
];

function isSummarizationQuery(message) {
  if (!message) return false;
  return SUMMARY_KEYWORDS.some((pattern) => pattern.test(message));
}

// POST /api/chat
// Ruta protegida para manejar las conversaciones del chatbot
router.post('/', protect, async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    console.log('Received message:', message);
    console.log('Conversation history:', conversationHistory);

    const summarizationRequested = isSummarizationQuery(message);

    // 1. Generar el embedding para la pregunta del usuario
    const questionEmbedding = await generateEmbedding(message);

    const retrievalLimit = summarizationRequested ? 15 : 3;
    const searchResults = await pool.query(
      `SELECT content, title
       FROM documents
       WHERE user_id = $1
       ORDER BY embedding <=> $2
       LIMIT $3`,
      [userId, `[${questionEmbedding.join(',')}]`, retrievalLimit]
    );

    if (searchResults.rows.length === 0) {
        return res.status(200).json({
            answer: "No he encontrado información relevante en tus documentos para responder a esa pregunta. ¿Puedes intentar reformularla o preguntar sobre otro tema que esté en tus archivos?"
        });
    }

    const chunks = searchResults.rows.map((row, index) => ({
      content: row.content,
      title: row.title,
      rank: index,
    }));

    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' +
        conversationHistory.slice(-5).map(entry => {
          if (entry.user && entry.assistant) {
            return `User: ${entry.user}\nAssistant: ${entry.assistant}`;
          } else if (entry.user) {
            return `User: ${entry.user}`;
          }
          return '';
        }).filter(Boolean).join('\n\n');
    }

    if (summarizationRequested) {
      const { summary, chunkSummaries } = await mapReduceSummarize({
        question: message,
        chunks,
      });
      return res.status(200).json({
        answer: summary,
        chunkSummaries,
      });
    }

    // 3. Construir el contexto a partir de los resultados de la búsqueda
    const context = chunks.map((row) => row.content).join('\n\n---\n\n');

    // 4. Combine document context with conversation history
    const fullContext = conversationContext ?
      `${context}\n\n${conversationContext}` :
      context;

    console.log('Full context length:', fullContext.length);

    // 5. Obtener la respuesta generada por el modelo de chat de Gemini
    const answer = await generateText(message, context, conversationHistory || []);

    // 6. Enviar la respuesta final al cliente
    res.status(200).json({ answer });

  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: 'Server error during chat processing.' });
  }
});

export default router;