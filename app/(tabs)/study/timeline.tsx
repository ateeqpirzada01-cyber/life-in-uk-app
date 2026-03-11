import { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/useTheme';
import { TimelineEvent } from '@/src/types';

const timelineEvents: TimelineEvent[] = require('@/assets/data/timeline-events.json');

export default function TimelineScreen() {
  const colors = useTheme();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate_back') {
        router.back();
      }
    } catch {}
  };

  // Sort events by year and inject them into the WebView
  const sortedEvents = [...timelineEvents].sort((a, b) => a.year - b.year);
  const eventsJSON = JSON.stringify(sortedEvents);

  const injectedJS = `
    window.TIMELINE_EVENTS = ${eventsJSON};
    if (window.initTimeline) window.initTimeline();
    true;
  `;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a1a' }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#818cf8" />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: getTimelineHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        injectedJavaScript={injectedJS}
        onLoad={() => setLoading(false)}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />
    </SafeAreaView>
  );
}

function getTimelineHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body {
  background: #0a0a1a;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}

.header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 12px 16px;
  display: flex; justify-content: space-between; align-items: center;
  background: linear-gradient(to bottom, #0a0a1aee, #0a0a1acc, transparent);
}
.back-btn {
  background: rgba(255,255,255,0.1); border: none; color: #fff;
  padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.hint { color: #ffffff66; font-size: 12px; }

.era-label {
  position: fixed; top: 54px; left: 0; right: 0; text-align: center;
  z-index: 90; pointer-events: none;
  font-size: 13px; letter-spacing: 3px; text-transform: uppercase;
  color: #818cf8aa; transition: all 0.5s;
  font-weight: 600;
}

.timeline-container {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.timeline-track {
  position: absolute;
  left: 24px;
  width: 3px;
  background: linear-gradient(to bottom, transparent, #818cf840, #818cf840, transparent);
  transition: top 0.1s;
  border-radius: 2px;
}

.events-wrapper {
  position: absolute;
  left: 0; right: 0;
  transition: transform 0.15s ease-out;
}

.event-node {
  position: absolute;
  left: 0; right: 0;
  padding: 10px 16px 10px 48px;
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  transition: top 0.3s ease, opacity 0.3s;
}

.event-dot-wrapper {
  position: absolute;
  left: 17px;
  top: 18px;
  z-index: 10;
}
.event-dot {
  width: 16px; height: 16px; border-radius: 8px;
  border: 3px solid; transition: all 0.3s;
  box-shadow: 0 0 10px;
}
.event-dot.active { width: 20px; height: 20px; border-radius: 10px; }

.event-card {
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s;
}

.event-card.active {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(129, 140, 248, 0.3);
}

.event-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.event-img {
  width: 56px; height: 56px; border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(255,255,255,0.05);
}
.event-img-placeholder {
  width: 56px; height: 56px; border-radius: 10px;
  flex-shrink: 0;
  background: rgba(129, 140, 248, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
}
.event-card.active .event-img,
.event-card.active .event-img-placeholder {
  width: 80px; height: 80px; border-radius: 12px;
}
.event-card.active .event-img-placeholder { font-size: 32px; }

.event-header-text { flex: 1; min-width: 0; }

.event-year {
  font-size: 12px; font-weight: 700; letter-spacing: 1px;
  margin-bottom: 2px; transition: color 0.3s;
}
.event-title {
  font-size: 15px; font-weight: 600; color: #f1f5f9;
  line-height: 1.35;
}
.event-desc {
  font-size: 13px; color: #94a3b8; line-height: 1.6;
  display: none; margin-top: 8px;
}
.event-card.active .event-desc { display: block; }

.event-facts {
  display: none; flex-wrap: wrap; gap: 6px; margin-top: 8px;
}
.event-card.active .event-facts { display: flex; }
.fact-tag {
  background: rgba(129, 140, 248, 0.12); color: #a5b4fc;
  padding: 4px 10px; border-radius: 8px; font-size: 11px;
  line-height: 1.3;
}

.cat-history { --cat-color: #ef4444; }
.cat-government { --cat-color: #3b82f6; }
.cat-traditions { --cat-color: #f59e0b; }
.cat-values { --cat-color: #10b981; }
.cat-everyday { --cat-color: #8b5cf6; }

/* Stars */
.stars {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  z-index: -1; overflow: hidden;
}
.star {
  position: absolute; width: 2px; height: 2px;
  background: #fff; border-radius: 50%;
  animation: twinkle var(--dur) ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: var(--min-op); }
  50% { opacity: var(--max-op); }
}

/* Year indicator */
.year-indicator {
  position: fixed; right: 8px; top: 50%; transform: translateY(-50%);
  z-index: 100; display: flex; flex-direction: column;
  align-items: flex-end; gap: 2px;
}
.year-marker {
  width: 6px; height: 6px; border-radius: 3px;
  background: rgba(255,255,255,0.15); cursor: pointer;
  transition: all 0.2s;
}
.year-marker.active {
  width: 20px; background: #818cf8;
}
</style>
</head>
<body>
<div class="stars" id="stars"></div>

<div class="header">
  <button class="back-btn" onclick="goBack()">← Back</button>
  <span class="hint">Swipe to explore</span>
</div>

<div class="era-label" id="eraLabel"></div>

<div class="timeline-container" id="container">
  <div class="timeline-track" id="track"></div>
  <div class="events-wrapper" id="eventsWrapper"></div>
</div>

<div class="year-indicator" id="yearIndicator"></div>

<script>
let events = [];
let imageMap = {};
let scrollY = 0;
let targetScrollY = 0;
let activeIndex = -1;
const NODE_HEIGHT = 130;
const ACTIVE_EXTRA = 140;

// Map image filenames to emoji fallbacks for categories
const catEmoji = {
  history: '⚔️',
  government: '🏛️',
  traditions: '🎭',
  values: '⚖️',
  everyday: '🏠'
};

function goBack() {
  try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'navigate_back'})); }
  catch(e) { window.history.back(); }
}

function createStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 60; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
    star.style.setProperty('--min-op', (0.1 + Math.random() * 0.2).toString());
    star.style.setProperty('--max-op', (0.5 + Math.random() * 0.5).toString());
    container.appendChild(star);
  }
}

function getEra(year) {
  if (year < 0) return 'Prehistoric Britain';
  if (year < 410) return 'Roman Britain';
  if (year < 1066) return 'Anglo-Saxon & Viking';
  if (year < 1485) return 'Medieval Period';
  if (year < 1603) return 'Tudor Era';
  if (year < 1714) return 'Stuart Period';
  if (year < 1837) return 'Georgian Era';
  if (year < 1901) return 'Victorian Era';
  if (year < 1945) return 'Early 20th Century';
  return 'Modern Britain';
}

function formatYear(year) {
  if (year < 0) return Math.abs(year) + ' BC';
  return year + ' AD';
}

function getNodeHeight(index) {
  return index === activeIndex ? NODE_HEIGHT + ACTIVE_EXTRA : NODE_HEIGHT;
}

function getNodeTop(index) {
  let top = 0;
  for (let i = 0; i < index; i++) {
    top += getNodeHeight(i);
  }
  return top;
}

function getTotalHeight() {
  let h = 0;
  for (let i = 0; i < events.length; i++) h += getNodeHeight(i);
  return h;
}

function renderTimeline() {
  const wrapper = document.getElementById('eventsWrapper');
  const indicator = document.getElementById('yearIndicator');
  wrapper.innerHTML = '';
  indicator.innerHTML = '';

  events.forEach((event, i) => {
    const node = document.createElement('div');
    node.className = 'event-node cat-' + event.category;
    node.style.height = NODE_HEIGHT + 'px';
    node.id = 'node-' + i;
    node.onclick = function() { toggleEvent(i); };

    const dot = document.createElement('div');
    dot.className = 'event-dot-wrapper';
    dot.innerHTML = '<div class="event-dot" style="border-color:var(--cat-color);box-shadow:0 0 10px var(--cat-color);"></div>';

    const card = document.createElement('div');
    card.className = 'event-card';
    card.id = 'card-' + i;

    let factsHTML = '';
    if (event.key_facts) {
      factsHTML = '<div class="event-facts">' +
        event.key_facts.map(function(f) { return '<span class="fact-tag">' + f + '</span>'; }).join('') +
        '</div>';
    }

    const emoji = catEmoji[event.category] || '📜';
    const imgHTML = '<div class="event-img-placeholder">' + emoji + '</div>';

    card.innerHTML =
      '<div class="event-card-header">' +
        imgHTML +
        '<div class="event-header-text">' +
          '<div class="event-year" style="color:var(--cat-color)">' + formatYear(event.year) + '</div>' +
          '<div class="event-title">' + event.title + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="event-desc">' + event.description + '</div>' +
      factsHTML;

    node.appendChild(dot);
    node.appendChild(card);
    wrapper.appendChild(node);

    const marker = document.createElement('div');
    marker.className = 'year-marker';
    marker.title = formatYear(event.year);
    marker.onclick = function(e) {
      e.stopPropagation();
      targetScrollY = getNodeTop(i) - window.innerHeight / 2 + NODE_HEIGHT / 2;
    };
    marker.id = 'marker-' + i;
    indicator.appendChild(marker);
  });

  updateLayout();
}

function updateLayout() {
  const totalH = getTotalHeight();
  const track = document.getElementById('track');
  track.style.height = totalH + 'px';

  // Position each node absolutely so expanded cards push others down
  let top = 0;
  events.forEach(function(e, i) {
    const node = document.getElementById('node-' + i);
    if (node) {
      const h = getNodeHeight(i);
      node.style.top = top + 'px';
      node.style.height = h + 'px';
      top += h;
    }
  });

  // Update wrapper height so scroll range is correct
  const wrapper = document.getElementById('eventsWrapper');
  if (wrapper) wrapper.style.height = totalH + 'px';
}

function toggleEvent(index) {
  if (activeIndex === index) {
    document.getElementById('card-' + index).classList.remove('active');
    activeIndex = -1;
  } else {
    if (activeIndex >= 0) {
      const prev = document.getElementById('card-' + activeIndex);
      if (prev) prev.classList.remove('active');
    }
    document.getElementById('card-' + index).classList.add('active');
    activeIndex = index;
    targetScrollY = getNodeTop(index) - window.innerHeight / 3;
  }
  updateLayout();
}

function updateScroll() {
  scrollY += (targetScrollY - scrollY) * 0.12;
  const totalH = getTotalHeight();
  const maxScroll = Math.max(0, totalH - window.innerHeight + 100);
  scrollY = Math.max(-50, Math.min(maxScroll, scrollY));
  targetScrollY = Math.max(-50, Math.min(maxScroll, targetScrollY));

  const wrapper = document.getElementById('eventsWrapper');
  wrapper.style.transform = 'translateY(' + (-scrollY + 80) + 'px)';

  // Update era label based on center position
  let accum = 0;
  let ci = 0;
  const centerY = scrollY + window.innerHeight / 2;
  for (let i = 0; i < events.length; i++) {
    accum += getNodeHeight(i);
    if (accum > centerY) { ci = i; break; }
    ci = i;
  }

  if (events[ci]) {
    document.getElementById('eraLabel').textContent = getEra(events[ci].year);
  }

  for (let i = 0; i < events.length; i++) {
    const marker = document.getElementById('marker-' + i);
    if (marker) marker.classList.toggle('active', i === ci);
  }

  requestAnimationFrame(updateScroll);
}

// Touch handling
let touchStartY = 0;
let touchVelocity = 0;
let lastTouchY = 0;
let lastTouchTime = 0;

document.addEventListener('touchstart', function(e) {
  touchStartY = e.touches[0].clientY;
  lastTouchY = touchStartY;
  lastTouchTime = Date.now();
  touchVelocity = 0;
}, { passive: true });

document.addEventListener('touchmove', function(e) {
  e.preventDefault();
  const y = e.touches[0].clientY;
  const dy = lastTouchY - y;
  const dt = Date.now() - lastTouchTime;
  touchVelocity = dt > 0 ? dy / dt * 16 : 0;
  targetScrollY += dy;
  lastTouchY = y;
  lastTouchTime = Date.now();
}, { passive: false });

document.addEventListener('touchend', function() {
  targetScrollY += touchVelocity * 8;
}, { passive: true });

document.addEventListener('wheel', function(e) {
  e.preventDefault();
  targetScrollY += e.deltaY * 0.8;
}, { passive: false });

window.initTimeline = function() {
  events = window.TIMELINE_EVENTS || [];
  createStars();
  renderTimeline();
  requestAnimationFrame(updateScroll);
};

if (window.TIMELINE_EVENTS) {
  window.initTimeline();
}
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0a0a1a' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#818cf8',
    fontSize: 14,
    marginTop: 12,
  },
});
