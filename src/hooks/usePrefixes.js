'use client';
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapDocs } from '@/lib/firestore';

// 글머리 없이도 글을 쓸 수 있으므로, 불러오지 못하면 null을 돌려주고 목록은 그대로 둔다.
async function fetchPrefixes() {
  try {
    return mapDocs(await getDocs(collection(db, 'boardPrefixes')));
  } catch {
    return null;
  }
}

// 게시판 글머리 목록. 글쓰기·글 수정 화면은 불러오기만 하고, 관리자 화면은 추가·삭제 뒤 reload로 다시 읽는다.
export function usePrefixes() {
  const [prefixes, setPrefixes] = useState([]);

  useEffect(() => {
    // 응답 전에 화면을 떠나면 상태를 바꾸지 않는다.
    let active = true;
    fetchPrefixes().then((list) => {
      if (active && list) setPrefixes(list);
    });
    return () => { active = false; };
  }, []);

  const reload = useCallback(async () => {
    const list = await fetchPrefixes();
    if (list) setPrefixes(list);
  }, []);

  return { prefixes, reload };
}
