import { useState, useEffect } from 'react';
import { documentsAPI } from '../services/api';
import './DocumentManager.css';

const DocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await documentsAPI.getDocuments();
      setDocuments(result.documents);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId, sourceFile) => {
    if (!window.confirm(`Are you sure you want to delete "${sourceFile}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(documentId);
    setError('');
    setSuccess('');

    try {
      await documentsAPI.deleteDocument(documentId);
      setSuccess(`Successfully deleted "${sourceFile}".`);
      // Remove the document from the local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="document-manager">
        <div className="loading">Loading your documents...</div>
      </div>
    );
  }

  return (
    <div className="document-manager">
      <div className="document-manager-header">
        <h1>My Documents</h1>
        <p>Manage your uploaded documents</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="documents-list">
        {documents.length === 0 ? (
          <div className="no-documents">
            <p>You haven't uploaded any documents yet.</p>
            <a href="/upload" className="upload-link">Upload your first document</a>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="document-item">
              <div className="document-info">
                <h3 className="document-title">{doc.source_file}</h3>
                <div className="document-meta">
                  <span className="document-date">
                    Uploaded: {formatDate(doc.created_at)}
                  </span>
                  <span className="document-chunks">
                    {doc.chunks_count} chunk{doc.chunks_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="document-actions">
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteDocument(doc.id, doc.source_file)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentManager;