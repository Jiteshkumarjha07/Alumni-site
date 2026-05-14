importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAwDtXrcjlscw2JdEoRQomJCzoofVvbOGE",
  authDomain: "alumnest-19065.firebaseapp.com",
  projectId: "alumnest-19065",
  storageBucket: "alumnest-19065.firebasestorage.app",
  messagingSenderId: "507932000309",
  appId: "1:507932000309:web:af05d47b70dd0c0871b17c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
