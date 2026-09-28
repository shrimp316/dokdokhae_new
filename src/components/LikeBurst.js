'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import styles from './LikeBurst.module.css';

function makeParticles() {
  const count = 6 + Math.floor(Math.random() * 3);
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    angle: (360 / count) * i + (Math.random() * 24 - 12),
    distance: 14 + Math.random() * 10,
  }));
}

// 좋아요 버튼 안에 넣는 하트 애니메이션. 직접 누른 뒤의 liked 변화에만 반응해서,
// 이미 좋아요한 글을 불러올 때(비동기 로드)는 터지지 않게 한다.
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
      className={styles.wrap}
      data-liked={liked || undefined}
    >
      <span className={styles.heartWrap}>
        <motion.span
          key={pulseKey}
          initial={{ scale: 0.75 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className={styles.heartPulse}
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
              className={styles.particle}
            />
          );
        })}
      </span>
      <span className={styles.countWrap}>
        <motion.span
          key={likeCount}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className={styles.countItem}
        >
          {likeCount}
        </motion.span>
      </span>
    </span>
  );
}
