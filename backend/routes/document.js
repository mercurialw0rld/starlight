import express from 'express';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { splitText } from '../utils/textSplitter.js';
import { generateEmbedding } from '../services/aiService.js';
import pool from '../db/db.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Configuración de Multer para manejar la subida de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', protect, upload.single('document'), async (req, res) => {
  try {
    // 1. Validar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, buffer, mimetype } = req.file;

    // 2. Extraer texto del archivo según su tipo
    let text = '';
    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      text = data.text;
    } else if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ message: 'Unsupported file type.' });
    }

    if (!text) {
        return res.status(400).json({ message: 'Could not extract text from file.' });
    }

    // 3. Dividir el texto en chunks coherentes
    const chunks = await splitText(text, {
      metadata: {
        source: originalname,
        sourceId: `${req.user.id}-${originalname}`,
        mimeType: mimetype,
      },
    });

    if (!chunks.length) {
      return res.status(400).json({ message: 'No se pudieron generar fragmentos estructurados del documento.' });
    }

    // 4. Generar embeddings para cada chunk y guardarlos
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      const headingTitle = chunk.metadata?.heading ? `${originalname} › ${chunk.metadata.heading}` : originalname;

      // Guardamos el chunk, el embedding y la referencia al usuario en la BD
      await pool.query(
        'INSERT INTO documents (user_id, title, content, embedding, source_file) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, headingTitle, chunk.content, `[${embedding.join(',')}]`, originalname]
      );
    }

    res.status(201).json({ 
        message: 'File processed and embeddings stored successfully.',
        chunksCount: chunks.length,
        structure: chunks.map(({ metadata }) => ({
          heading: metadata?.heading || null,
          chunkIndex: metadata?.chunkIndex ?? null,
        })),
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ message: 'Server error during file processing.' });
  }
});

// GET /api/documents
// Ruta protegida que requiere autenticación
router.get('/', protect, async (req, res) => {
  try {
    // Obtener todos los documentos del usuario
    const result = await pool.query(
      'SELECT id, title, source_file, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    // Agrupar documentos por source_file para mostrar archivos únicos
    const documents = result.rows.reduce((acc, doc) => {
      const existingDoc = acc.find(d => d.source_file === doc.source_file);
      if (existingDoc) {
        existingDoc.chunks_count += 1;
      } else {
        acc.push({
          id: doc.id,
          title: doc.title,
          source_file: doc.source_file,
          created_at: doc.created_at,
          chunks_count: 1
        });
      }
      return acc;
    }, []);

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error fetching documents.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const documentId = req.params.id;

    // Verificar que el documento pertenece al usuario
    const documentResult = await pool.query(
      'SELECT source_file FROM documents WHERE id = $1 AND user_id = $2',
      [documentId, req.user.id]
    );

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found or access denied.' });
    }

    const sourceFile = documentResult.rows[0].source_file;

    // Eliminar todos los chunks del documento (mismo source_file)
    const deleteResult = await pool.query(
      'DELETE FROM documents WHERE source_file = $1 AND user_id = $2',
      [sourceFile, req.user.id]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'No documents found to delete.' });
    }

    res.json({ 
      message: 'Document deleted successfully.',
      deletedChunks: deleteResult.rowCount,
      sourceFile: sourceFile
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error deleting document.' });
  }
});

export default router;