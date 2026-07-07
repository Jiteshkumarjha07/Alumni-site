# Source structure

A quick map of `src/` so anyone (including future you) can find things fast.
Import everything with the `@/` alias — it points at `src/` (e.g. `@/components/ui/Portal`).

```
src/
├── app/                      # Next.js App Router — one folder per route/page
│   ├── (page.tsx = the home feed)
│   ├── admin/                # super-admin dashboard (+ approvals, institutes)
│   ├── institute-admin/      # institute-scoped admin dashboard
│   ├── events/  jobs/  lobby/  network/  settings/
│   ├── messages/             # DMs + community chat
│   ├── posts/                # saved posts, single-post view
│   ├── profile/              # own profile + public profile view
│   ├── login/  signup/
│   └── layout.tsx            # root layout (providers, <head>, theme script)
│
├── components/               # reusable UI, grouped by feature
│   ├── ui/                   # generic primitives (Portal, EmojiPicker, LocationAutocomplete…)
│   ├── layout/               # shells & nav (Sidebar, MobileNav, headers, ribbons)
│   ├── feed/                 # PostCard
│   ├── events/  jobs/        # EventCard, JobCard…
│   ├── chat/                 # ChatWindow, ChatList, MessageBubble…
│   ├── network/              # AlumniCard, AlumniAtlas (map)
│   ├── profile/  brand/  auth/  lobby/  notifications/
│   └── modals/               # dialogs, grouped by domain:
│       ├── post/             #   CreatePost, EditPost, Comment, SharePost
│       ├── chat/             #   CreateGroup, Poll
│       ├── listings/         #   CreateEvent, CreateOpportunity
│       ├── account/          #   AccountSettings, ChangePassword, EditProfile
│       └── common/           #   ConfirmDialog, ComingSoonModal (generic)
│
├── contexts/                 # global React state (Auth, Theme, UI, Messaging)
├── hooks/                    # reusable hooks (usePushNotifications, useEscapeKey)
├── lib/                      # non-UI logic: firebase setup, media upload, encryption, validation
└── types/                    # shared TypeScript types
```

## Conventions
- **Routes** live only in `app/`; everything reusable lives in `components/`, `hooks/`, or `lib/`.
- **Modals** are grouped by the feature they belong to; generic dialogs go in `modals/common/`.
- Prefer the **`@/` alias** over long `../../` relative paths.
- Firebase access (Firestore/Storage/Auth) goes through `lib/firebase.ts`; security is enforced
  by `firestore.rules` / `storage.rules` at the repo root (deploy with `firebase deploy`).
