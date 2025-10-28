import { useState, useEffect, useRef } from "react";

interface SpeechRecognitionResult {
  text: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  setText: (text: string) => void;
}

export const useSpeechRecognition = (): SpeechRecognitionResult => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

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

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Update the state with the final, confirmed transcript
      // Also include interim results for better UX
      setText(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);

      // Automatically stop listening on error
      if (event.error === "no-speech" || event.error === "audio-capture") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Recognition has stopped
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setText(""); // Clear previous transcript
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  return {
    text,
    isListening,
    isSupported,
    startListening,
    stopListening,
    setText,
  };
};

