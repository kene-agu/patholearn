"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Search, Microscope, AlertCircle, BookOpen, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import {
  PATHOLOGY_ATLAS, ORGAN_SYSTEMS,
  slideImageUrl, slideAnalyzeUrl,
  type PathologyEntry, type AtlasSlide,
} from "@/data/pathologyAtlas";

interface PathologyAtlasProps {
  onSelect: (imageUrl: string, diagnosisHint: string) => void;
}

function SlideThumb({ slide, onAnalyze, isNormal }: { slide: AtlasSlide; onAnalyze: () => void; isNormal?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:shadow-lg transition-all"
      onClick={onAnalyze}
    >
      <div className="aspect-[4/3] relative">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slideImageUrl(slide)}
          alt={slide.caption}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/400x300/0f172a/38bdf8?text=Slide";
            setLoaded(true);
          }}
          className={clsx(
            "w-full h-full object-cover transition-all duration-300",
            loaded ? "opacity-100" : "opacity-0",
            "group-hover:scale-105",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isNormal ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">NORMAL</span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">PATHOLOGY</span>
          )}
          {slide.stain && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white">{slide.stain}</span>
          )}
        </div>
        {slide.magnification && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700">
            {slide.magnification} mag
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-xs text-white font-medium leading-snug line-clamp-2">{slide.caption}</p>
        </div>
      </div>
      <div className="px-3 py-2 flex items-center justify-between text-xs text-primary-600 dark:text-primary-400 font-semibold">
        <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Analyse with AI</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}

function PathologyDetail({
  entry,
  onBack,
  onSelect,
}: {
  entry: PathologyEntry;
  onBack: () => void;
  onSelect: (url: string, hint: string) => void;
}) {
  const handleSlideClick = (slide: AtlasSlide) => {
    onSelect(slideAnalyzeUrl(slide), entry.diagnosisHint);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to atlas
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center flex-shrink-0">
            <Microscope className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">{entry.organSystem}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{entry.name}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{entry.description}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Histological Features</p>
            <ul className="space-y-1.5">
              {entry.keyFeatures.map((f, i) => (
                <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-2">
                  <span className="text-primary-500 font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Clinical Context</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{entry.clinicalContext}</p>
          </div>
        </div>
      </div>

      {/* Normal slide */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">Step 1</span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Start with the normal baseline</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SlideThumb slide={entry.normalSlide} onAnalyze={() => handleSlideClick(entry.normalSlide)} isNormal />
        </div>
      </div>

      {/* Pathology slides */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">Step 2</span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Compare {entry.pathologySlides.length} pathology variants
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entry.pathologySlides.map((s, i) => (
            <SlideThumb key={i} slide={s} onAnalyze={() => handleSlideClick(s)} />
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          <strong>Tip:</strong> Click any slide above to send it to the AI analyser.
          Compare the morphology with what you observed in the normal tissue and
          test yourself on the diagnostic features before reading the AI&apos;s response.
        </p>
      </div>
    </div>
  );
}

export default function PathologyAtlas({ onSelect }: PathologyAtlasProps) {
  const [search, setSearch]               = useState("");
  const [system, setSystem]               = useState<string>("All");
  const [selectedId, setSelectedId]       = useState<string | null>(null);

  const selected = useMemo(
    () => PATHOLOGY_ATLAS.find(e => e.id === selectedId) ?? null,
    [selectedId],
  );

  const filtered = useMemo(() => {
    return PATHOLOGY_ATLAS.filter(e => {
      const matchSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.organSystem.toLowerCase().includes(search.toLowerCase());
      const matchSystem = system === "All" || e.organSystem === system;
      return matchSearch && matchSystem;
    });
  }, [search, system]);

  const groupedFiltered = useMemo(() => {
    const groups: Record<string, PathologyEntry[]> = {};
    filtered.forEach(e => {
      if (!groups[e.organSystem]) groups[e.organSystem] = [];
      groups[e.organSystem].push(e);
    });
    return groups;
  }, [filtered]);

  if (selected) {
    return (
      <PathologyDetail
        entry={selected}
        onBack={() => setSelectedId(null)}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pathology Atlas</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Robbins-style atlas. Each entry pairs the normal tissue with multiple pathology variants
          so you can train your eye on the subtle differences before tackling unknown slides.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pathology, organ system, or feature…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", ...ORGAN_SYSTEMS].map(s => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                system === s
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-500">
          No matches. Try a different search or organ system.
        </div>
      )}

      {/* Grouped by system */}
      {Object.entries(groupedFiltered).map(([systemName, entries]) => (
        <div key={systemName} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
            {systemName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                className="group text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
              >
                {/* Hero image - first pathology slide */}
                <div className="relative h-40 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slideImageUrl(entry.pathologySlides[0])}
                    alt={entry.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/600x300/0f172a/38bdf8?text=Pathology";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700">
                    {entry.pathologySlides.length + 1} slides
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary-600 mb-1">{entry.organSystem}</p>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 group-hover:text-primary-600 transition-colors">
                    {entry.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{entry.description}</p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-primary-600 group-hover:gap-1.5 gap-1 transition-all">
                    Open atlas entry <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
