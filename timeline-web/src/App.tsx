import { Canvas } from '@react-three/fiber';
import { Timeline } from './Timeline';
import { useState, useCallback } from 'react';

interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category: string;
  key_facts: string[];
}

// Sample events - in production, loaded from timeline-events.json via postMessage
const SAMPLE_EVENTS: TimelineEvent[] = [
  { id: '1', year: 43, title: 'Roman Invasion', description: 'Emperor Claudius invaded Britain, beginning nearly 400 years of Roman rule.', category: 'history', key_facts: ['Built Hadrian\'s Wall', 'Introduced roads and towns'] },
  { id: '2', year: 1066, title: 'Battle of Hastings', description: 'William the Conqueror defeated King Harold II, changing England forever.', category: 'history', key_facts: ['Last successful invasion of England', 'Recorded in Bayeux Tapestry'] },
  { id: '3', year: 1215, title: 'Magna Carta', description: 'King John signed the Magna Carta, establishing the principle that everyone is subject to the law.', category: 'values', key_facts: ['Foundation of constitutional law', 'Signed at Runnymede'] },
  { id: '4', year: 1534, title: 'Church of England', description: 'Henry VIII broke with Rome and established the Church of England.', category: 'history', key_facts: ['Act of Supremacy', 'Led to dissolution of monasteries'] },
  { id: '5', year: 1588, title: 'Spanish Armada', description: 'England defeated the Spanish Armada, becoming a major naval power.', category: 'history', key_facts: ['Elizabeth I was queen', 'Established England as naval power'] },
  { id: '6', year: 1642, title: 'English Civil War', description: 'Civil war between Parliamentarians and Royalists.', category: 'history', key_facts: ['Oliver Cromwell led Parliament', 'Charles I was executed in 1649'] },
  { id: '7', year: 1689, title: 'Bill of Rights', description: 'The Bill of Rights established Parliament\'s supremacy over the monarchy.', category: 'government', key_facts: ['Constitutional monarchy established', 'Free elections guaranteed'] },
  { id: '8', year: 1707, title: 'Act of Union', description: 'Scotland and England united to form Great Britain.', category: 'government', key_facts: ['Created unified Parliament', 'Scotland kept its legal system'] },
  { id: '9', year: 1776, title: 'American Independence', description: 'The American colonies declared independence from Britain.', category: 'history', key_facts: ['13 colonies broke away', 'Treaty of Paris in 1783'] },
  { id: '10', year: 1807, title: 'Abolition of Slave Trade', description: 'The slave trade was abolished throughout the British Empire.', category: 'values', key_facts: ['William Wilberforce campaigned for this', 'Full emancipation in 1833'] },
  { id: '11', year: 1837, title: 'Victorian Era Begins', description: 'Queen Victoria began her 63-year reign, the longest until Elizabeth II.', category: 'history', key_facts: ['Industrial Revolution expanded', 'British Empire grew'] },
  { id: '12', year: 1918, title: 'Women\'s Suffrage', description: 'Women over 30 gained the right to vote. Extended to all women over 21 in 1928.', category: 'values', key_facts: ['Suffragettes campaigned for decades', 'Emmeline Pankhurst led the movement'] },
  { id: '13', year: 1948, title: 'NHS Founded', description: 'The National Health Service was established, providing free healthcare to all.', category: 'everyday', key_facts: ['Aneurin Bevan was key figure', 'Free at the point of use'] },
  { id: '14', year: 1973, title: 'Joined EEC', description: 'The UK joined the European Economic Community (later EU).', category: 'government', key_facts: ['Remained member until 2020', 'Referendum in 1975 confirmed membership'] },
  { id: '15', year: 2012, title: 'London Olympics', description: 'London hosted the Olympic Games for the third time.', category: 'traditions', key_facts: ['Team GB won 65 medals', 'Danny Boyle directed opening ceremony'] },
];

export function App() {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const handleEventSelect = useCallback((event: TimelineEvent) => {
    setSelectedEvent(event);
    // Send to React Native
    try {
      (window as any).ReactNativeWebView?.postMessage(
        JSON.stringify({ type: 'event_selected', payload: event })
      );
    } catch {}
  }, []);

  const handleBack = () => {
    try {
      (window as any).ReactNativeWebView?.postMessage(
        JSON.stringify({ type: 'navigate_back' })
      );
    } catch {
      window.history.back();
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 60 }}
        style={{ background: '#0a0a1a' }}
      >
        <Timeline events={SAMPLE_EVENTS} onSelect={handleEventSelect} />
      </Canvas>

      {/* UI Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={handleBack} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
          backdropFilter: 'blur(10px)',
        }}>
          ← Back
        </button>
        <span style={{ color: '#ffffff88', fontSize: '13px' }}>Scroll to explore</span>
      </div>

      {/* Selected event detail */}
      {selectedEvent && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(10,10,26,0.95))',
          padding: '40px 20px 20px',
          color: '#fff',
        }}>
          <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, marginBottom: '4px' }}>
            {selectedEvent.year}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            {selectedEvent.title}
          </div>
          <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '12px' }}>
            {selectedEvent.description}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selectedEvent.key_facts.map((fact, i) => (
              <span key={i} style={{
                background: 'rgba(129,140,248,0.15)', color: '#a5b4fc',
                padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
              }}>
                {fact}
              </span>
            ))}
          </div>
          <button
            onClick={() => setSelectedEvent(null)}
            style={{
              marginTop: '12px', background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
