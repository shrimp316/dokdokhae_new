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
