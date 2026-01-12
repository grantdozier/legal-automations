import React from 'react';
import type { ProcessingStatus as ProcessingStatusType } from '../types';

interface ProcessingStatusProps {
  status: ProcessingStatusType;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ status }) => {
  const getStageLabel = (stage: ProcessingStatusType['stage']): string => {
    switch (stage) {
      case 'idle':
        return 'Ready';
      case 'parsing':
        return 'Parsing transcript...';
      case 'extracting':
        return 'Extracting claims...';
      case 'embedding':
        return 'Generating embeddings...';
      case 'analyzing':
        return 'Detecting contradictions...';
      case 'complete':
        return 'Analysis complete!';
      case 'error':
        return 'Error occurred';
      default:
        return 'Processing...';
    }
  };

  const getStageIcon = (stage: ProcessingStatusType['stage']) => {
    if (stage === 'complete') {
      return (
        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (stage === 'error') {
      return (
        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  };

  if (status.stage === 'idle') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        {getStageIcon(status.stage)}
        <h3 className="text-lg font-semibold ml-3">{getStageLabel(status.stage)}</h3>
      </div>

      {status.stage !== 'complete' && status.stage !== 'error' && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{status.message}</p>
          <p className="text-xs text-gray-500 mt-1">{status.progress}% complete</p>
        </>
      )}

      {status.stage === 'complete' && (
        <p className="text-sm text-green-700">{status.message}</p>
      )}

      {status.stage === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <p className="font-semibold">Error:</p>
          <p className="text-sm">{status.error || 'An unknown error occurred'}</p>
        </div>
      )}
    </div>
  );
};
