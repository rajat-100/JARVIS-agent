import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type Message = {
  id: number;
  role: 'agent' | 'user';
  text: string;
};

const quickPrompts = [
  'Plan my day',
  'Remember an idea',
  'Summarize my goals',
  'Check priorities',
];

const starterMessages: Message[] = [
  {
    id: 1,
    role: 'agent',
    text: 'Good evening, Rajat. I am ready to learn your routines, track your goals, and help you move faster.',
  },
  {
    id: 2,
    role: 'user',
    text: 'Start with a mobile app experience for my personal AI agent.',
  },
  {
    id: 3,
    role: 'agent',
    text: 'Understood. I will keep the interface focused: talk, memory, tasks, and daily briefings first.',
  },
];

const Home: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [draftTranscript, setDraftTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const currentTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    []
  );

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.85;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const sendVoiceMessage = async (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) {
      return;
    }

    const nextUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: trimmedTranscript,
    };

    setMessages((currentMessages) => [...currentMessages, nextUserMessage]);
    setDraftTranscript('');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedTranscript }),
      });
      const data = await response.json();
      const reply = data.reply || 'I heard you, but I do not have a response yet.';

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'agent',
          text: reply,
        },
      ]);
      speak(reply);
    } catch {
      const fallbackReply =
        'I could not reach my local reasoning layer yet, but my voice interface is ready.';

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'agent',
          text: fallbackReply,
        },
      ]);
      speak(fallbackReply);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setDraftTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        recognition.stop();
        void sendVoiceMessage(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceError(`Voice input stopped: ${event.error}.`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setVoiceError('Voice input is not ready in this browser.');
      return;
    }

    setVoiceError('');

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setDraftTranscript('');
    recognition.start();
    setIsListening(true);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="JARVIS mobile app">
        <Header />

        <section className="voice-panel" aria-label="Voice assistant controls">
          <div>
            <p className="eyebrow">Today</p>
            <h2>{currentTime}</h2>
          </div>

          <button
            className={`voice-orb ${isListening ? 'listening' : ''} ${
              isSpeaking ? 'speaking' : ''
            }`}
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <span>{isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Talk'}</span>
          </button>

          <div className="voice-status" aria-live="polite">
            <strong>
              {isListening
                ? 'I am listening...'
                : isSpeaking
                ? 'Speaking response'
                : 'Tap and speak'}
            </strong>
            <p>
              {draftTranscript ||
                voiceError ||
                'Your voice becomes the command. JARVIS replies out loud.'}
            </p>
          </div>

          {isSpeaking ? (
            <button className="quiet-button" type="button" onClick={stopSpeaking}>
              Stop voice
            </button>
          ) : null}
        </section>

        <section className="metrics-grid" aria-label="Agent modules">
          <article>
            <span>Memory</span>
            <strong>12</strong>
          </article>
          <article>
            <span>Tasks</span>
            <strong>04</strong>
          </article>
          <article>
            <span>Focus</span>
            <strong>82%</strong>
          </article>
        </section>

        <section className="chat-panel" aria-label="Voice transcript">
          <div className="transcript-heading">
            <div>
              <p className="eyebrow">Transcript</p>
              <h3>Recent voice exchange</h3>
            </div>
          </div>

          <div className="chat-list">
            {messages.map((message) => (
              <p key={message.id} className={`message ${message.role}`}>
                {message.text}
              </p>
            ))}
          </div>

          <div className="quick-prompts" aria-label="Quick prompts">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  void sendVoiceMessage(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};

export default Home;
