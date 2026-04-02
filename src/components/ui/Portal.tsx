'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        children,
        document.body
    );
}
