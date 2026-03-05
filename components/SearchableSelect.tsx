import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SearchableSelectProps {
    options: { id: string; label: string; subLabel?: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, label, className, disabled }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.subLabel?.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative space-y-2", className, disabled && "opacity-60 pointer-events-none")} ref={containerRef}>
            {label && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-slate-200 transition-all",
                    isOpen && "border-blue-500 ring-4 ring-blue-500/10 bg-white",
                    disabled && "cursor-not-allowed bg-slate-100 border-slate-200"
                )}
            >
                <span className={cn("font-bold text-sm", !selectedOption && "text-slate-400")}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={18} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180 text-blue-500")} />
            </div>

            {isOpen && (
                <div className="absolute z-[300] w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b-2 border-slate-50 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xs"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={cn(
                                        "flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-blue-50 transition-colors group",
                                        value === opt.id && "bg-blue-50/50"
                                    )}
                                >
                                    <div className="flex flex-col">
                                        <span className={cn("font-bold text-sm", value === opt.id ? "text-blue-600" : "text-slate-700")}>
                                            {opt.label}
                                        </span>
                                        {opt.subLabel && <span className="text-[10px] text-slate-400 font-bold uppercase">{opt.subLabel}</span>}
                                    </div>
                                    {value === opt.id && <Check size={16} className="text-blue-600" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                Nenhum resultado encontrado
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
