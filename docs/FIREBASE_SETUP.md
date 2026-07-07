# Alumni Site - Firebase Setup Guide

## 🔥 Firebase Configuration Required

To enable authentication and real-time features, you need to set up Firebase.

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Click "Save"

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Start in **Test mode** (for development)
4. Choose a location close to your users

### Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register your app
5. Copy the `firebaseConfig` object

### Step 5: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **(Optional)** For image uploads, get an ImgBB API key:
   - Go to [ImgBB API](https://api.imgbb.com/)
   - Sign up and get your API key
   - Add to `.env.local`:
     ```env
     NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_key_here
     ```

### Step 6: Set Up Firestore Security Rules

In Firebase Console → Firestore Database → Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow update: if request.auth != null; // Allows sending connection requests
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Posts collection
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.authorUid == request.auth.uid;
    }
    
    // Opportunities collection
    match /opportunities/{oppId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
        resource.data.postedByUid == request.auth.uid;
    }
    // Notifications collection (Missing previously, caused Liking/Connecting to fail)
    match /notifications/{notifId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Chats Parent Collection (Missing previously, caused Messaging to fail)
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
    }

    // Chat Messages Subcollection
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]);
    }
    
    // Community chat
    match /communityChat/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Groups
    match /groups/{groupId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
    }

    // Events
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.createdByUid == request.auth.uid;
    }

    // Institutes (Multi-tenant)
    match /institutes/{instId} {
      allow read, write: if true; // Public access for testing
    }

    // Email Approvals
    match /approvals/{email} {
      allow read, write: if true; // Public access for testing
    }
  }
}
```

### Step 7: Restart Development Server

```bash
npm run dev
```

## ✅ Verification

Once configured, you should be able to:
- Sign up new users
- Log in/out
- Create and view posts
- Connect with other alumni
- Send messages

## 🚨 Troubleshooting

- **"Firebase failed to initialize"**: Check your `.env.local` file
- **"Permission denied"**: Update Firestore security rules
- **"Module not found"**: Run `npm install` again

## 📚 Next Steps

After Firebase is configured, the following features will be available:
- ✅ User authentication
- ✅ Real-time post updates
- ✅ Connection requests
- ✅ Job opportunities board
- ✅ Messaging system
