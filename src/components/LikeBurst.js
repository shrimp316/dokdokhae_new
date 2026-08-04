'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

function makeParticles() {
  const count = 6 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    angle: (360 / count) * i + (Math.random() * 24 - 12),
    distance: 14 + Math.random() * 10,
  }));
}

// Heart + burst renders inside an existing like <button>; it only reacts to
// `liked` flips that follow a click on itself, so async data loads (already
// liked on page load) never trigger a spurious burst.
export default function LikeBurst({ liked, likeCount, size = 14 }) {
  const [particles, setParticles] = useState([]);
  const [pulseKey, setPulseKey] = useState(0);
  const prevLiked = useRef(liked);
  const armedRef = useRef(false);

  useEffect(() => {
    const wasLiked = prevLiked.current;
    prevLiked.current = liked;
    if (!armedRef.current) return;
    armedRef.current = false;
    setPulseKey((k) => k + 1);
    if (liked && !wasLiked) {
      setParticles(makeParticles());
      const t = setTimeout(() => setParticles([]), 650);
      return () => clearTimeout(t);
    }
  }, [liked]);

  return (
    <span
      onClick={() => { armedRef.current = true; }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: liked ? 'var(--dd-accent)' : 'inherit',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <motion.span
          key={pulseKey}
          initial={{ scale: 0.75 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          style={{ display: 'inline-flex' }}
        >
          <Heart size={size} fill={liked ? 'currentColor' : 'none'} />
        </motion.span>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = Math.cos(rad) * p.distance;
          const y = Math.sin(rad) * p.distance;
          return (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: 0, x, y, scale: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 3.5, height: 3.5, marginTop: -1.75, marginLeft: -1.75,
                borderRadius: '50%', background: 'var(--dd-accent)', pointerEvents: 'none',
              }}
            />
          );
        })}
      </span>
      <span style={{ position: 'relative', display: 'inline-grid' }}>
        <motion.span
          key={likeCount}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{ gridArea: '1 / 1' }}
        >
          {likeCount}
        </motion.span>
      </span>
    </span>
  );
}
