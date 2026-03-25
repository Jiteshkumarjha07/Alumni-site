import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'connection_request' | 'connection_accepted';
  sourceUserUid: string;
  sourceUserName: string;
  sourceUserProfilePic?: string;
  message: string;
  link?: string;
  createdAt: Timestamp;
  isRead: boolean;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  batch: number;
  profession: string;
  location: string;
  profilePic?: string;
  joinedAt?: Timestamp;
  connections?: string[];
  pendingRequests?: string[];
  sentRequests?: string[];
  groups?: string[];
  isAdmin?: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorBatch: number;
  authorProfilePic?: string;
  content: string;
  imageUrl?: string;
  likes?: string[];
  comments?: Comment[];
  createdAt: Timestamp;
}

export interface Comment {
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: Date | Timestamp;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  type: 'Full-time' | 'Part-time' | 'Freelance/Contract' | 'Internship';
  description: string;
  contact?: string;
  postedByUid: string;
  postedByName: string;
  postedByBatch: number;
  createdAt: Timestamp;
  expiresAt?: Timestamp | null;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  imageUrl?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: Timestamp;
  attendeesCount: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  senderProfilePic?: string;
  createdAt: Timestamp;
  isRead?: boolean;
  readAt?: Timestamp;
  readBy?: string[]; // Array of UIDs who have read this message
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  imageUrl?: string;
  videoUrl?: string;
  hiddenBy?: string[];
  sharedPostId?: string;
  sharedPostContent?: string;
  sharedPostAuthor?: string;
  sharedPostImage?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface Group {
  id: string;
  groupName: string;
  createdBy: string;
  members: string[];
  admins: string[];
  createdAt: Timestamp;
  groupSecret: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastSenderName?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  unreadCount?: Record<string, number>;
  participantDetails?: Record<string, { name: string; profilePic: string }>;
  deletedBy?: string[]; // Array of UIDs who have "deleted" (hidden) the chat
}
