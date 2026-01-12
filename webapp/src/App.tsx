import { useState } from 'react';
import { ApiKeyConfig } from './components/ApiKeyConfig';
import { FileUpload } from './components/FileUpload';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ReportViewer } from './components/ReportViewer';
import type { ApiConfig, ProcessingStatus as ProcessingStatusType, Document, Report } from './types';
import { initializeOpenAI } from './services/openai';
import { initializeChroma, addClaims } from './services/chroma';
import { createDocumentFromFile, extractUtterances } from './services/parser';
import { extractClaimsFromUtterances } from './services/claimExtractor';
import { findContradictions } from './services/contradictionDetector';
import { generateReport } from './services/reportGenerator';
import { saveDocument, saveUtterances, saveClaims, saveContradictions } from './utils/storage';
import { generateBatchEmbeddings } from './services/openai';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [status, setStatus] = useState<ProcessingStatusType>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [report, setReport] = useState<Report | null>(null);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const handleConfigured = (newConfig: ApiConfig) => {
    setIsConfigured(true);

    // Initialize OpenAI
    try {
      initializeOpenAI(newConfig.openaiApiKey!);
    } catch (error: any) {
      alert(`Failed to initialize OpenAI: ${error.message}`);
      return;
    }

    // Initialize Chroma if configured
    if (newConfig.chromaTenant && newConfig.chromaDatabase && newConfig.chromaApiKey) {
      try {
        initializeChroma({
          tenant: newConfig.chromaTenant,
          database: newConfig.chromaDatabase,
          apiKey: newConfig.chromaApiKey,
        });
      } catch (error: any) {
        console.warn('Failed to initialize Chroma:', error.message);
        // Continue without Chroma - we'll fall back to local similarity
      }
    }
  };

  const handleFileSelected = async (file: File) => {
    setReport(null);
    setStatus({
      stage: 'parsing',
      progress: 10,
      message: 'Parsing transcript file...',
    });

    try {
      // Step 1: Parse file
      const document = await createDocumentFromFile(file);
      setCurrentDocument(document);
      saveDocument(document);

      setStatus({
        stage: 'parsing',
        progress: 30,
        message: 'Extracting Q&A utterances...',
      });

      const utterances = extractUtterances(document);
      saveUtterances(utterances);

      const answerCount = utterances.filter(u => u.role === 'ANSWER').length;

      setStatus({
        stage: 'extracting',
        progress: 40,
        message: `Extracting claims from ${answerCount} witness responses... This may take a few minutes.`,
      });

      // Step 2: Extract claims
      const claims = await extractClaimsFromUtterances(utterances, (progress) => {
        const claimProgress = 40 + (progress.current / progress.total) * 20;
        setStatus({
          stage: 'extracting',
          progress: claimProgress,
          message: `Extracting claims... (${progress.current}/${progress.total})`,
        });
      });

      saveClaims(claims);

      setStatus({
        stage: 'embedding',
        progress: 60,
        message: 'Generating embeddings for semantic search...',
      });

      // Step 3: Generate embeddings and store in Chroma
      try {
        const claimTexts = claims.map(c => c.normalizedText);
        const embeddings = await generateBatchEmbeddings(claimTexts);

        const claimsWithEmbeddings = claims.map((claim, i) => ({
          claim,
          embedding: embeddings[i],
        }));

        // Try to store in Chroma if available
        try {
          await addClaims(claimsWithEmbeddings);
        } catch (chromaError) {
          console.warn('Chroma storage failed, will use local similarity:', chromaError);
          // Continue without Chroma
        }

        setStatus({
          stage: 'analyzing',
          progress: 70,
          message: 'Detecting contradictions... This may take several minutes.',
        });

        // Step 4: Detect contradictions
        const contradictions = await findContradictions(claims, 8, 0.7, (progress) => {
          const analysisProgress = 70 + (progress.current / progress.total) * 25;
          setStatus({
            stage: 'analyzing',
            progress: analysisProgress,
            message: `Analyzing... (${progress.current}/${progress.total} claims, ${progress.contradictionsFound} contradictions found)`,
          });
        });

        saveContradictions(contradictions);

        setStatus({
          stage: 'analyzing',
          progress: 95,
          message: 'Generating report...',
        });

        // Step 5: Generate report
        const generatedReport = generateReport(document, claims, contradictions);
        setReport(generatedReport);

        setStatus({
          stage: 'complete',
          progress: 100,
          message: `Analysis complete! Found ${claims.length} claims and ${contradictions.length} contradictions.`,
        });
      } catch (embeddingError: any) {
        console.error('Embedding/analysis error:', embeddingError);
        setStatus({
          stage: 'error',
          progress: 0,
          message: 'Analysis failed',
          error: embeddingError.message || 'An error occurred during analysis',
        });
      }
    } catch (error: any) {
      console.error('Processing error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: 'Processing failed',
        error: error.message || 'An error occurred during processing',
      });
    }
  };

  const handleNewAnalysis = () => {
    setReport(null);
    setCurrentDocument(null);
    setStatus({
      stage: 'idle',
      progress: 0,
      message: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Legal Deposition Analysis Tool
          </h1>
          <p className="text-gray-600 mt-1">
            Automated contradiction detection and claim extraction from deposition transcripts
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* API Configuration */}
        {!isConfigured && (
          <ApiKeyConfig onConfigured={handleConfigured} />
        )}

        {/* File Upload */}
        {isConfigured && !report && status.stage === 'idle' && (
          <FileUpload
            onFileSelected={handleFileSelected}
            disabled={status.stage !== 'idle'}
          />
        )}

        {/* Processing Status */}
        {isConfigured && <ProcessingStatus status={status} />}

        {/* Report */}
        {isConfigured && report && (
          <>
            <ReportViewer report={report} />
            <div className="mt-6 text-center">
              <button
                onClick={handleNewAnalysis}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 text-lg font-semibold"
              >
                Analyze Another Transcript
              </button>
            </div>
          </>
        )}

        {/* Instructions */}
        {isConfigured && !currentDocument && status.stage === 'idle' && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-xl font-bold mb-4">How It Works</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Upload a deposition transcript (PDF or TXT format)</li>
              <li>The system extracts all Q&A pairs and identifies witness statements</li>
              <li>AI analyzes each statement to extract atomic claims</li>
              <li>Claims are embedded and searched for semantic similarity</li>
              <li>Potential contradictions are detected and classified</li>
              <li>A comprehensive report is generated with citations</li>
            </ol>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Processing time depends on transcript length.
                A 100-page deposition typically takes 3-5 minutes. The tool uses OpenAI API
                which may incur costs based on usage.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>
            Legal Deposition Analysis Tool | Built with OpenAI GPT-4 and Chroma Cloud
          </p>
          <p className="mt-2">
            For professional use only. All analysis should be reviewed by qualified legal professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
