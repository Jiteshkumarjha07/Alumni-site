import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { collection, query, getDocs, where, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Search, Loader2, Users, Check } from 'lucide-react';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onGroupCreated: (groupId: string) => void;
}

export function CreateGroupModal({ isOpen, onClose, currentUser, onGroupCreated }: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, 
                    where('nameLowercase', '>=', searchQuery.toLowerCase()), 
                    where('nameLowercase', '<=', searchQuery.toLowerCase() + '\uf8ff')
                );
                const querySnapshot = await getDocs(q);

                const results: User[] = [];
                querySnapshot.forEach((doc) => {
                    const user = doc.data() as User;
                    if (user.uid !== currentUser.uid) {
                        results.push(user);
                    }
                });
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUser.uid]);

    const toggleMember = (user: User) => {
        if (selectedMembers.find(m => m.uid === user.uid)) {
            setSelectedMembers(prev => prev.filter(m => m.uid !== user.uid));
        } else {
            setSelectedMembers(prev => [...prev, user]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || isCreating) return;

        setIsCreating(true);
        try {
            const memberIds = [currentUser.uid, ...selectedMembers.map(m => m.uid)];
            
            const groupData = {
                groupName: groupName.trim(),
                createdBy: currentUser.uid,
                members: memberIds,
                admins: [currentUser.uid],
                createdAt: serverTimestamp(),
                groupSecret: Math.random().toString(36).substring(2, 15) // Simple secret for E2EE demo
            };

            const groupRef = await addDoc(collection(db, 'groups'), groupData);

            // Update all members' groups array
            for (const uid of memberIds) {
                const userRef = doc(db, 'users', uid);
                await updateDoc(userRef, {
                    groups: arrayUnion(groupRef.id)
                });
            }

            onGroupCreated(groupRef.id);
            onClose();
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-brand-cream rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-brand-ebony/10">
                {/* Header */}
                <div className="p-6 border-b border-brand-ebony/10 flex items-center justify-between bg-brand-parchment/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-burgundy/10 rounded-xl">
                            <Users className="w-5 h-5 text-brand-burgundy" />
                        </div>
                        <h2 className="text-xl font-serif font-bold text-brand-ebony">Create New Group</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-brand-ebony/30" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Group Name */}
                    <div>
                        <label className="block text-xs font-bold text-brand-ebony/40 uppercase tracking-widest mb-2 px-1">Group Name</label>
                        <input
                            type="text"
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full px-4 py-3 bg-brand-parchment/20 border border-brand-ebony/10 rounded-xl focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy outline-none transition-all placeholder:text-brand-ebony/30 shadow-inner"
                        />
                    </div>

                    {/* Member Selection */}
                    <div>
                        <label className="block text-xs font-bold text-brand-ebony/40 uppercase tracking-widest mb-2 px-1">
                            Add Members ({selectedMembers.length})
                        </label>
                        
                        {/* Search Input */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Search alumni to add..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-brand-parchment/20 border border-brand-ebony/5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-burgundy/30"
                            />
                            <Search className="w-4 h-4 text-brand-ebony/30 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* Search Results */}
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {searchQuery ? (
                                isSearching ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-brand-burgundy/40" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(user => (
                                        <button
                                            key={user.uid}
                                            onClick={() => toggleMember(user)}
                                            className="w-full flex items-center justify-between p-2 hover:bg-brand-burgundy/5 rounded-xl transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <img 
                                                    src={user.profilePic || `https://placehold.co/100x100/EFEFEFF/3D2B27?text=${user.name.substring(0, 1)}`} 
                                                    alt={user.name} 
                                                    className="w-10 h-10 rounded-full object-cover border border-brand-ebony/20"
                                                />
                                                <div>
                                                    <p className="text-sm font-serif font-bold text-brand-ebony">{user.name}</p>
                                                    <p className="text-[10px] text-brand-ebony/50 uppercase font-bold">{user.profession || `Batch of ${user.batch}`}</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                selectedMembers.find(m => m.uid === user.uid)
                                                    ? 'bg-brand-burgundy border-brand-burgundy text-white'
                                                    : 'border-brand-ebony/10 group-hover:border-brand-burgundy/30'
                                            }`}>
                                                {selectedMembers.find(m => m.uid === user.uid) && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-center py-4 text-xs text-brand-ebony/30">No results found</p>
                                )
                            ) : selectedMembers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedMembers.map(user => (
                                        <div key={user.uid} className="flex items-center gap-2 bg-brand-burgundy/10 px-3 py-1.5 rounded-full border border-brand-burgundy/20">
                                            <span className="text-xs font-bold text-brand-burgundy">{user.name}</span>
                                            <button onClick={() => toggleMember(user)}>
                                                <X className="w-3 h-3 text-brand-burgundy hover:text-brand-ebony transition-colors" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-4 text-xs text-brand-ebony/30 italic">Search users to add them to the group</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-brand-parchment/5 border-t border-brand-ebony/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-medium text-brand-ebony/60 hover:text-brand-ebony transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={!groupName.trim() || isCreating}
                        className="flex-[2] py-3 bg-brand-burgundy text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-burgundy/20 hover:bg-[#5a2427] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}
