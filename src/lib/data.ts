import { User, Post, Job, Event } from '@/types';
import { Timestamp } from 'firebase/firestore';

const mockTimestamp = Timestamp.now();

export const mockUsers: User[] = [
    {
        uid: '1',
        name: 'Alex Johnson',
        email: 'alex@example.com',
        batch: 2018,
        profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
        profession: 'Senior Software Engineer at TechCorp',
        location: 'San Francisco, CA',
        connections: [],
    },
    {
        uid: '2',
        name: 'Sarah Williams',
        email: 'sarah@example.com',
        batch: 2020,
        profilePic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
        profession: 'Product Designer | UX Enthusiast',
        location: 'New York, NY',
        connections: [],
    },
    {
        uid: '3',
        name: 'David Chen',
        email: 'david@example.com',
        batch: 2015,
        profilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
        profession: 'Marketing Strategist',
        location: 'London, UK',
        connections: [],
    }
];

export const mockPosts: Post[] = [
    {
        id: '1',
        authorUid: mockUsers[0].uid,
        authorName: mockUsers[0].name,
        authorBatch: mockUsers[0].batch,
        authorProfilePic: mockUsers[0].profilePic,
        content: 'Just launched our new feature at TechCorp! Check it out. 🚀 #engineering #launch',
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&fit=crop',
        likes: [],
        comments: [],
        createdAt: mockTimestamp,
    },
    {
        id: '2',
        authorUid: mockUsers[1].uid,
        authorName: mockUsers[1].name,
        authorBatch: mockUsers[1].batch,
        authorProfilePic: mockUsers[1].profilePic,
        content: 'Attended a great workshop on UX trends for 2026. Minimalism is back!',
        likes: [],
        comments: [],
        createdAt: mockTimestamp,
    }
];

export const mockJobs: Job[] = [
    {
        id: '1',
        title: 'Frontend Developer',
        company: 'StartupInc',
        type: 'Full-time',
        location: 'Remote',
        description: 'We are looking for a skilled React developer...',
        postedByUid: '1',
        postedByName: 'Admin',
        postedByBatch: 2010,
        createdAt: mockTimestamp,
    },
    {
        id: '2',
        title: 'UX Researcher',
        company: 'DesignStudio',
        type: 'Freelance/Contract',
        location: 'Berlin',
        description: 'Help us understand user needs...',
        postedByUid: '1',
        postedByName: 'Admin',
        postedByBatch: 2010,
        createdAt: mockTimestamp,
    }
];

export const mockEvents: Event[] = [
    {
        id: '1',
        title: 'Alumni Networking Night',
        date: 'Oct 15, 2026',
        location: 'Downtown Hall',
        description: 'Connect with fellow graduates over drinks and appetizers.',
        attendees: 156,
    }
];
