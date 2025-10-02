import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import './DocumentUpload.css';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setError('');
    setSuccess('');

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or TXT file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const result = await documentsAPI.upload(file, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      setSuccess(`Successfully uploaded! Processed ${result.chunksCount} chunks.`);
      setFile(null);
      setUploadProgress(0);

      // Navigate to chat after a brief delay
      setTimeout(() => {
        navigate('/chat');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div className="upload-header">
          <h1>Upload Documents</h1>
          <p>Upload PDF or TXT files to chat with your documents</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div
          className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            accept=".pdf,.txt"
            style={{ display: 'none' }}
            disabled={uploading}
          />

          {!file ? (
            <>
              <div className="dropzone-icon">📁</div>
              <p className="dropzone-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="dropzone-subtext">PDF or TXT (max 10MB)</p>
            </>
          ) : (
            <div className="file-preview">
              <div className="file-icon">
                {file.type === 'application/pdf' ? '📄' : '📝'}
              </div>
              <div className="file-info">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              {!uploading && (
                <button
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {uploading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">{uploadProgress}%</p>
          </div>
        )}

        {file && !uploading && (
          <button
            className="btn btn-primary btn-full"
            onClick={handleUpload}
          >
            Upload and Process
          </button>
        )}

        <div className="upload-info">
          <h3>Supported formats:</h3>
          <ul>
            <li>📄 PDF documents</li>
            <li>📝 Plain text files (.txt)</li>
          </ul>
          <p className="info-note">
            Your documents will be securely processed and stored. You can chat with them immediately after upload.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
