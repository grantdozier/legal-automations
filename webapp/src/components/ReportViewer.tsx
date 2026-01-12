import React, { useState } from 'react';
import type { Report, ContradictionType } from '../types';
import {
  exportReportToMarkdown,
  exportReportToHTML,
  exportReportToJSON,
  downloadAsFile,
  copyToClipboard,
} from '../services/reportGenerator';

interface ReportViewerProps {
  report: Report;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | ContradictionType>('all');

  const handleCopyMarkdown = async () => {
    const markdown = exportReportToMarkdown(report);
    await copyToClipboard(markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const markdown = exportReportToMarkdown(report);
    const filename = `${report.documentTitle.replace(/\s+/g, '_')}_report.md`;
    downloadAsFile(markdown, filename, 'text/markdown');
  };

  const handleDownloadHTML = () => {
    const html = exportReportToHTML(report);
    const filename = `${report.documentTitle.replace(/\s+/g, '_')}_report.html`;
    downloadAsFile(html, filename, 'text/html');
  };

  const handleDownloadJSON = () => {
    const json = exportReportToJSON(report);
    const filename = `${report.documentTitle.replace(/\s+/g, '_')}_report.json`;
    downloadAsFile(json, filename, 'application/json');
  };

  const getTypeColor = (type: string): { bg: string; border: string; text: string; badge: string } => {
    switch (type) {
      case 'HARD_CONTRADICTION':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-100 text-red-800 border-red-300' };
      case 'SOFT_INCONSISTENCY':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'SCOPE_SHIFT':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'TEMPORAL_CONFLICT':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'DEFINITION_DRIFT':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', badge: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const formatType = (type: string): string => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-red-600';
    if (confidence >= 0.6) return 'text-amber-600';
    return 'text-slate-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  // Group contradictions by type
  const contradictionsByType = report.contradictions.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<ContradictionType, typeof report.contradictions>);

  const filteredContradictions = activeTab === 'all'
    ? report.contradictions
    : contradictionsByType[activeTab] || [];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Analysis Complete</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">{report.documentTitle}</h2>
            <p className="text-blue-100">
              Generated: {report.generatedAt.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-sm font-medium">Total Claims</p>
            <p className="text-3xl font-bold mt-1">{report.statistics.totalClaims}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-sm font-medium">Contradictions</p>
            <p className="text-3xl font-bold mt-1">{report.statistics.totalContradictions}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-sm font-medium">Hard</p>
            <p className="text-3xl font-bold mt-1">{report.statistics.hardContradictions}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-blue-100 text-sm font-medium">Soft</p>
            <p className="text-3xl font-bold mt-1">{report.statistics.softInconsistencies}</p>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copiedMarkdown ? 'Copied!' : 'Copy Markdown'}</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center space-x-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <span>Download Markdown</span>
          </button>
          <button
            onClick={handleDownloadHTML}
            className="inline-flex items-center space-x-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <span>Download HTML</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="inline-flex items-center space-x-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center text-lg">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Executive Summary
        </h3>
        <p className="text-slate-700 leading-relaxed">{report.summary}</p>
      </div>

      {/* Contradictions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 flex items-center text-lg">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Contradictions & Inconsistencies
          </h3>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({report.contradictions.length})
            </button>
            {Object.entries(contradictionsByType).map(([type, items]) => {
              const colors = getTypeColor(type);
              return (
                <button
                  key={type}
                  onClick={() => setActiveTab(type as ContradictionType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === type
                      ? colors.badge + ' border'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {formatType(type)} ({items.length})
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {filteredContradictions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No contradictions detected</p>
              <p className="text-slate-500 text-sm mt-1">This deposition appears internally consistent</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredContradictions.map((contradiction, index) => {
                const colors = getTypeColor(contradiction.type);
                return (
                  <div
                    key={index}
                    className={`border-2 ${colors.border} ${colors.bg} rounded-xl p-6 transition-all hover:shadow-md`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors.badge}`}>
                            {formatType(contradiction.type)}
                          </span>
                          <span className="text-sm text-slate-600 font-medium">
                            {contradiction.issue}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-slate-600 font-medium">Confidence</p>
                        <p className={`text-2xl font-bold ${getConfidenceColor(contradiction.confidence)}`}>
                          {(contradiction.confidence * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {getConfidenceLabel(contradiction.confidence)}
                        </p>
                      </div>
                    </div>

                    {/* Statements Comparison */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white border-2 border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-xs font-bold">A</span>
                          </div>
                          <p className="text-xs font-semibold text-red-600">{contradiction.claimA.citation}</p>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">{contradiction.claimA.text}</p>
                      </div>

                      <div className="bg-white border-2 border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-xs font-bold">B</span>
                          </div>
                          <p className="text-xs font-semibold text-red-600">{contradiction.claimB.citation}</p>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed">{contradiction.claimB.text}</p>
                      </div>
                    </div>

                    {/* Analysis */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Analysis</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{contradiction.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-900 mb-1">Legal Disclaimer</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              This report is generated by automated AI analysis and should be reviewed by qualified legal professionals.
              The tool identifies patterns and potential inconsistencies but does not make legal conclusions or replace human judgment.
              All findings should be independently verified before use in legal proceedings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
