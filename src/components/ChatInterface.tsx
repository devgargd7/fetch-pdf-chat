'use client'

import { useState, useRef, useEffect } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { speechQueue } from '@/utils/speechSynthesis'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  documentId?: string
  conversationId?: string
  initialMessages?: Message[]
  isEnabled?: boolean
  onHighlight?: (highlights: Array<{
    pageNumber: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    text: string
  }>) => void
  onNavigateToPage?: (pageNumber: number) => void
}

export default function ChatInterface({ 
  documentId, 
  conversationId,
  initialMessages = [],
  isEnabled = true, 
  onHighlight,
  onNavigateToPage
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Update messages when initialMessages change
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages)
    }
  }, [initialMessages])
  
  // Voice interaction
  const { text: voiceText, isListening, isSupported: isVoiceSupported, startListening, stopListening, setText: setVoiceText } = useSpeechRecognition()
  const [isMicPressed, setIsMicPressed] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Update input field with voice text as user speaks
  useEffect(() => {
    if (voiceText && isListening) {
      setInput(voiceText)
    }
  }, [voiceText, isListening])

  // Speak AI responses as they stream in
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      // Cancel any ongoing speech when new AI message starts
      if (messages.length > 1) {
        const prevLastMessage = messages[messages.length - 2]
        if (!prevLastMessage || prevLastMessage.role !== 'assistant') {
          speechQueue.cancel()
        }
      }
      
      // Stream the speech as content arrives
      speechQueue.speak(lastMessage.content)
    }
  }, [messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechQueue.cancel()
      if (isListening) {
        stopListening()
      }
    }
  }, [isListening, stopListening])

  // Microphone handlers
  const handleMicPress = () => {
    // Interrupt the AI if it's speaking
    speechQueue.cancel()
    setIsMicPressed(true)
    startListening()
  }

  const handleMicRelease = () => {
    setIsMicPressed(false)
    stopListening()
    
    // Submit the transcribed text after a brief delay to ensure final text is captured
    setTimeout(() => {
      if (voiceText.trim()) {
        // Submit to chat
        handleVoiceSubmit(voiceText)
        setVoiceText('')
        setInput('')
      }
    }, 500)
  }

  const handleVoiceSubmit = async (text: string) => {
    if (!isEnabled || !text.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          documentId,
          conversationId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('0:"')) {
              const content = line.slice(3, -1) // Remove 0:" and "
              setMessages(prev => {
                const updatedMessages = prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: msg.content + content }
                    : msg
                )
                
                // Parse tool calls in real-time as content streams
                const updatedMessage = updatedMessages.find(msg => msg.id === assistantMessage.id)
                if (updatedMessage) {
                  parseToolCalls(updatedMessage.content)
                }
                
                return updatedMessages
              })
            }
          }
        }
      }

      // Final parse of tool calls after streaming is complete
      const finalContent = messages.find(msg => msg.id === assistantMessage.id)?.content || ''
      parseToolCalls(finalContent)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Parse tool calls from AI response
  const parseToolCalls = (content: string) => {
    console.log('Parsing tool calls from content:', content)
    
    // More flexible regex patterns that handle various formats and spaces
    // Matches: "HIGHLIGHT: 4, 10, 200, 600, 800" or "HIGHLIGHT: 4,10,200,600,800"
    const highlightMatch = content.match(/HIGHLIGHT:\s*(?:page\s*)?(\d+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
    
    // Match both "NAVIGATE: 4" and "NAVIGATE: page4" or "NAVIGATE: page 4"
    const navigateMatch = content.match(/NAVIGATE:\s*(?:page\s*)?(\d+)/i)
    
    console.log('Highlight match:', highlightMatch)
    console.log('Navigate match:', navigateMatch)
    
    if (highlightMatch) {
      const [, pageNumber, x0, y0, x1, y1] = highlightMatch
      console.log('Triggering highlight for page:', pageNumber, 'with bbox:', { x0, y0, x1, y1 })
      onHighlight?.([{
        pageNumber: parseInt(pageNumber),
        bbox: { 
          x0: parseFloat(x0), 
          y0: parseFloat(y0), 
          x1: parseFloat(x1), 
          y1: parseFloat(y1) 
        },
        text: "Highlighted content"
      }])
    }
    
    if (navigateMatch) {
      const [, pageNumber] = navigateMatch
      console.log('Triggering navigation to page:', pageNumber)
      onNavigateToPage?.(parseInt(pageNumber))
    }
  }

  // Handle pill clicks
  const handleNavigateClick = (pageNumber: number) => {
    console.log('Pill clicked - navigating to page:', pageNumber)
    onNavigateToPage?.(pageNumber)
  }

  const handleHighlightClick = (pageNumber: number, bbox: { x0: number; y0: number; x1: number; y1: number }) => {
    console.log('Pill clicked - highlighting page:', pageNumber, 'bbox:', bbox)
    onNavigateToPage?.(pageNumber) // First navigate to the page
    onHighlight?.([{
      pageNumber,
      bbox,
      text: "Highlighted content"
    }])
  }

  // Render message content with clickable pills
  const renderMessageContent = (content: string) => {
    // Split content by tool calls and render each part
    const parts = content.split(/(HIGHLIGHT:\s*(?:page\s*)?\d+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+|NAVIGATE:\s*(?:page\s*)?\d+)/gi)
    
    return parts.map((part, index) => {
      // Check if this part is a HIGHLIGHT command
      const highlightMatch = part.match(/HIGHLIGHT:\s*(?:page\s*)?(\d+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
      if (highlightMatch) {
        const [, pageNumber, x0, y0, x1, y1] = highlightMatch
        return (
          <button
            key={index}
            onClick={() => handleHighlightClick(parseInt(pageNumber), {
              x0: parseFloat(x0),
              y0: parseFloat(y0),
              x1: parseFloat(x1),
              y1: parseFloat(y1)
            })}
            className="inline-flex items-center px-3 py-1 mx-1 my-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium rounded-full border border-blue-300 transition-colors duration-200"
          >
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Highlight Page {pageNumber}
          </button>
        )
      }

      // Check if this part is a NAVIGATE command
      const navigateMatch = part.match(/NAVIGATE:\s*(?:page\s*)?(\d+)/i)
      if (navigateMatch) {
        const [, pageNumber] = navigateMatch
        return (
          <button
            key={index}
            onClick={() => handleNavigateClick(parseInt(pageNumber))}
            className="inline-flex items-center px-3 py-1 mx-1 my-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-medium rounded-full border border-green-300 transition-colors duration-200"
          >
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Go to Page {pageNumber}
          </button>
        )
      }

      // Regular text content
      return <span key={index}>{part}</span>
    })
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEnabled || !input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          documentId,
          conversationId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('0:"')) {
              const content = line.slice(3, -1) // Remove 0:" and "
              setMessages(prev => {
                const updatedMessages = prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: msg.content + content }
                    : msg
                )
                
                // Parse tool calls in real-time as content streams
                const updatedMessage = updatedMessages.find(msg => msg.id === assistantMessage.id)
                if (updatedMessage) {
                  parseToolCalls(updatedMessage.content)
                }
                
                return updatedMessages
              })
            }
          }
        }
      }

      // Final parse of tool calls after streaming is complete
      const finalContent = messages.find(msg => msg.id === assistantMessage.id)?.content || ''
      parseToolCalls(finalContent)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isEnabled) {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">AI Chat Assistant</h3>
              <p className="text-sm text-slate-500">Ready to analyze your document</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Upload a PDF to start chatting</h3>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Once you upload a PDF, you can ask questions about its content and get intelligent insights with automatic highlighting.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Smart Q&A</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Auto Highlight</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Page Navigation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
      {/* Chat Header */}
      <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">AI Chat Assistant</h3>
            <p className="text-sm text-slate-500">
              Ask questions about the document content
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/30 to-white">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Start a conversation about the PDF</p>
            <p className="text-xs text-slate-400 mt-1">Ask questions, request summaries, or explore specific topics</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'bg-white text-slate-800 border border-slate-200'
              }`}
            >
              <div className="text-sm leading-relaxed">{renderMessageContent(message.content)}</div>
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-blue-100' : 'text-slate-400'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-md px-4 py-3 rounded-2xl bg-white text-slate-800 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-blue-600"></div>
                <span className="text-sm font-medium">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-6 border-t border-slate-200/60 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
        <form onSubmit={handleFormSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask a question about the PDF..."}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm ${
                isListening ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-300'
              }`}
              disabled={isLoading || isListening}
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Microphone Button (Hold to Talk) */}
          {isVoiceSupported && (
            <button
              type="button"
              onMouseDown={handleMicPress}
              onMouseUp={handleMicRelease}
              onMouseLeave={handleMicRelease}
              onTouchStart={handleMicPress}
              onTouchEnd={handleMicRelease}
              disabled={isLoading}
              className={`px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white ring-2 ring-red-300 scale-110'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
              }`}
              title="Hold to talk"
            >
              {isListening ? (
                <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="font-medium">Send</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            )}
          </button>
        </form>
        
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>💡 {isVoiceSupported ? 'Hold the mic to talk or type your question' : 'Try asking: "What is this document about?"'}</span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {isVoiceSupported && (
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Voice Enabled</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>AI Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
