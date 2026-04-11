import React, { useState, useEffect, useRef, useMemo } from 'react';
import { City, ICity } from 'country-state-city';
import { MapPin } from 'lucide-react';

interface LocationAutocompleteProps {
    value: string;
    onChange: (location: string) => void;
}

export function LocationAutocomplete({ value, onChange }: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const [isManuallyClosed, setIsManuallyClosed] = useState(false);
    const [allCities] = useState(() => City.getAllCities());
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter cities based on query using useMemo
    const results = useMemo(() => {
        if (!query.trim() || query === value) return [];
        
        const searchStr = query.toLowerCase();
        return allCities
            .filter(city => city.name.toLowerCase().startsWith(searchStr))
            .slice(0, 100);
    }, [query, allCities, value]);

    // Derived state for dropdown visibility
    const isOpen = isFocused && !isManuallyClosed && results.length > 0;

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const handleSelect = (city: ICity) => {
        const locationString = `${city.name}, ${city.stateCode}, ${city.countryCode}`;
        setQuery(locationString);
        onChange(locationString);
        setIsManuallyClosed(true);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search cities (e.g., Jamshedpur)..."
                    value={query}
                    onChange={(e) => {
                        const newQuery = e.target.value;
                        setQuery(newQuery);
                        setIsManuallyClosed(false);
                        if (newQuery === '') {
                            onChange('');
                        }
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        setIsManuallyClosed(false);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-brand-ebony/15 rounded-lg focus:ring-2 focus:ring-brand-burgundy/20 focus:border-brand-burgundy/30 transition text-brand-ebony bg-white/80 dark:bg-brand-parchment/15 placeholder:text-brand-ebony/30 outline-none"
                    required
                />
                <MapPin className="w-5 h-5 text-brand-ebony/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <p className="text-xs text-brand-ebony/40 uppercase tracking-widest font-bold mt-1">Try &quot;Mumbai&quot; or &quot;California&quot;</p>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 sidebar-glass rounded-xl shadow-xl max-h-60 overflow-y-auto border border-brand-ebony/10">
                    {results.map((city, index) => (
                        <button
                            key={`${city.name}-${city.stateCode}-${city.countryCode}-${index}`}
                            type="button"
                            onClick={() => handleSelect(city)}
                            className="w-full text-left px-4 py-2 hover:bg-brand-burgundy/8 dark:hover:bg-white/5 focus:bg-brand-burgundy/8 focus:outline-none transition-colors border-b border-brand-ebony/5 last:border-b-0"
                        >
                            <span className="font-medium text-brand-ebony">{city.name}</span>
                            <span className="text-brand-ebony/50 text-sm ml-2">
                                {city.stateCode}, {city.countryCode}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {isFocused && query.trim() && results.length === 0 && query !== value && (
                <div className="absolute z-50 w-full mt-1 sidebar-glass rounded-xl shadow-xl p-4 text-center text-brand-ebony/50 italic border border-brand-ebony/10">
                    No cities found matching &quot;{query}&quot;
                </div>
            )}
        </div>
    );
}
