import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ReportViewer } from './components/ReportViewer';
import type { ProcessingStatus as ProcessingStatusType, Report } from './types';
import { config } from './config';
import { initializeOpenAI } from './services/openai';
import { createDocumentFromFile, extractUtterances } from './services/parser';
import { extractClaimsFromUtterances } from './services/claimExtractor';
import { findContradictions } from './services/contradictionDetector';
import { generateReport } from './services/reportGenerator';
import { saveDocument, saveUtterances, saveClaims, saveContradictions } from './utils/storage';
import { generateBatchEmbeddings } from './services/openai';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<ProcessingStatusType>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [report, setReport] = useState<Report | null>(null);

  // Initialize services on mount
  useEffect(() => {
    try {
      // Initialize OpenAI
      if (!config.openai.apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      initializeOpenAI(config.openai.apiKey);

      console.log('✓ OpenAI initialized successfully');
      setIsInitialized(true);
    } catch (error: any) {
      console.error('Initialization error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: 'Failed to initialize application',
        error: error.message,
      });
    }
  }, []);

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
      console.log(`Document parsed: ${document.pageCount || 'N/A'} pages, ${document.rawText.length} characters`);
      saveDocument(document);

      setStatus({
        stage: 'parsing',
        progress: 30,
        message: 'Extracting Q&A utterances...',
      });

      const utterances = extractUtterances(document);
      console.log(`Extracted ${utterances.length} utterances (${utterances.filter(u => u.role === 'QUESTION').length} questions, ${utterances.filter(u => u.role === 'ANSWER').length} answers)`);
      saveUtterances(utterances);

      const answerCount = utterances.filter(u => u.role === 'ANSWER').length;

      if (answerCount === 0) {
        throw new Error('No Q&A pairs found in document. Please ensure the transcript uses "Q." and "A." format for questions and answers.');
      }

      setStatus({
        stage: 'extracting',
        progress: 40,
        message: `Extracting claims from ${answerCount} witness responses...`,
      });

      // Step 2: Extract claims
      const claims = await extractClaimsFromUtterances(utterances, (progress) => {
        const claimProgress = 40 + (progress.current / progress.total) * 20;
        setStatus({
          stage: 'extracting',
          progress: claimProgress,
          message: `Extracting claims (${progress.current}/${progress.total})`,
        });
      });

      console.log(`Extracted ${claims.length} claims total`);
      saveClaims(claims);

      setStatus({
        stage: 'embedding',
        progress: 60,
        message: 'Generating embeddings for semantic analysis...',
      });

      // Step 3: Generate embeddings for local vector search
      let embeddings: number[][] = [];
      let validClaims = claims;

      try {
        // Filter and validate claim texts before generating embeddings
        validClaims = claims.filter(c => c.normalizedText && c.normalizedText.trim().length > 0);

        if (validClaims.length !== claims.length) {
          console.warn(`Filtered out ${claims.length - validClaims.length} claims with invalid text`);
        }

        if (validClaims.length === 0) {
          throw new Error('No valid claims found for embedding generation');
        }

        console.log(`Generating embeddings for ${validClaims.length} valid claims...`);
        const claimTexts = validClaims.map(c => c.normalizedText);
        embeddings = await generateBatchEmbeddings(claimTexts);
        console.log(`✓ Generated ${embeddings.length} embeddings for local vector search`);

        setStatus({
          stage: 'analyzing',
          progress: 70,
          message: 'Detecting contradictions and inconsistencies...',
        });

        // Step 4: Detect contradictions using local vector similarity
        // IMPORTANT: Pass validClaims (not all claims) since embeddings match validClaims indices
        // Lower threshold to 0.6 to find more candidates
        const contradictions = await findContradictions(validClaims, 10, 0.6, (progress) => {
          const analysisProgress = 70 + (progress.current / progress.total) * 25;
          setStatus({
            stage: 'analyzing',
            progress: analysisProgress,
            message: `Analyzing (${progress.current}/${progress.total} claims, ${progress.contradictionsFound} contradictions found)`,
          });
        }, embeddings);

        saveContradictions(contradictions);

        setStatus({
          stage: 'analyzing',
          progress: 95,
          message: 'Generating report...',
        });

        // Step 5: Generate report
        const generatedReport = generateReport(document, validClaims, contradictions);
        setReport(generatedReport);

        setStatus({
          stage: 'complete',
          progress: 100,
          message: `Analysis complete! Found ${validClaims.length} claims and ${contradictions.length} contradictions.`,
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
    setStatus({
      stage: 'idle',
      progress: 0,
      message: '',
    });
  };

  if (!isInitialized && status.stage !== 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-900">
                  Deposition Analysis
                </h1>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                  AI Agent Attorney
                </span>
              </div>
              <p className="text-slate-600 mt-1">
                AI-powered contradiction detection with precise citations
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* File Upload */}
        {!report && status.stage === 'idle' && (
          <>
            <FileUpload
              onFileSelected={handleFileSelected}
              disabled={status.stage !== 'idle'}
            />

            {/* How It Works */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How It Works
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-blue-600 font-bold text-lg">1</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">Upload & Parse</h4>
                  <p className="text-slate-600 text-sm">Upload your deposition transcript. We extract all Q&A pairs and preserve citations.</p>
                </div>
                <div className="flex flex-col">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-indigo-600 font-bold text-lg">2</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">AI Analysis</h4>
                  <p className="text-slate-600 text-sm">GPT-4 extracts claims and searches for contradictions using semantic matching.</p>
                </div>
                <div className="flex flex-col">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-purple-600 font-bold text-lg">3</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">Get Report</h4>
                  <p className="text-slate-600 text-sm">Receive a detailed report with all contradictions categorized and cited.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Processing Status */}
        <ProcessingStatus status={status} />

        {/* Report */}
        {report && (
          <>
            <ReportViewer report={report} />
            <div className="mt-8 text-center">
              <button
                onClick={handleNewAnalysis}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Analyze Another Transcript
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-600">
            <p>Powered by GPT-4 and Chroma Cloud</p>
            <p className="mt-2 md:mt-0">For professional legal use only</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
