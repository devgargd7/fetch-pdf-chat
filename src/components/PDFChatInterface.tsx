'use client'

import { useState } from 'react'
import FileUpload from './FileUpload'
import PDFViewer from './PDFViewer'
import ChatInterface from './ChatInterface'

interface PDFChatInterfaceProps {
  onFileUpload: (file: File) => void
  uploadedFile: File | null
}

export default function PDFChatInterface({ onFileUpload, uploadedFile }: PDFChatInterfaceProps) {
  const [documentData, setDocumentData] = useState<any>(null)
  const [highlights, setHighlights] = useState<Array<{
    pageNumber: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    text: string
  }>>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const handleUploadSuccess = (data: any) => {
    setDocumentData(data)
    setUploadError(null)
    
    // Show success message in chat
    if (data.success) {
    }
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
    console.error('Upload error:', error)
  }

  const handleHighlight = (newHighlights: Array<{
    pageNumber: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    text: string
  }>) => {
    setHighlights(newHighlights)
  }

  const handleNavigateToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  const handleClearHighlights = () => {
    setHighlights([])
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left side - PDF Viewer */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm border-r border-slate-200/60 shadow-xl">
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {uploadedFile ? uploadedFile.name : 'PDF Viewer'}
                </h2>
                {uploadedFile && (
                  <p className="text-sm text-slate-500">Ready for analysis</p>
                )}
              </div>
            </div>
            {!uploadedFile && (
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span>Upload a PDF to get started</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {uploadedFile ? (
            <PDFViewer
              file={uploadedFile}
              highlights={highlights}
              currentPage={currentPage}
              onClearHighlights={handleClearHighlights}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="relative mb-8">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">No PDF loaded</h3>
                <p className="text-slate-500 mb-6 leading-relaxed">
                  Upload a PDF document to start exploring its content with AI-powered insights and intelligent highlighting.
                </p>
                <div className="flex items-center justify-center space-x-6 text-sm text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Smart Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>AI Chat</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Auto Highlight</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Chat Interface */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm shadow-xl">
        <ChatInterface
          documentId={documentData?.id}
          isEnabled={!!uploadedFile && !!documentData}
          onHighlight={handleHighlight}
          onNavigateToPage={handleNavigateToPage}
        />
      </div>

      {/* Upload Modal/Overlay */}
      {!uploadedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Upload PDF Document</h3>
                  <p className="text-blue-100">Start your AI-powered document analysis</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <FileUpload
                onFileUpload={onFileUpload}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />

              {uploadError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{uploadError}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>PDF only</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Max 10MB</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}