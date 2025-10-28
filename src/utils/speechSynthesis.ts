class SpeechSynthesisQueue {
  private synth: SpeechSynthesis;
  private utteranceQueue: SpeechSynthesisUtterance[];
  private isSpeaking: boolean;
  private currentUtterance: SpeechSynthesisUtterance | null;
  private sentenceBuffer: string;
  private speakingTimeout: NodeJS.Timeout | null;

  constructor() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    } else {
      this.synth = null as any;
    }
    this.utteranceQueue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.sentenceBuffer = "";
    this.speakingTimeout = null;
  }

  /**
   * Check if speech synthesis is available and ready
   */
  private isReady(): boolean {
    return !!(this.synth && typeof this.synth.speak === "function");
  }

  /**
   * Speak text immediately, interrupting any ongoing speech
   */
  speak(text: string) {
    if (!this.isReady()) {
      console.warn("Speech synthesis is not available");
      return;
    }

    // Cancel any ongoing speech
    try {
      if (this.synth.speaking) {
        this.synth.cancel();
        this.isSpeaking = false;
        this.utteranceQueue = [];
        this.sentenceBuffer = "";
      }
    } catch (err) {
      console.error("Error canceling speech:", err);
      return;
    }

    // Split text into sentences to create a more natural, streaming feel
    const sentences = this.splitIntoSentences(text);

    sentences.forEach((sentence) => {
      if (sentence.trim()) {
        const utterance = new SpeechSynthesisUtterance(sentence.trim());

        // Configure voice settings for better quality
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume

        utterance.onend = () => {
          // When one sentence ends, speak the next one in the queue
          this.utteranceQueue.shift();
          if (this.utteranceQueue.length > 0 && this.isReady()) {
            try {
              this.synth.speak(this.utteranceQueue[0]);
            } catch (err) {
              console.error("Error speaking next utterance:", err);
              this.isSpeaking = false;
              this.currentUtterance = null;
            }
          } else {
            this.isSpeaking = false;
            this.currentUtterance = null;
          }
        };

        utterance.onerror = (event) => {
          // Only log if there's a meaningful error
          if (
            event.error &&
            event.error !== "interrupted" &&
            event.error !== "canceled"
          ) {
            console.error("Speech synthesis error:", event.error, event);
          }
          this.utteranceQueue.shift();
          if (this.utteranceQueue.length > 0 && this.isReady()) {
            try {
              this.synth.speak(this.utteranceQueue[0]);
            } catch (err) {
              console.error("Error speaking after error:", err);
              this.isSpeaking = false;
              this.currentUtterance = null;
            }
          } else {
            this.isSpeaking = false;
            this.currentUtterance = null;
          }
        };

        this.utteranceQueue.push(utterance);
      }
    });

    // Start speaking if not already speaking
    if (!this.isSpeaking && this.utteranceQueue.length > 0) {
      this.isSpeaking = true;
      this.currentUtterance = this.utteranceQueue[0];
      try {
        this.synth.speak(this.currentUtterance);
      } catch (err) {
        console.error("Error starting speech:", err);
        this.isSpeaking = false;
        this.currentUtterance = null;
      }
    }
  }

  /**
   * Add text to buffer and speak complete sentences as they form
   * This is perfect for streaming responses
   */
  speakStream(chunk: string) {
    if (!this.isReady()) return;

    this.sentenceBuffer += chunk;

    // Check if we have complete sentences
    const sentences = this.splitIntoSentences(this.sentenceBuffer);

    // Keep the last incomplete sentence in the buffer
    const lastSentence = sentences[sentences.length - 1];
    const isComplete = /[.!?]\s*$/.test(this.sentenceBuffer);

    if (!isComplete && sentences.length > 0) {
      // Keep last incomplete sentence in buffer
      this.sentenceBuffer = lastSentence;
      sentences.pop();
    } else {
      // All sentences are complete
      this.sentenceBuffer = "";
    }

    // Speak complete sentences
    sentences.forEach((sentence) => {
      if (sentence.trim()) {
        const utterance = new SpeechSynthesisUtterance(sentence.trim());

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          this.utteranceQueue.shift();
          if (this.utteranceQueue.length > 0 && this.isReady()) {
            try {
              this.synth.speak(this.utteranceQueue[0]);
            } catch (err) {
              console.error("Error speaking next utterance:", err);
              this.isSpeaking = false;
              this.currentUtterance = null;
            }
          } else {
            this.isSpeaking = false;
            this.currentUtterance = null;
          }
        };

        utterance.onerror = (event) => {
          // Only log if there's a meaningful error
          if (
            event.error &&
            event.error !== "interrupted" &&
            event.error !== "canceled"
          ) {
            console.error("Speech synthesis error:", event.error, event);
          }
          this.utteranceQueue.shift();
          if (this.utteranceQueue.length > 0 && this.isReady()) {
            try {
              this.synth.speak(this.utteranceQueue[0]);
            } catch (err) {
              console.error("Error speaking after error:", err);
              this.isSpeaking = false;
              this.currentUtterance = null;
            }
          } else {
            this.isSpeaking = false;
            this.currentUtterance = null;
          }
        };

        this.utteranceQueue.push(utterance);
      }
    });

    // Start speaking if not already speaking
    if (!this.isSpeaking && this.utteranceQueue.length > 0) {
      this.isSpeaking = true;
      this.currentUtterance = this.utteranceQueue[0];
      try {
        this.synth.speak(this.currentUtterance);
      } catch (err) {
        console.error("Error starting speech:", err);
        this.isSpeaking = false;
        this.currentUtterance = null;
      }
    }
  }

  /**
   * Flush any remaining text in the buffer
   */
  flushBuffer() {
    if (this.sentenceBuffer.trim()) {
      this.speakStream(". "); // Add a period to complete the sentence
    }
  }

  /**
   * Cancel all ongoing and queued speech
   */
  cancel() {
    if (!this.isReady()) return;

    try {
      this.synth.cancel();
    } catch (err) {
      console.error("Error canceling speech:", err);
    }

    this.isSpeaking = false;
    this.utteranceQueue = [];
    this.currentUtterance = null;
    this.sentenceBuffer = "";

    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }
  }

  /**
   * Check if currently speaking
   */
  get speaking(): boolean {
    return this.isSpeaking || (this.synth && this.synth.speaking);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Match sentences ending with . ! ? followed by space or end of string
    // This regex handles common abbreviations better
    const sentences: string[] = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [];

    // If there's remaining text without punctuation, add it as the last sentence
    const lastIndex = sentences.join("").length;
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      if (remaining.trim()) {
        sentences.push(remaining);
      }
    }

    return sentences;
  }
}

// Export a singleton instance
export const speechQueue = new SpeechSynthesisQueue();
