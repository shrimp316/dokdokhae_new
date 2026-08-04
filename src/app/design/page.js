'use client';
import { useState } from 'react';
import { Button, Input, Chip, Tabs, Alert, Card } from '@/components/ui';
import { Search, AlertTriangle, Lightbulb } from 'lucide-react';

const PREFIX_CHIPS = ['전체', '공지', '후기', '질문', '잡담'];

export default function DesignSystemShowcase() {
  const [tab, setTab] = useState('button');
  const [selectedChip, setSelectedChip] = useState('전체');
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 'var(--ds-font-h1)', lineHeight: 'var(--ds-lh-h1)', fontWeight: 700, marginBottom: 4 }}>
          dokdokhae Design System
        </h1>
        <p style={{ fontSize: 'var(--ds-font-body2)', lineHeight: 'var(--ds-lh-body2)', color: 'var(--ds-color-text-secondary)' }}>
          UI primitives showcase — Button / Input / Chip / Tabs / Alert / Card
        </p>
      </header>

      <Tabs
        ariaLabel="컴포넌트 카테고리"
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'button', label: 'Button' },
          { key: 'input', label: 'Input' },
          { key: 'chip', label: 'Chip' },
          { key: 'alert', label: 'Alert' },
          { key: 'card', label: 'Card' },
        ]}
      />

      {tab === 'button' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 'var(--ds-font-h2)', lineHeight: 'var(--ds-lh-h2)', fontWeight: 500 }}>Button</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Button onClick={() => alert('default click')}>기본 버튼</Button>
            <Button disabled>비활성</Button>
            <Button variant="disabled">disabled prop variant</Button>
          </div>
        </section>
      )}

      {tab === 'input' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 'var(--ds-font-h2)', lineHeight: 'var(--ds-lh-h2)', fontWeight: 500 }}>Input</h2>
          <Input
            variant="outlined"
            placeholder="outlined input"
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
          />
          <Input
            variant="filled"
            placeholder="filled input"
            value={input2}
            onChange={(e) => setInput2(e.target.value)}
          />
          <Input
            variant="elevated"
            placeholder="검색어를 입력하세요"
            value={input3}
            onChange={(e) => setInput3(e.target.value)}
            icon={<span aria-label="검색"><Search size={16} /></span>}
          />
        </section>
      )}

      {tab === 'chip' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 'var(--ds-font-h2)', lineHeight: 'var(--ds-lh-h2)', fontWeight: 500 }}>Chip</h2>
          <p style={{ fontSize: 'var(--ds-font-caption)', color: 'var(--ds-color-text-secondary)' }}>
            선택된 칩은 primary 컬러로 표시됩니다.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PREFIX_CHIPS.map((c) => (
              <Chip
                key={c}
                selected={selectedChip === c}
                onClick={() => setSelectedChip(c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {tab === 'alert' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 'var(--ds-font-h2)', lineHeight: 'var(--ds-lh-h2)', fontWeight: 500 }}>Alert</h2>
          <Alert variant="default" icon={<span>ℹ️</span>}>
            기본 알림 메시지입니다.
          </Alert>
          <Alert variant="warning" icon={<span><AlertTriangle size={16} /></span>}>
            주의 — 좌측 4px primary 보더로 강조됩니다.
          </Alert>
          <Alert variant="info" icon={<span><Lightbulb size={16} /></span>}>
            정보 안내 메시지입니다.
          </Alert>
        </section>
      )}

      {tab === 'card' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 'var(--ds-font-h2)', lineHeight: 'var(--ds-lh-h2)', fontWeight: 500 }}>Card</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Card.Image />
                <Card.Text width="80%" />
                <Card.Text width="60%" />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
