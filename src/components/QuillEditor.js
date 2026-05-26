'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'react-quill-new/dist/quill.snow.css';

export default function QuillEditor({ value, onChange, placeholder, minHeight = 120, onImageUpload }) {
  const [ReactQuill, setReactQuill] = useState(null);
  const reactQuillRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [menu, setMenu] = useState(null); // { x, y, img }
  const isComposing = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

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

  // iOS 한글 IME 버그 수정: quill.root에 캡처 단계로 직접 부착해 Quill 내부 핸들러보다 먼저 실행
  useEffect(() => {
    if (!ReactQuill) return;
    const quill = getQuill();
    if (!quill) return;
    const root = quill.root;

    const onStart = () => { isComposing.current = true; };
    const onEnd = () => {
      isComposing.current = false;
      // compositionend 시 Quill의 onChange가 차단됐을 수 있으므로 직접 flush
      if (onChangeRef.current) onChangeRef.current(quill.root.innerHTML);
    };

    root.addEventListener('compositionstart', onStart, true);
    root.addEventListener('compositionend', onEnd, true);
    return () => {
      root.removeEventListener('compositionstart', onStart, true);
      root.removeEventListener('compositionend', onEnd, true);
    };
  }, [ReactQuill, getQuill]);

  // 에디터 내 이미지 클릭 → 플로팅 메뉴
  useEffect(() => {
    if (!ReactQuill) return;
    const quill = getQuill();
    if (!quill) return;
    const root = quill.root;

    function clearSelected() {
      root.querySelectorAll('img.is-selected').forEach(el => el.classList.remove('is-selected'));
    }

    function onClick(ev) {
      const target = ev.target;
      if (target && target.tagName === 'IMG') {
        ev.preventDefault();
        clearSelected();
        target.classList.add('is-selected');
        const rect = target.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        const MENU_W = 220;
        const MENU_H = 36;
        let x = rect.left - containerRect.left;
        x = Math.max(4, Math.min(x, containerRect.width - MENU_W - 4));
        let y = rect.top - containerRect.top - MENU_H - 6;
        if (y < 4) y = rect.bottom - containerRect.top + 6;
        setMenu({ x, y, img: target });
      } else {
        clearSelected();
        setMenu(null);
      }
    }
    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('click', onClick);
      clearSelected();
    };
  }, [ReactQuill, getQuill]);

  // unmount 정리
  useEffect(() => {
    return () => setMenu(null);
  }, []);

  const handleChange = useCallback((val) => {
    if (isComposing.current) return;
    if (onChange) onChange(val);
  }, [onChange]);

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
    <div
      ref={containerRef}
      style={{ position: 'relative', minHeight }}
    >
      <ReactQuill
        ref={reactQuillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        style={{ minHeight }}
      />
      {onImageUpload && (
        <div style={{
          fontSize: 11, color: 'var(--muted)', padding: '6px 10px',
          borderLeft: '1.5px solid var(--line)',
          borderRight: '1.5px solid var(--line)',
          borderBottom: '1.5px solid var(--line)',
          borderRadius: '0 0 8px 8px',
          background: 'var(--tag-bg)',
        }}>
          💡 이미지를 본문에 클릭하면 크기(작게/중간/크게)와 삭제 메뉴가 표시됩니다.
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChosen}
        style={{ display: 'none' }}
      />
      {menu && (
        <div style={{
          position: 'absolute', left: menu.x, top: menu.y, zIndex: 50,
          background: 'var(--card)', border: '1.5px solid var(--accent)', borderRadius: 8,
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
