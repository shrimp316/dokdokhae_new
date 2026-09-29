'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import { Lightbulb } from 'lucide-react';
import { UPLOAD_MIMETYPES, checkImageFiles } from '@/lib/imagePolicy';
import styles from './QuillEditor.module.css';

const SIZE_LIST = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

// Quill 업로더는 지원하지 않는 형식을 말없이 버리므로, 버리기 전에 이미지 버튼과 같은 기준으로
// 걸러 사용자에게 먼저 안내한다. 너무 큰 파일도 여기서 빼서 Storage에 보내지 않는다.
// 이미지 업로드가 연결되지 않은 에디터(댓글 등)에서는 안내 대신 기존 동작을 그대로 둔다.
function guardUploadFiles(uploader, isUploadEnabled, notify = alert) {
  const originalUpload = uploader.upload;
  uploader.upload = function upload(range, files) {
    let list = Array.from(files);
    if (isUploadEnabled()) {
      const { accepted, message } = checkImageFiles(list);
      if (message) notify(message);
      list = accepted;
    }
    return originalUpload.call(this, range, list);
  };
  return () => { uploader.upload = originalUpload; };
}

// Quill의 빈 상태('<p><br></p>')와 ''를 같게 봐야 빈 에디터에 불필요한 setContents가 일어나지 않는다.
const normalizeHtml = (html) => (!html || html === '<p><br></p>') ? '' : html;

export default function QuillEditor({ value, onChange, placeholder, minHeight = 120, onImageUpload }) {
  const [ReactQuill, setReactQuill] = useState(null);
  const reactQuillRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [menu, setMenu] = useState(null); // { x, y, img }
  const isComposing = useRef(false);
  // 타이핑이 부모 state를 거쳐 value로 되돌아온 것인지 구분해, 그 반향으로 내용을 다시 쓰지 않게 한다.
  const isSelfChange = useRef(false);
  // onImageUpload/onChange는 보통 인라인 함수라 렌더마다 참조가 바뀐다. ref로 받아 modules를 고정한다.
  // modules가 바뀌면 react-quill-new가 Quill 인스턴스를 다시 만들고, 한글 조합 중에 겹치면 자모가 분리된다.
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('react-quill-new').then(({ default: RQ, Quill }) => {
      const SizeStyle = Quill.import('attributors/style/size');
      SizeStyle.whitelist = SIZE_LIST;
      Quill.register(SizeStyle, true);
      setReactQuill(() => RQ);
    });
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

  // 원본 크기 그대로면 큰 사진이 본문을 덮으므로 기본 크기(img-md)를 붙인다.
  // 여러 장을 차례로 넣을 수 있게 다음 삽입 위치를 돌려준다.
  const insertUploadedImage = useCallback((quill, url, index) => {
    // 업로드하는 동안 내용이 줄어들었을 수 있으므로 문서 끝을 넘지 않게 한다.
    const at = Math.min(index, Math.max(quill.getLength() - 1, 0));
    quill.insertEmbed(at, 'image', url, 'user');
    quill.insertText(at + 1, '\n', 'user');
    quill.setSelection(at + 2, 0);
    requestAnimationFrame(() => {
      const imgs = Array.from(quill.root?.querySelectorAll('img') || []);
      // 방금 넣은 이미지(같은 src)를 우선 찾고, 없으면 마지막 이미지
      const target = imgs.filter(img => img.getAttribute('src') === url).pop() || imgs[imgs.length - 1];
      if (target && !target.classList.contains('img-sm') && !target.classList.contains('img-md') && !target.classList.contains('img-lg')) {
        target.classList.add('img-md');
        if (onChangeRef.current) onChangeRef.current(quill.getSemanticHTML());
      }
    });
    return at + 2;
  }, []);

  // 이미지 버튼과 붙여넣기·끌어놓기가 모두 이 함수로 올리고 넣는다. 두 경로의 결과가 같도록
  // 선택한 글자는 이미지로 바꾸고, 여러 장이면 차례로 넣고, 실패는 끝에 한 번만 알린다.
  // (Quill 기본 동작은 붙여넣은 이미지를 base64로 본문에 넣는데, 그러면 서버의 글자 수 제한을 넘고
  // sanitize에서도 제거되므로 업로드한 뒤 주소(URL)만 넣는다.)
  const uploadImages = useCallback(async (quill, range, files) => {
    if (!onImageUploadRef.current) {
      alert('이미지 업로드가 지원되지 않습니다.');
      return;
    }
    let index = range.index;
    if (range.length > 0) quill.deleteText(range.index, range.length, 'user');
    let failed = 0;
    for (const file of files) {
      try {
        const url = await onImageUploadRef.current(file);
        if (url) index = insertUploadedImage(quill, url, index);
      } catch (err) {
        console.error('image upload failed', err);
        failed += 1;
      }
    }
    if (failed > 0) {
      alert(files.length > 1 ? `이미지 ${failed}장을 올리지 못했어요.` : '이미지 업로드에 실패했어요.');
    }
  }, [insertUploadedImage]);

  // 붙여넣기·끌어놓기는 guardUploadFiles가 거르므로, 이미지 버튼도 같은 기준으로 거른 뒤 올린다.
  const onFileChosen = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const { accepted, message } = checkImageFiles(files);
    if (message) alert(message);
    if (accepted.length === 0) return;
    const quill = getQuill();
    if (!quill) return;
    const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    await uploadImages(quill, range, accepted);
  }, [getQuill, uploadImages]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }],
        [{ size: [false, ...SIZE_LIST] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link', 'image'],
        ['clean'],
      ],
      handlers: { image: handleImageClick },
    },
    uploader: {
      mimetypes: UPLOAD_MIMETYPES,
      // Quill이 this를 Uploader 모듈로 지정해 호출하므로 화살표 함수가 아니라 메서드로 둔다.
      handler(range, files) {
        uploadImages(this.quill, range, files);
      },
    },
  }), [handleImageClick, uploadImages]);

  useEffect(() => {
    if (!ReactQuill) return;
    const uploader = getQuill()?.uploader;
    if (!uploader) return;
    return guardUploadFiles(uploader, () => !!onImageUploadRef.current);
  }, [ReactQuill, getQuill]);

  // iOS에서 한글 조합 중에 onChange를 부모로 올리면 자모가 분리된다.
  // 조합 상태를 Quill 내부 핸들러보다 먼저 알 수 있도록 캡처 단계에서 듣는다.
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

  // value를 ReactQuill prop으로 넘기면 타이핑마다 내용을 다시 써서 커서가 튄다.
  // 그래서 불러온 초안·수정할 글처럼 바깥에서 바뀐 값만 Quill API로 직접 반영한다.
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

  // Quill에는 이미지 크기 조절 UI가 없어서, 클릭한 이미지 위에 크기·삭제 메뉴를 직접 띄운다.
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
    isSelfChange.current = true;
    if (onChange) onChange(val);
  }, [onChange]);

  const setSize = (cls) => {
    if (!menu?.img) return;
    menu.img.classList.remove('img-sm', 'img-md', 'img-lg');
    menu.img.classList.add(cls);
    const quill = getQuill();
    if (quill && onChange) onChange(quill.getSemanticHTML());
    setMenu(null);
  };

  const removeImg = () => {
    if (!menu?.img) return;
    menu.img.parentElement?.removeChild(menu.img);
    const quill = getQuill();
    if (quill && onChange) onChange(quill.getSemanticHTML());
    setMenu(null);
  };

  if (!ReactQuill) {
    return <div className={styles.loadingPlaceholder} style={{ height: minHeight }} />;
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ minHeight }}
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
        <div className={styles.hintBar}>
          <Lightbulb size={12} /> 이미지를 본문에 클릭하면 크기(작게/중간/크게)와 삭제 메뉴가 표시됩니다.
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFileChosen}
        className={styles.hiddenInput}
      />
      {menu && (
        <div className={styles.imageMenu} style={{ left: menu.x, top: menu.y }}>
          <button type="button" className="btn-sm btn-outline" onClick={() => setSize('img-sm')}>작게</button>
          <button type="button" className="btn-sm btn-outline" onClick={() => setSize('img-md')}>중간</button>
          <button type="button" className="btn-sm btn-outline" onClick={() => setSize('img-lg')}>크게</button>
          <button type="button" className="btn-sm btn-danger" onClick={removeImg}>삭제</button>
        </div>
      )}
    </div>
  );
}
