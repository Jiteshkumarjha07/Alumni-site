import React, { useState, useEffect, useRef } from 'react';
import { City, ICity } from 'country-state-city';
import { Search, MapPin } from 'lucide-react';

interface LocationAutocompleteProps {
    value: string;
    onChange: (location: string) => void;
}

export function LocationAutocomplete({ value, onChange }: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<ICity[]>([]);
    const [allCities, setAllCities] = useState<ICity[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initial load of all cities
    useEffect(() => {
        // country-state-city returns ~140,000 cities globally.
        // We fetch them once when the component mounts.
        const loadCities = async () => {
            const cities = City.getAllCities();
            setAllCities(cities);
        };
        loadCities();
    }, []);

    // Filter cities based on query
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        // Only search if the string typed doesn't exactly match the currently selected value.
        // This prevents the dropdown from staying open and searching if the user selects an option.
        if (query !== value) {
            const searchStr = query.toLowerCase();
            const filtered = allCities
                .filter(city => city.name.toLowerCase().startsWith(searchStr))
                .slice(0, 100); // Limit to top 100 to prevent browser freeze when rendering DOM
            setResults(filtered);
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [query, allCities, value]);

    // Update internal query if external value changes (e.g. form reset)
    useEffect(() => {
        if (value !== query) {
            setQuery(value);
        }
    }, [value]);

    // Handle clicking outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // If they clicked away without selecting, we can arguably reset to the last selected value
                // or keep their partial typing. We'll keep their typing but close the dropdown.
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    const handleSelect = (city: ICity) => {
        // Format: "City, StateCode, CountryCode"
        const locationString = `${city.name}, ${city.stateCode}, ${city.countryCode}`;
        setQuery(locationString);
        onChange(locationString);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search cities (e.g., Jamshedpur)..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        // If user clears the input, clear the parent state too
                        if (e.target.value === '') {
                            onChange('');
                        }
                    }}
                    onFocus={() => {
                        if (query.trim() && results.length > 0) setIsOpen(true);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 placeholder:text-gray-400"
                    required
                />
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <p className="text-xs text-brand-ebony/40 uppercase tracking-widest font-bold mt-1">Try &quot;Mumbai&quot; or &quot;California&quot;</p>
            </div>

            {/* Dropdown Menu */}
            {isOpen && results.length > 0 && (
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

            {isOpen && query.trim() && results.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 italic">
                    No cities found matching "{query}"
                </div>
            )}
        </div>
    );
}
