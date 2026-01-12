import React, { useState } from 'react';
import type { Report } from '../types';
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

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'HARD_CONTRADICTION':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'SOFT_INCONSISTENCY':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'SCOPE_SHIFT':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'TEMPORAL_CONFLICT':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DEFINITION_DRIFT':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatType = (type: string): string => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-3xl font-bold mb-2">Analysis Report</h2>
        <h3 className="text-xl text-gray-600 mb-2">{report.documentTitle}</h3>
        <p className="text-sm text-gray-500">
          Generated: {report.generatedAt.toLocaleString()}
        </p>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={handleCopyMarkdown}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
        >
          {copiedMarkdown ? 'Copied!' : 'Copy Markdown'}
        </button>
        <button
          onClick={handleDownloadMarkdown}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
        >
          Download Markdown
        </button>
        <button
          onClick={handleDownloadHTML}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
        >
          Download HTML
        </button>
        <button
          onClick={handleDownloadJSON}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
        >
          Download JSON
        </button>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-lg mb-2">Executive Summary</h3>
        <p className="text-gray-700">{report.summary}</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border">
          <p className="text-sm text-gray-600">Total Claims</p>
          <p className="text-2xl font-bold">{report.statistics.totalClaims}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <p className="text-sm text-gray-600">Total Contradictions</p>
          <p className="text-2xl font-bold">{report.statistics.totalContradictions}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600">Hard Contradictions</p>
          <p className="text-2xl font-bold text-red-700">
            {report.statistics.hardContradictions}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600">Soft Inconsistencies</p>
          <p className="text-2xl font-bold text-yellow-700">
            {report.statistics.softInconsistencies}
          </p>
        </div>
      </div>

      {/* Contradictions */}
      <div>
        <h3 className="text-2xl font-bold mb-4">Contradictions & Inconsistencies</h3>

        {report.contradictions.length === 0 ? (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            No contradictions or inconsistencies detected in this deposition.
          </div>
        ) : (
          <div className="space-y-6">
            {report.contradictions.map((contradiction, index) => (
              <div
                key={index}
                className="border rounded-lg p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{contradiction.issue}</h4>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 border ${getTypeColor(
                        contradiction.type
                      )}`}
                    >
                      {formatType(contradiction.type)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Confidence</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {(contradiction.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-semibold text-red-600 mb-2">
                      STATEMENT A ({contradiction.claimA.citation})
                    </p>
                    <p className="text-sm text-gray-800">{contradiction.claimA.text}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-semibold text-red-600 mb-2">
                      STATEMENT B ({contradiction.claimB.citation})
                    </p>
                    <p className="text-sm text-gray-800">{contradiction.claimB.text}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">ANALYSIS</p>
                  <p className="text-sm text-gray-800">{contradiction.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-8 pt-6 border-t text-xs text-gray-500">
        <p className="font-semibold mb-1">Disclaimer:</p>
        <p>
          This report is generated by automated analysis and should be reviewed by legal
          professionals. The tool identifies patterns and potential inconsistencies but does
          not make legal conclusions.
        </p>
      </div>
    </div>
  );
};
