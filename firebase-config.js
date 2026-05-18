// =====================================================
// EJAARI - Firebase Configuration
// 
// خطوات الإعداد:
// 1. اذهب إلى https://console.firebase.google.com
// 2. أنشئ مشروعاً جديداً (Create Project)
// 3. من Project Settings → General → Your apps → Add app (Web)
// 4. انسخ الـ config واستبدل القيم أدناه
// 5. من Build → Realtime Database → Create database → Start in test mode
// =====================================================

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
