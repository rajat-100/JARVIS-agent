import React, { FormEvent, useMemo, useState } from 'react';
import Header from '../components/Header';

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
  const [input, setInput] = useState('');

  const currentTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    []
  );

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      return;
    }

    const nextUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: trimmedInput,
    };

    setMessages((currentMessages) => [...currentMessages, nextUserMessage]);
    setInput('');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedInput }),
      });
      const data = await response.json();

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'agent',
          text: data.reply,
        },
      ]);
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: 'agent',
          text: 'I could not reach my local reasoning layer yet, but the interface is ready for connection.',
        },
      ]);
    }
  };

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="JARVIS mobile app">
        <Header />

        <section className="briefing-panel">
          <div>
            <p className="eyebrow">Today</p>
            <h2>{currentTime}</h2>
          </div>
          <p>
            Build the personal AI command center: memory, daily planning, and
            conversational control.
          </p>
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

        <section className="chat-panel" aria-label="Conversation">
          <div className="chat-list">
            {messages.map((message) => (
              <p key={message.id} className={`message ${message.role}`}>
                {message.text}
              </p>
            ))}
          </div>

          <div className="quick-prompts" aria-label="Quick prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={handleSend}>
            <input
              aria-label="Message JARVIS"
              placeholder="Ask JARVIS anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" aria-label="Send message">
              Send
            </button>
          </form>
        </section>
      </section>
    </main>
  );
};

export default Home;
