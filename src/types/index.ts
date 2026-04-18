import { Timestamp, FieldValue } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'connection_request' | 'connection_accepted' | 'message';
  sourceUserUid: string;
  sourceUserName: string;
  sourceUserProfilePic?: string;
  message: string;
  link?: string;
  createdAt: Timestamp;
  isRead: boolean;
}

export interface Institute {
  id: string;
  name: string;
  domain?: string; // e.g., 'mit.edu'
  adminIds?: string[];
  logoUrl?: string;
  coverPhotoUrl?: string;
  createdAt?: Timestamp;
}

export interface User {
  uid: string;
  id?: string; // Some internal components use 'id'
  name: string;
  nameLowercase: string;
  email: string;
  batch: number;
  profession: string;
  headline?: string; // Professional headline for sidebar-profile cards
  location: string;
  instituteId: string;
  instituteName?: string;
  instituteIds?: string[];
  profilePic?: string;
  avatar?: string; // Alias for profilePic used in some screens
  joinedAt?: Timestamp | FieldValue;
  connections?: string[];
  pendingRequests?: string[];
  sentRequests?: string[];
  groups?: string[];
  isAdmin?: boolean;
  isinsadmin?: boolean;
  isSuspended?: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue;
  savedPosts?: string[];
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorBatch: number;
  authorProfilePic?: string;
  authorProfession?: string;
  content: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  likes?: string[];
  comments?: Comment[];
  createdAt: Timestamp;
  instituteId: string;
}

export interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: Date | Timestamp;
  replyToId?: string;
  reactions?: Record<string, string[]>; // emoji -> array of user uids
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
  instituteId: string;
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
  instituteId: string;
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
  isDelivered?: boolean;
  receiverId?: string;
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
  mediaUrl?: string; // Generic media URL (replaces imageUrl/videoUrl for new messages)
  mediaType?: 'image' | 'video' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  audioUrl?: string;
  audioDuration?: number; // seconds
  poll?: Poll;
  reactions?: Record<string, string[]>; // emoji -> array of user uids
}

export interface Poll {
  question: string;
  options: PollOption[];
  expiresAt?: Timestamp;
  allowMultiple?: boolean;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of uids who voted for this option
}

export interface Group {
  id: string;
  groupName: string;
  createdBy: string;
  members: string[];
  admins: string[];
  instituteId?: string; // Optional for backward compatibility with existing groups
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
  participantDetails?: Record<string, { name: string; profilePic: string; isOnline?: boolean }>;
  deletedBy?: string[]; // Array of UIDs who have "deleted" (hidden) the chat
}
