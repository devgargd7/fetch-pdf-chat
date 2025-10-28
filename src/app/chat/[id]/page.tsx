"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const ChatInterface = dynamic(() => import("@/components/ChatInterface"), {
  ssr: false,
});
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Document {
  id: string;
  filename: string;
  filePath: string;
}

interface Conversation {
  id: string;
  title: string;
  documentId: string;
  document: Document;
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [highlights, setHighlights] = useState<Array<{
    pageNumber: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    text: string;
  }>>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    fetchConversation();
  }, [conversationId]);

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      
      if (!response.ok) {
        setError("Failed to load conversation");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setConversation(data.conversation);
      
      // Load the PDF file from database
      await loadPDFFromDatabase(data.conversation.documentId);
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
      setError("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const loadPDFFromDatabase = async (documentId: string) => {
    try {
      // Fetch the PDF file from the database
      const response = await fetch(`/api/documents/${documentId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
        setPdfFile(file);
      } else {
        console.log("PDF not available in database");
      }
    } catch (error) {
      console.error("Failed to load PDF file:", error);
    }
  };

  const handleHighlight = (newHighlights: Array<{
    pageNumber: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    text: string;
  }>) => {
    setHighlights(newHighlights);
  };

  const handleNavigateToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleClearHighlights = () => {
    setHighlights([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading conversation...</div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || "Conversation not found"}</p>
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Convert messages to the format expected by ChatInterface
  const initialMessages = conversation.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: new Date(msg.createdAt),
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link
                href="/dashboard"
                className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-white">{conversation.title}</h1>
              <p className="text-gray-400 text-sm">Document: {conversation.document.filename}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Side by Side Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left side - PDF Viewer */}
        <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm border-r border-gray-700/60 shadow-xl">

          <div className="flex-1 overflow-hidden p-4">
            {pdfFile ? (
              <PDFViewer
                file={pdfFile}
                highlights={highlights}
                currentPage={currentPage}
                onClearHighlights={handleClearHighlights}
              />
            ) : conversation.document.filePath === null ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-400 text-lg mb-2">PDF Preview Not Available</p>
                  <p className="text-gray-500 text-sm">File storage is not enabled in serverless mode</p>
                  <p className="text-gray-500 text-sm">You can still chat with the document using the extracted text</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading PDF...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Chat Interface */}
        <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-sm shadow-xl">
          <div className="flex-1 overflow-hidden p-4">
            <ChatInterface
              documentId={conversation.documentId}
              conversationId={conversation.id}
              initialMessages={initialMessages}
              isEnabled={true}
              onHighlight={handleHighlight}
              onNavigateToPage={handleNavigateToPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

