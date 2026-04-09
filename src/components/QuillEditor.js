'use client';
import { useEffect, useRef } from 'react';
import 'react-quill-new/dist/quill.snow.css';

export default function QuillEditor({ value, onChange, placeholder, minHeight = 120 }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('react-quill-new').then(({ default: ReactQuill }) => {
      if (!editorRef.current || quillRef.current) return;
      const ReactDOM = require('react-dom/client');
      // react-quill-new는 직접 import해서 JSX로 렌더
    });
  }, []);

  return (
    <div style={{ minHeight }}>
      <DynamicQuill value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
    </div>
  );
}

function DynamicQuill({ value, onChange, placeholder, minHeight }) {
  const [ReactQuill, setReactQuill] = require('react').useState(null);

  require('react').useEffect(() => {
    import('react-quill-new').then(m => setReactQuill(() => m.default));
  }, []);

  if (!ReactQuill) return <div style={{ height: minHeight, background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 8 }} />;

  const modules = {
    toolbar: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'link', 'image'],
      ['clean'],
    ],
  };

  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      modules={modules}
      style={{ minHeight }}
    />
  );
}
