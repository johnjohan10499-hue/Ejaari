// =====================================================
// EJAARI - Firebase Configuration
//
// ⚠️  مهم جداً: استبدل القيم أدناه ببيانات مشروعك
//
// خطوات الإعداد:
// 1. اذهب إلى https://console.firebase.google.com
// 2. اضغط "Add project" وأنشئ مشروعاً جديداً
// 3. من Project Settings → General → Your apps → Add app (Web </>)
// 4. انسخ الـ firebaseConfig واستبدل القيم أدناه
// 5. من Build → Realtime Database → Create database
//    → اختر منطقة قريبة → Start in TEST MODE
// 6. من Build → Realtime Database → Rules:
//    ضع هذه القواعد واضغط Publish:
//    {
//      "rules": {
//        ".read": true,
//        ".write": true
//      }
//    }
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

// =====================================================
// فحص إذا كانت الإعدادات مكتملة
// =====================================================
const FIREBASE_IS_CONFIGURED = (
  FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
  FIREBASE_CONFIG.databaseURL.indexOf("YOUR_PROJECT_ID") === -1
);
