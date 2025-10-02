# Starlight

A modern document management and AI-powered chat application that allows users to upload documents, process them with AI embeddings, and engage in intelligent conversations based on their uploaded content.

## Features

- **User Authentication**: Secure JWT-based authentication system
- **Document Upload**: Support for PDF and TXT file uploads
- **AI-Powered Chat**: Intelligent conversations with context awareness using Azure OpenAI and Google Gemini
- **Document Management**: View and delete uploaded documents
- **Vector Search**: Advanced semantic search capabilities using PostgreSQL with pgvector
- **Responsive Design**: Modern, mobile-friendly user interface
- **Real-time Processing**: Live upload progress and processing feedback

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **React Markdown** - Rich text rendering for AI responses

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database with pgvector extension
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **PDF-parse** - PDF text extraction

### AI & ML
- **Azure OpenAI** - GPT models for chat completion
- **Google Gemini** - Alternative AI model
- **LangChain** - Text splitting and processing
- **pgvector** - Vector similarity search

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **Docker** and **Docker Compose**
- **PostgreSQL** (if running without Docker)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd starlight2
```

### 2. Environment Setup

#### Backend Configuration
Create a `.env` file in the `backend/` directory:

```env
PORT=5001
DATABASE_URL="postgresql://mercurialworld:hatsunemiku@localhost:5433/starlight_db"
JWT_SECRET="your-super-secret-jwt-key"
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_EMBEDDING_DEPLOYMENT_ID=text-embedding-3-small
GEMINI_API_KEY=your-google-gemini-api-key
```

#### API Keys Setup
- **Azure OpenAI**: Get your endpoint and API key from the Azure portal
- **Google Gemini**: Get your API key from Google AI Studio
- **JWT Secret**: Generate a secure random string for JWT signing

### 3. Database Setup

Start the PostgreSQL database with pgvector using Docker:

```bash
cd backend
docker-compose up -d
```

This will:
- Start a PostgreSQL 16 container with pgvector extension
- Create the database and tables automatically
- Set up vector search capabilities

### 4. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 5. Start the Application

#### Backend (Terminal 1)
```bash
cd backend
npm run dev
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5001

## Usage

### 1. User Registration/Login
- Create an account or log in with existing credentials
- JWT tokens are automatically managed for authentication

### 2. Document Upload
- Navigate to the "Upload" page
- Drag and drop or select PDF/TXT files
- Files are processed automatically:
  - Text extraction from PDFs
  - Content chunking for optimal AI processing
  - Vector embeddings generation
  - Storage in PostgreSQL with vector indexing

### 3. AI Chat
- Access the chat interface
- Ask questions about your uploaded documents
- The AI maintains conversation history and uses document context
- Responses are formatted with rich markdown rendering

### 4. Document Management
- View all uploaded documents on the "Documents" page
- See upload dates, file names, and processing information
- Delete documents you no longer need

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Documents (Protected)
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - Get user's documents
- `DELETE /api/documents/:id` - Delete document

### Chat (Protected)
- `POST /api/chat` - Send chat message with conversation history

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table with vector embeddings
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
    source_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector search index
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Development

### Project Structure

```
starlight2/
├── backend/
│   ├── db/
│   │   ├── init.sql          # Database schema
│   │   └── db.js            # Database connection
│   ├── middleware/
│   │   └── authMiddleware.js # JWT authentication
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── chat.js          # Chat endpoints
│   │   └── document.js      # Document management
│   ├── services/
│   │   └── aiService.js     # AI integration
│   ├── utils/
│   │   └── textSplitter.js  # Document processing
│   ├── server.js            # Main server file
│   └── docker-compose.yml   # Database setup
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   ├── index.html           # HTML template
│   └── package.json         # Frontend dependencies
└── README.md
```

### Available Scripts

#### Backend
- `npm start` - Production server
- `npm run dev` - Development server with nodemon

#### Frontend
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Backend server port | No (defaults to 5000) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | Yes |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Yes |
| `AZURE_EMBEDDING_DEPLOYMENT_ID` | Azure embedding model name | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

## Deployment

### Production Build

1. **Frontend Build**:
```bash
cd frontend
npm run build
```

2. **Environment Setup**:
   - Set production environment variables
   - Configure production database
   - Set up reverse proxy (nginx recommended)

3. **Start Services**:
```bash
# Backend
npm start

# Database
docker-compose up -d
```

### Docker Deployment

For containerized deployment, you can extend the existing `docker-compose.yml` to include the application services.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Ensure Docker is running
   - Check DATABASE_URL in .env file
   - Verify PostgreSQL container is healthy

2. **AI API Errors**:
   - Verify API keys are correct
   - Check Azure OpenAI endpoint configuration
   - Ensure Gemini API key has proper permissions

3. **File Upload Issues**:
   - Check file size limits (10MB default)
   - Ensure supported file types (PDF/TXT)
   - Verify multer configuration

4. **Authentication Problems**:
   - Check JWT_SECRET configuration
   - Verify token expiration settings
   - Ensure proper CORS configuration

### Logs

Check application logs for detailed error information:
- Backend: Console output from `npm run dev`
- Database: `docker logs starlight2_db`

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Starlight** - Illuminate your documents with AI-powered conversations.</content>
<parameter name="filePath">c:\Users\facu\OneDrive\Documentos\code_projects\starlight2\README.md