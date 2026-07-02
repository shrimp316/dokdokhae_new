'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'react-quill-new/dist/quill.snow.css';

// 빈 에디터 정규화: Quill 기본 빈 상태('<p><br></p>')와 ''를 동일하게 취급
const normalizeHtml = (html) => (!html || html === '<p><br></p>') ? '' : html;

export default function QuillEditor({ value, onChange, placeholder, minHeight = 120, onImageUpload }) {
  const [ReactQuill, setReactQuill] = useState(null);
  const reactQuillRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [menu, setMenu] = useState(null); // { x, y, img }
  const isComposing = useRef(false);
  // 사용자 입력으로 인한 변경 여부 추적 — true이면 value prop 변경이 자기 자신이 발생시킨 것
  const isSelfChange = useRef(false);
  // onImageUpload/onChange는 페이지에서 인라인 함수로 넘어와 매 렌더마다 참조가 바뀜.
  // ref로 우회해서 handleImageClick(→modules)이 항상 같은 참조를 유지하도록 함 —
  // modules 참조가 바뀌면 react-quill-new가 Quill 인스턴스를 통째로 destroy/재생성해서
  // 타이핑 중(특히 한글 조합 중)에 그 타이밍과 겹치면 자음분리가 발생함.
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('react-quill-new').then(m => setReactQuill(() => m.default));
  }, []);

  const getQuill = useCallback(() => {
    const node = reactQuillRef.current;
    if (!node) return null;
    try {
      if (typeof node.getEditor === 'function') return node.getEditor();
    } catch {
      return null;
    }
    return node.editor || null;
  }, []);

  const handleImageClick = useCallback(() => {
    if (!onImageUploadRef.current) {
      alert('이미지 업로드가 지원되지 않습니다.');
      return;
    }
    fileInputRef.current?.click();
  }, []);

  const onFileChosen = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const quill = getQuill();
    if (!quill) return;
    let range = quill.getSelection(true);
    if (!range) range = { index: quill.getLength(), length: 0 };
    try {
      const url = await onImageUploadRef.current(file);
      if (!url) return;
      quill.insertEmbed(range.index, 'image', url, 'user');
      quill.insertText(range.index + 1, '\n', 'user');
      quill.setSelection(range.index + 2, 0);
      requestAnimationFrame(() => {
        const editorRoot = quill.root;
        const imgs = editorRoot?.querySelectorAll('img');
        const last = imgs && imgs[imgs.length - 1];
        if (last && !last.classList.contains('img-sm') && !last.classList.contains('img-md') && !last.classList.contains('img-lg')) {
          last.classList.add('img-md');
          if (onChangeRef.current) onChangeRef.current(quill.root.innerHTML);
        }
      });
    } catch (err) {
      console.error('image upload failed', err);
      alert('이미지 업로드에 실패했어요.');
    }
  }, [getQuill]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link', 'image'],
        ['clean'],
      ],
      handlers: { image: handleImageClick },
    },
  }), [handleImageClick]);

  // iOS 한글 IME 버그 수정: 캡처 단계로 Quill 내부 핸들러보다 먼저 실행
  useEffect(() => {
    if (!ReactQuill) return;
    const quill = getQuill();
    if (!quill) return;
    const root = quill.root;

    const onStart = () => { isComposing.current = true; };
    const onEnd = () => { isComposing.current = false; };

    root.addEventListener('compositionstart', onStart, true);
    root.addEventListener('compositionend', onEnd, true);
    return () => {
      root.removeEventListener('compositionstart', onStart, true);
      root.removeEventListener('compositionend', onEnd, true);
    };
  }, [ReactQuill, getQuill]);

  // 외부 value 변경 시에만 Quill 내용 업데이트 (guide-1 방식 — 직접 API 호출)
  // isSelfChange가 true이면 사용자 타이핑이 부모 state를 바꿔 생긴 반향이므로 무시
  useEffect(() => {
    if (!ReactQuill) return;
    if (isSelfChange.current) { isSelfChange.current = false; return; }
    const quill = getQuill();
    if (!quill) return;
    const current = normalizeHtml(quill.root.innerHTML);
    const next = normalizeHtml(value);
    if (current === next) return;
    const delta = quill.clipboard.convert({ html: value ?? '' });
    quill.setContents(delta, 'api');
  }, [ReactQuill, value, getQuill]);

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

  useEffect(() => {
    return () => setMenu(null);
  }, []);

  const handleChange = useCallback((val) => {
    if (isComposing.current) return;
    // 이 변경은 사용자 입력에서 왔으므로, 부모 state 업데이트가 value prop을 바꿔도
    // DOM을 다시 건드리지 않도록 표시
    isSelfChange.current = true;
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
