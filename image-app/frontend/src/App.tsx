import { useState } from 'react';
import axios from 'axios';
import ImageUploader from './components/ImageUploader';
import ImageProcessor from './components/ImageProcessor';
import { UploadedImage, ProcessedImage } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProcessedImage(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadedImage({
        ...response.data,
        file,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async (operations: any[]) => {
    if (!uploadedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/api/process`, {
        fileId: uploadedImage.fileId,
        operations,
      });

      setProcessedImage(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setProcessedImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Image Processor</h1>
          <p className="text-gray-600">
            Upload, resize, crop, compress, and convert images with ease
          </p>
        </header>

        {error && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {!uploadedImage ? (
            <ImageUploader onUpload={handleUpload} isUploading={isUploading} />
          ) : (
            <div className="space-y-6">
              <ImageProcessor
                uploadedImage={uploadedImage}
                processedImage={processedImage}
                onProcess={handleProcess}
                isProcessing={isProcessing}
                apiBase={API_BASE}
              />

              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Upload Another Image
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Production-ready image processing • Max file size: 50MB</p>
          <p className="mt-1">Supported formats: JPEG, PNG, WebP, GIF</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
