'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import react-pdf components to avoid SSR issues
const Document = dynamic(() => import('react-pdf').then(mod => ({ default: mod.Document })), { ssr: false })
const Page = dynamic(() => import('react-pdf').then(mod => ({ default: mod.Page })), { ssr: false })

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    // Use the worker from react-pdf package to avoid CORS issues
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }).catch(err => {
    console.error('Failed to load PDF.js worker:', err)
  })
}

interface PDFViewerProps {
  file: File | null
  onPageChange?: (pageNumber: number) => void
  highlights?: Array<{
    pageNumber: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    text: string
  }>
  currentPage?: number
  onClearHighlights?: () => void
}

export default function PDFViewer({ file, onPageChange, highlights = [], currentPage, onClearHighlights }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [workerReady, setWorkerReady] = useState(false)
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClient(true)
    // Ensure worker is loaded
    if (typeof window !== 'undefined') {
      import('react-pdf').then(({ pdfjs }) => {
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        }
        setWorkerReady(true)
      }).catch(err => {
        console.error('Failed to load PDF.js worker:', err)
        setError('Failed to initialize PDF viewer')
      })
    }
  }, [])

  // Smooth scroll to page when currentPage prop changes
  useEffect(() => {
    if (currentPage && pageRefs.current[currentPage] && scrollContainerRef.current) {
      const pageElement = pageRefs.current[currentPage]
      if (pageElement) {
        pageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest' 
        })
      }
    }
  }, [currentPage])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error)
    setError('Failed to load PDF')
    setLoading(false)
  }, [])

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1.0)
  }, [])

  const addPageRef = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    pageRefs.current[pageNumber] = element
  }, [])

  if (!isClient || !workerReady) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium text-gray-900">No PDF loaded</p>
          <p className="text-sm text-gray-500">Upload a PDF to view it here</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-medium text-red-900">Error loading PDF</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 rounded-xl">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-700">
              {numPages ? `${numPages} pages` : 'Loading...'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Clear Highlights Button */}
          {highlights.length > 0 && onClearHighlights && (
            <button
              onClick={onClearHighlights}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded-xl border border-red-300 transition-colors duration-200"
              title="Clear all highlights"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear Highlights</span>
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 bg-white rounded-xl border border-slate-300 p-1 shadow-sm">
            <button
              onClick={zoomOut}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <div className="px-3 py-1 text-sm font-medium text-slate-700 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={zoomIn}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="w-px h-6 bg-slate-300"></div>
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              title="Reset zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable PDF Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <div className="flex flex-col items-center space-y-6">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600 font-medium">Loading PDF...</p>
                </div>
              </div>
            }
          >
            {numPages && Array.from({ length: numPages }, (_, index) => index + 1).map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => addPageRef(pageNum, el)}
                className="mb-6 last:mb-0"
              >
                <div className="relative inline-block">
                  {/* Page number badge */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-lg">
                      Page {pageNum}
                    </div>
                  </div>

                  {/* PDF Page */}
                  <div className="relative">
                    <Page
                      pageNumber={pageNum}
                      scale={scale}
                      className="shadow-2xl rounded-lg"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
                          <p className="text-red-600 text-sm">Failed to load page {pageNum}</p>
                        </div>
                      }
                    />

                    {/* Enhanced Highlights Overlay */}
                    {highlights
                      .filter(highlight => highlight.pageNumber === pageNum)
                      .map((highlight, index) => {
                        // Scale the coordinates based on the current zoom level
                        // PDF coordinates are typically in points (72 DPI)
                        // We need to scale them according to the current scale
                        const scaledX0 = highlight.bbox.x0 * scale
                        const scaledY0 = highlight.bbox.y0 * scale
                        const scaledX1 = highlight.bbox.x1 * scale
                        const scaledY1 = highlight.bbox.y1 * scale
                        
                        return (
                          <div
                            key={index}
                            className="absolute pointer-events-none animate-pulse"
                            style={{
                              left: `${scaledX0}px`,
                              top: `${scaledY0}px`,
                              width: `${scaledX1 - scaledX0}px`,
                              height: `${scaledY1 - scaledY0}px`,
                            }}
                            title={highlight.text}
                          >
                            {/* Main highlight */}
                            <div className="w-full h-full bg-gradient-to-r from-blue-400/30 to-indigo-400/30 rounded-lg border-2 border-blue-400/60 shadow-lg backdrop-blur-sm"></div>
                            
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-lg blur-sm -z-10"></div>
                            
                            {/* Corner indicators */}
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  )
}
