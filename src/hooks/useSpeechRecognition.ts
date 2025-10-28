import { useState, useEffect, useRef } from "react";

interface SpeechRecognitionResult {
  text: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  setText: (text: string) => void;
  clearError: () => void;
}

export const useSpeechRecognition = (): SpeechRecognitionResult => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldBeListeningRef = useRef(false); // Track if user wants to keep listening

  useEffect(() => {
    // Check if Web Speech API is supported
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Web Speech API is not supported by this browser.");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Initialize speech recognition
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true; // Keep listening even after a pause
    recognition.interimResults = true; // Get live results as the user speaks
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Process all results from the beginning to get the complete transcript
      for (let i = 0; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Combine final and interim for live display
      // Final results are confirmed, interim are still being processed
      const fullTranscript =
        finalTranscript + (interimTranscript ? " " + interimTranscript : "");
      setText(fullTranscript.trim());
    };

    recognition.onerror = (event: any) => {
      const errorType = event.error;

      // Log the error but provide user-friendly messages
      console.warn("Speech recognition error:", errorType);

      switch (errorType) {
        case "network":
          setError(
            "Either Network error or Browser not supported. Please try again. This feature works best in Chrome browser."
          );
          // For network issues during an active hold, try to silently recover once
          if (shouldBeListeningRef.current) {
            try {
              recognition.stop();
              recognition.start();
              return;
            } catch {}
          }
          setIsListening(false);
          break;
        case "no-speech":
          // Don't show error for no-speech, it's normal
          // If user is holding, restart to keep session alive across brief silence
          if (shouldBeListeningRef.current) {
            try {
              recognition.stop();
              recognition.start();
              return;
            } catch {}
          }
          setIsListening(false);
          break;
        case "audio-capture":
          setError(
            "Microphone access denied or unavailable. Please check your browser permissions."
          );
          setIsListening(false);
          break;
        case "not-allowed":
          setError(
            "Microphone permission denied. Please allow microphone access in your browser settings."
          );
          setIsListening(false);
          break;
        case "aborted":
          // User interrupted, not an error
          setIsListening(false);
          break;
        case "service-not-allowed":
          setError(
            "Speech recognition service is not allowed. This may be due to browser security settings."
          );
          setIsListening(false);
          break;
        default:
          setError(`Speech recognition error: ${errorType}`);
          setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If we should still be listening (button still held), restart recognition
      if (shouldBeListeningRef.current) {
        console.log(
          "Speech recognition ended but button still held, restarting..."
        );
        try {
          recognition.start();
        } catch (error) {
          console.error("Error restarting recognition:", error);
          setIsListening(false);
          shouldBeListeningRef.current = false;
        }
      } else {
        // Recognition has stopped and user released button
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setText(""); // Clear previous transcript
        setError(null); // Clear any previous errors
        shouldBeListeningRef.current = true; // Mark that we want to keep listening
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setError("Failed to start speech recognition. Please try again.");
        setIsListening(false);
        shouldBeListeningRef.current = false;
      }
    }
  };

  const stopListening = () => {
    shouldBeListeningRef.current = false; // Mark that we want to stop listening

    if (recognitionRef.current) {
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    text,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    setText,
    clearError,
  };
};
