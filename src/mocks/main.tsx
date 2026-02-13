import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot } from 'dialkit';
import 'dialkit/styles.css';
import { UnifiedBadgeMock } from '../content/mocks/UnifiedBadgeMock';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialRoot position="top-right" />
    <UnifiedBadgeMock />
  </StrictMode>
);
