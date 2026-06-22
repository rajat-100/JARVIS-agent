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

type MemoryRecord = {
  id: string;
  category: string;
  content: string;
};

const quickPrompts = [
  'What do you know about me?',
  'Remember that I prefer voice-first replies',
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
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const selectedVoiceNameRef = useRef('');

  const currentTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    []
  );

  const refreshMemories = async () => {
    try {
      const response = await fetch('/api/memory');
      const data = await response.json();
      setMemories(data.memories || []);
    } catch {
      setVoiceError('Memory is not available yet.');
    }
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voicesRef.current.find(
      (voice) => voice.name === selectedVoiceNameRef.current
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

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

      if (typeof data.memoryCount === 'number') {
        void refreshMemories();
      }

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

    void refreshMemories();

    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        voicesRef.current = availableVoices;
        setVoices(availableVoices);

        const savedVoiceName = window.localStorage.getItem('jarvis-voice-name');
        const preferredVoice =
          availableVoices.find((voice) => voice.name === savedVoiceName) ||
          availableVoices.find((voice) => voice.lang.toLowerCase().startsWith('en-in')) ||
          availableVoices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
          availableVoices[0];

        if (preferredVoice) {
          selectedVoiceNameRef.current = preferredVoice.name;
          setSelectedVoiceName(preferredVoice.name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
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
      window.speechSynthesis.onvoiceschanged = null;
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

  const handleVoiceChange = (voiceName: string) => {
    selectedVoiceNameRef.current = voiceName;
    setSelectedVoiceName(voiceName);
    window.localStorage.setItem('jarvis-voice-name', voiceName);

    const previewVoice = voices.find((voice) => voice.name === voiceName);
    if (previewVoice) {
      window.speechSynthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance('Voice profile updated.');
      utterance.voice = previewVoice;
      utterance.lang = previewVoice.lang;
      utterance.rate = 0.95;
      utterance.pitch = 0.85;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
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

          <label className="voice-picker">
            <span>Voice</span>
            <select
              value={selectedVoiceName}
              onChange={(event) => handleVoiceChange(event.target.value)}
            >
              {voices.length === 0 ? (
                <option value="">System default</option>
              ) : (
                voices.map((voice) => (
                  <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))
              )}
            </select>
          </label>
        </section>

        <section className="metrics-grid" aria-label="Agent modules">
          <article>
            <span>Memory</span>
            <strong>{memories.length}</strong>
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

          {memories.length > 0 ? (
            <div className="memory-strip" aria-label="Recent memories">
              {memories.slice(0, 3).map((memory) => (
                <span key={memory.id}>{memory.content}</span>
              ))}
            </div>
          ) : null}

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
