'use client';

import React from 'react';

interface EmojiRendererProps {
    text: string;
    className?: string;
}

export function EmojiRenderer({ text, className }: EmojiRendererProps) {
    if (!text) return null;

    // Comprehensive emoji regex
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    
    // Actually, a better way is to iterate through the string and find matches
    const finalResult: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
        // Add text before the emoji
        if (match.index > lastIndex) {
            finalResult.push(<span key={`txt-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
        }

        const emoji = match[0];
        // Convert emoji to unified hex
        const codePoints = Array.from(emoji).map(char => char.codePointAt(0)!.toString(16));
        const unified = codePoints.join('-');
        
        const url = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${unified}.png`;

        finalResult.push(
            <img 
                key={`emoji-${match.index}`}
                src={url} 
                alt={emoji}
                className="inline-block w-[1.25em] h-[1.25em] align-middle mx-[0.05em] translate-y-[-0.1em]"
                draggable={false}
            />
        );

        lastIndex = emojiRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        finalResult.push(<span key={`txt-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }

    return <span className={className}>{finalResult.length > 0 ? finalResult : text}</span>;
}
