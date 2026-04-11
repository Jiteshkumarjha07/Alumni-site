import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Search, Loader2, Users, Check, Sparkles } from 'lucide-react';

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
                const querySnapshot = await getDocs(usersRef);
                const term = searchQuery.toLowerCase();

                const results: User[] = [];
                querySnapshot.forEach((docSnap) => {
                    const user = { ...docSnap.data(), uid: docSnap.id } as User;
                    if (
                        user.uid !== currentUser.uid &&
                        (user.name?.toLowerCase().includes(term) ||
                         user.profession?.toLowerCase().includes(term))
                    ) {
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
            alert('Failed to create circle. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-brand-ebony/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="card-premium w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 border-brand-burgundy/10">
                {/* Header */}
                <div className="p-8 border-b border-brand-ebony/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-indigo rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-brand-ebony flex items-center gap-2">
                                New Circle
                                <Sparkles className="w-4 h-4 text-brand-gold" />
                            </h2>
                            <p className="text-[10px] font-extrabold text-brand-ebony/30 uppercase tracking-[0.2em] mt-1">Shared Space • Secure</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-brand-ebony/5 rounded-full transition-all">
                        <X className="w-5 h-5 text-brand-ebony/30" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Group Name */}
                    <div>
                        <label className="block text-xs font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em] mb-3 px-1">Circle Identity</label>
                        <input
                            type="text"
                            placeholder="e.g. Batch of 2020 Founders"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full px-6 py-4 bg-brand-ebony/5 border border-brand-ebony/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-brand-ebony/25 font-bold text-sm"
                        />
                    </div>

                    {/* Member Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <label className="text-xs font-extrabold text-brand-ebony/40 uppercase tracking-[0.2em]">
                                Add Members
                            </label>
                            <span className="text-[10px] font-extrabold bg-indigo-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                {selectedMembers.length} Selected
                            </span>
                        </div>
                        
                        {/* Search Input */}
                        <div className="relative mb-6">
                            <input
                                type="text"
                                placeholder="Search by name or profession..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-5 py-4 bg-white dark:bg-brand-cream/20 border border-brand-ebony/5 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-inner"
                            />
                            <Search className="w-5 h-5 text-brand-ebony/20 absolute left-4 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* Search Results */}
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar scrollbar-hide">
                            {searchQuery ? (
                                isSearching ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500/40" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(user => {
                                        const isSelected = selectedMembers.find(m => m.uid === user.uid);
                                        return (
                                            <button
                                                key={user.uid}
                                                onClick={() => toggleMember(user)}
                                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group border ${
                                                    isSelected 
                                                        ? 'bg-indigo-500/5 border-indigo-500/20' 
                                                        : 'hover:bg-brand-ebony/5 border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <img 
                                                        src={user.profilePic || `https://placehold.co/100x100/4f46e5/ffffff?text=${user.name.substring(0, 1)}`} 
                                                        alt={user.name} 
                                                        className={`w-11 h-11 rounded-full object-cover border-2 shadow-sm transition-transform ${isSelected ? 'border-indigo-500' : 'border-white dark:border-brand-parchment group-hover:scale-105'}`}
                                                    />
                                                    <div>
                                                        <p className={`text-sm font-extrabold transition-colors ${isSelected ? 'text-indigo-600' : 'text-brand-ebony'}`}>{user.name}</p>
                                                        <p className="text-[10px] text-brand-ebony/40 uppercase font-extrabold tracking-widest mt-0.5">{user.profession || `Class of ${user.batch}`}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                                                        : 'border-brand-ebony/10'
                                                }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-xs font-serif italic text-brand-ebony/30">No matching alumni found</p>
                                    </div>
                                )
                            ) : selectedMembers.length > 0 ? (
                                <div className="flex flex-wrap gap-2 py-2">
                                    {selectedMembers.map(user => (
                                        <div key={user.uid} className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-2xl shadow-md animate-in zoom-in">
                                            <span className="text-[11px] font-extrabold">{user.name}</span>
                                            <button onClick={() => toggleMember(user)} className="p-0.5 hover:bg-white/20 rounded-full transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-6 border-2 border-dashed border-brand-ebony/5 rounded-3xl">
                                    <p className="text-sm font-serif italic text-brand-ebony/30">Search for alumni to invite to this circle</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-brand-ebony/5 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-xs font-extrabold uppercase tracking-widest text-brand-ebony/40 hover:text-brand-ebony transition-all"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
                        className="flex-[2] py-4 bg-gradient-indigo text-white rounded-2xl font-extrabold text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                Establish Circle
                                <Check className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
