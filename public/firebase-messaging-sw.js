// v0.2.2
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7H-2t54t3yGF_UQphaI2JuQ6r5y0ld0g",
  authDomain: "dokdokhae-f84c7.firebaseapp.com",
  projectId: "dokdokhae-f84c7",
  storageBucket: "dokdokhae-f84c7.firebasestorage.app",
  messagingSenderId: "437878503798",
  appId: "1:437878503798:web:e2a88fff6ea5e3f187e257",
});

// onBackgroundMessage를 직접 구현하지 않음: SDK의 기본 자동 표시(webpush.notification 기반)와
// fcmOptions.link 클릭 이동을 그대로 사용. 직접 showNotification을 호출하면 SDK 자동 표시와
// 겹쳐서 알림이 2개 뜨는 문제가 있었음.
firebase.messaging();

// 이 파일이 바뀔 때마다 기존 탭/PWA를 완전히 종료했다 켜기 전까지 브라우저가
// 예전 서비스워커를 계속 쓰는 걸 방지 — 새 버전을 즉시 설치·활성화시킴.
// (이걸 안 넣으면 이미 PWA를 설치한 유저는 예전 코드로 계속 알림을 받게 됨)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
