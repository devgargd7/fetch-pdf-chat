'use client'

import { useState } from 'react'
import PDFChatInterface from '@/components/PDFChatInterface'

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="h-full">
        <div className="bg-white border-b border-gray-300 p-4">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            AI PDF Chat Interface
          </h1>
          <p className="text-sm text-gray-600 text-center mt-1">
            Upload a PDF and chat with it using AI - with semantic search and highlights
          </p>
        </div>
        <PDFChatInterface
          onFileUpload={handleFileUpload}
          uploadedFile={uploadedFile}
        />
      </div>
    </div>
  )
}