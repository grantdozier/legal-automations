import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;

      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [disabled]
  );

  const handleFile = (file: File) => {
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidType && !hasValidExtension) {
      alert('Please upload a PDF or TXT file');
      return;
    }

    onFileSelected(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Deposition Transcript</h2>
        <p className="text-slate-600">
          Upload a PDF or TXT file to begin analysis
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="fileInput"
          className="hidden"
          accept=".pdf,.txt"
          onChange={handleChange}
          disabled={disabled}
        />

        <label
          htmlFor="fileInput"
          className={disabled ? 'cursor-not-allowed' : 'cursor-pointer block'}
        >
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-900">
              Drop your transcript here
            </p>
            <p className="text-slate-600">
              or <span className="text-blue-600 font-medium hover:text-blue-700">browse files</span>
            </p>
            <p className="text-sm text-slate-500 mt-3">
              Supports PDF and TXT • Max size: 100MB
            </p>
          </div>
        </label>
      </div>

      {/* Additional Info */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">Best Results</h4>
            <p className="text-xs text-slate-600 mt-1">Transcripts with clear Q. and A. markers and page numbers</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">Secure & Private</h4>
            <p className="text-xs text-slate-600 mt-1">Your documents are processed securely and never stored</p>
          </div>
        </div>
      </div>
    </div>
  );
};
