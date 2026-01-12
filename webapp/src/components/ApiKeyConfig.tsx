import React, { useState, useEffect } from 'react';
import { loadConfig, saveConfig } from '../utils/storage';
import type { ApiConfig } from '../types';

interface ApiKeyConfigProps {
  onConfigured: (config: ApiConfig) => void;
}

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onConfigured }) => {
  const [config, setConfig] = useState<ApiConfig>({});
  const [showKeys, setShowKeys] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedConfig = loadConfig();
    setConfig(savedConfig);

    // Check if already configured
    if (savedConfig.openaiApiKey) {
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!config.openaiApiKey) {
      alert('OpenAI API key is required');
      return;
    }

    saveConfig(config);
    setIsSaved(true);
    onConfigured(config);
  };

  const handleClear = () => {
    setConfig({});
    saveConfig({});
    setIsSaved(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">API Configuration</h2>

      {isSaved && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          Configuration saved successfully!
        </div>
      )}

      <div className="space-y-4">
        {/* OpenAI API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Key <span className="text-red-500">*</span>
          </label>
          <input
            type={showKeys ? 'text' : 'password'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="sk-..."
            value={config.openaiApiKey || ''}
            onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
          />
          <p className="text-sm text-gray-500 mt-1">
            Required for claim extraction and contradiction detection.
            Get your key at{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              platform.openai.com
            </a>
          </p>
        </div>

        {/* Chroma Cloud Configuration (Optional) */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-3">Chroma Cloud (Optional)</h3>
          <p className="text-sm text-gray-600 mb-3">
            For better semantic search. If not configured, local similarity matching will be used.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="default-tenant"
                value={config.chromaTenant || ''}
                onChange={(e) => setConfig({ ...config, chromaTenant: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="default-database"
                value={config.chromaDatabase || ''}
                onChange={(e) => setConfig({ ...config, chromaDatabase: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="chroma-api-key"
                value={config.chromaApiKey || ''}
                onChange={(e) => setConfig({ ...config, chromaApiKey: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Show/Hide Keys */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showKeys"
            checked={showKeys}
            onChange={(e) => setShowKeys(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showKeys" className="text-sm text-gray-700">
            Show API keys
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Configuration
          </button>
          {isSaved && (
            <button
              onClick={handleClear}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Clear Configuration
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mt-4">
          <strong>Security Note:</strong> API keys are stored in your browser's local storage.
          Never share your API keys or use this tool on shared computers.
        </div>
      </div>
    </div>
  );
};
