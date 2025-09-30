import { useState, useEffect } from 'react';
import { UploadedImage, ProcessedImage, ImageOperation } from '../types';

interface ImageProcessorProps {
  uploadedImage: UploadedImage;
  processedImage: ProcessedImage | null;
  onProcess: (operations: ImageOperation[]) => void;
  isProcessing: boolean;
  apiBase: string;
}

export default function ImageProcessor({
  uploadedImage,
  processedImage,
  onProcess,
  isProcessing,
  apiBase,
}: ImageProcessorProps) {
  const [width, setWidth] = useState<number | undefined>();
  const [height, setHeight] = useState<number | undefined>();
  const [fit, setFit] = useState<'cover' | 'contain' | 'fill' | 'inside' | 'outside'>('cover');
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [quality, setQuality] = useState<number>(80);
  const [useCrop, setUseCrop] = useState(false);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(100);
  const [cropHeight, setCropHeight] = useState<number>(100);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(uploadedImage.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedImage.file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const operations: ImageOperation[] = [];

    // Add crop operation first if enabled
    if (useCrop) {
      operations.push({
        type: 'crop',
        params: {
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
        },
      });
    }

    // Add resize operation if dimensions provided
    if (width || height) {
      operations.push({
        type: 'resize',
        params: {
          width,
          height,
          fit,
        },
      });
    }

    // Add format conversion
    operations.push({
      type: 'convert',
      params: {
        format,
      },
    });

    // Add quality
    operations.push({
      type: 'quality',
      params: {
        quality,
      },
    });

    onProcess(operations);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Process Image</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Original Image</h3>
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <img src={previewUrl} alt="Preview" className="w-full h-auto" />
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <p>
              <strong>File:</strong> {uploadedImage.originalName}
            </p>
            <p>
              <strong>Size:</strong> {formatFileSize(uploadedImage.size)}
            </p>
          </div>
        </div>

        {/* Processing Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resize Options */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Resize</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={width || ''}
                    onChange={(e) => setWidth(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={height || ''}
                    onChange={(e) =>
                      setHeight(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-sm text-gray-600 mb-1">Fit Mode</label>
                <select
                  value={fit}
                  onChange={(e) => setFit(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                </select>
              </div>
            </div>

            {/* Crop Options */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={useCrop}
                  onChange={(e) => setUseCrop(e.target.checked)}
                  className="mr-2"
                  id="useCrop"
                />
                <label htmlFor="useCrop" className="font-semibold text-gray-700">
                  Enable Crop
                </label>
              </div>
              {useCrop && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">X</label>
                    <input
                      type="number"
                      value={cropX}
                      onChange={(e) => setCropX(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Y</label>
                    <input
                      type="number"
                      value={cropY}
                      onChange={(e) => setCropY(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Width</label>
                    <input
                      type="number"
                      value={cropWidth}
                      onChange={(e) => setCropWidth(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Height</label>
                    <input
                      type="number"
                      value={cropHeight}
                      onChange={(e) => setCropHeight(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Format Options */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Output Format</h4>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Quality: {quality}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process Image'}
            </button>
          </form>

          {/* Download Link */}
          {processedImage && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold mb-2">Processing Complete!</p>
              <p className="text-sm text-green-700 mb-3">
                Size: {formatFileSize(processedImage.processedSize)}
              </p>
              <a
                href={`${apiBase}${processedImage.downloadUrl}`}
                download
                className="inline-block w-full text-center py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Download Processed Image
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
