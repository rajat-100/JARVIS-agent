import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="app-header" aria-label="JARVIS assistant status">
      <div className="brand-mark" aria-hidden="true">
        J
      </div>
      <div>
        <p className="eyebrow">Personal agent</p>
        <h1>JARVIS</h1>
      </div>
      <div className="status-pill">
        <span aria-hidden="true" />
        Online
      </div>
    </header>
  );
};

export default Header;
