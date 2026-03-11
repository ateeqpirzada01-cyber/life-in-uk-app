import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Float, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';

interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category: string;
  key_facts: string[];
}

interface TimelineProps {
  events: TimelineEvent[];
  onSelect: (event: TimelineEvent) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  history: '#ef4444',
  government: '#3b82f6',
  traditions: '#f59e0b',
  values: '#10b981',
  everyday: '#8b5cf6',
};

export function Timeline({ events, onSelect }: TimelineProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { camera } = useThree();

  // Create a curved path for the timeline
  const curve = useMemo(() => {
    const points = events.map((_, i) => {
      const t = i / (events.length - 1);
      const x = Math.sin(t * Math.PI * 2) * 3;
      const y = t * 2 - 1;
      const z = -t * events.length * 2;
      return new THREE.Vector3(x, y, z);
    });
    return new THREE.CatmullRomCurve3(points);
  }, [events]);

  // Get points along the curve for the ribbon
  const curvePoints = useMemo(() => {
    return curve.getPoints(100).map(p => [p.x, p.y, p.z] as [number, number, number]);
  }, [curve]);

  // Handle scroll/touch to move along the timeline
  useFrame(() => {
    if (!groupRef.current) return;

    // Smoothly interpolate camera position along curve
    const t = Math.max(0, Math.min(1, scrollProgress));
    const pos = curve.getPoint(t);
    const lookAt = curve.getPoint(Math.min(1, t + 0.05));

    camera.position.lerp(new THREE.Vector3(pos.x + 2, pos.y + 1.5, pos.z + 4), 0.05);
    const target = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
    camera.lookAt(target);
  });

  // Listen for scroll/touch events
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    setScrollProgress(prev => Math.max(0, Math.min(1, prev + e.deltaY * 0.001)));
  };

  // Attach wheel listener
  const { gl } = useThree();
  useMemo(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dy = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      setScrollProgress(prev => Math.max(0, Math.min(1, prev + dy * 0.003)));
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [gl]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />

      {/* Timeline ribbon */}
      <Line
        points={curvePoints}
        color="#818cf8"
        lineWidth={2}
        opacity={0.4}
        transparent
      />

      {/* Event nodes */}
      <group ref={groupRef}>
        {events.map((event, i) => {
          const t = i / (events.length - 1);
          const pos = curve.getPoint(t);
          const color = CATEGORY_COLORS[event.category] || '#818cf8';

          return (
            <EventNode
              key={event.id}
              event={event}
              position={[pos.x, pos.y, pos.z]}
              color={color}
              onSelect={onSelect}
            />
          );
        })}
      </group>
    </>
  );
}

function EventNode({
  event,
  position,
  color,
  onSelect,
}: {
  event: TimelineEvent;
  position: [number, number, number];
  color: string;
  onSelect: (event: TimelineEvent) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={position}>
        {/* Glowing sphere */}
        <mesh
          ref={meshRef}
          onClick={() => onSelect(event)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={hovered ? 1.3 : 1}
        >
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.3}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Year label */}
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {event.year.toString()}
        </Text>

        {/* Title label */}
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.12}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {event.title}
        </Text>

        {/* Glow effect */}
        <pointLight
          position={[0, 0, 0]}
          color={color}
          intensity={hovered ? 2 : 0.5}
          distance={3}
        />
      </group>
    </Float>
  );
}
