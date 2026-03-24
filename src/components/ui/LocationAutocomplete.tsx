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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 placeholder:text-gray-400"
                    required
                />
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((city, index) => (
                        <button
                            key={`${city.name}-${city.stateCode}-${city.countryCode}-${index}`}
                            type="button"
                            onClick={() => handleSelect(city)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-50 last:border-b-0"
                        >
                            <span className="font-medium text-gray-900">{city.name}</span>
                            <span className="text-gray-500 text-sm ml-2">
                                {city.stateCode}, {city.countryCode}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {isFocused && query.trim() && results.length === 0 && query !== value && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 italic">
                    No cities found matching &quot;{query}&quot;
                </div>
            )}
        </div>
    );
}
