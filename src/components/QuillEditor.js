'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'react-quill-new/dist/quill.snow.css';

export default function QuillEditor({ value, onChange, placeholder, minHeight = 120, onImageUpload }) {
  const [ReactQuill, setReactQuill] = useState(null);
  const reactQuillRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [menu, setMenu] = useState(null); // { x, y, img }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('react-quill-new').then(m => setReactQuill(() => m.default));
  }, []);

  const getQuill = useCallback(() => {
    const node = reactQuillRef.current;
    if (!node) return null;
    if (typeof node.getEditor === 'function') return node.getEditor();
    return node.editor || null;
  }, []);

  const handleImageClick = useCallback(() => {
    if (!onImageUpload) {
      alert('이미지 업로드가 지원되지 않습니다.');
      return;
    }
    fileInputRef.current?.click();
  }, [onImageUpload]);

  const onFileChosen = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const quill = getQuill();
    if (!quill) return;
    let range = quill.getSelection(true);
    if (!range) range = { index: quill.getLength(), length: 0 };
    try {
      const url = await onImageUpload(file);
      if (!url) return;
      quill.insertEmbed(range.index, 'image', url, 'user');
      quill.insertText(range.index + 1, '\n', 'user');
      quill.setSelection(range.index + 2, 0);
      // 마지막 삽입된 img에 기본 클래스 부여
      requestAnimationFrame(() => {
        const editorRoot = quill.root;
        const imgs = editorRoot?.querySelectorAll('img');
        const last = imgs && imgs[imgs.length - 1];
        if (last && !last.classList.contains('img-sm') && !last.classList.contains('img-md') && !last.classList.contains('img-lg')) {
          last.classList.add('img-md');
          // 클래스 추가 후 onChange 트리거
          if (onChange) onChange(quill.root.innerHTML);
        }
      });
    } catch (err) {
      console.error('image upload failed', err);
      alert('이미지 업로드에 실패했어요.');
    }
  }, [getQuill, onImageUpload, onChange]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link', 'image'],
        ['clean'],
      ],
      handlers: { image: handleImageClick },
    },
  }), [handleImageClick]);

  // 에디터 내 이미지 클릭 → 플로팅 메뉴
  useEffect(() => {
    if (!ReactQuill) return;
    const quill = getQuill();
    if (!quill) return;
    const root = quill.root;

    function onClick(ev) {
      const target = ev.target;
      if (target && target.tagName === 'IMG') {
        ev.preventDefault();
        const rect = target.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        setMenu({
          x: rect.right - containerRect.left,
          y: rect.top - containerRect.top,
          img: target,
        });
      } else {
        setMenu(null);
      }
    }
    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('click', onClick);
    };
  }, [ReactQuill, getQuill]);

  // unmount 정리
  useEffect(() => {
    return () => setMenu(null);
  }, []);

  const setSize = (cls) => {
    if (!menu?.img) return;
    menu.img.classList.remove('img-sm', 'img-md', 'img-lg');
    menu.img.classList.add(cls);
    const quill = getQuill();
    if (quill && onChange) onChange(quill.root.innerHTML);
    setMenu(null);
  };

  const removeImg = () => {
    if (!menu?.img) return;
    menu.img.parentElement?.removeChild(menu.img);
    const quill = getQuill();
    if (quill && onChange) onChange(quill.root.innerHTML);
    setMenu(null);
  };

  if (!ReactQuill) {
    return <div style={{ height: minHeight, background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 8 }} />;
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', minHeight }}>
      <ReactQuill
        ref={reactQuillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        style={{ minHeight }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChosen}
        style={{ display: 'none' }}
      />
      {menu && (
        <div style={{
          position: 'absolute', left: menu.x + 4, top: menu.y, zIndex: 50,
          background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 8,
          padding: 4, display: 'flex', gap: 4, boxShadow: 'var(--shadow)',
        }}>
          <button type="button" className="btn-sm btn-outline" onClick={() => setSize('img-sm')}>작게</button>
          <button type="button" className="btn-sm btn-outline" onClick={() => setSize('img-md')}>중간</button>
          <button type="button" className="btn-sm btn-outline" onClick={() => setSize('img-lg')}>크게</button>
          <button type="button" className="btn-sm btn-danger" onClick={removeImg}>삭제</button>
        </div>
      )}
    </div>
  );
}
