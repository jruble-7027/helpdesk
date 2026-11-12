import React from 'react';
import { Wrench, Sparkles, Laptop, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AREAS } from '../data/categoriesData';

const iconMap = {
  Wrench: Wrench,
  Sparkles: Sparkles,
  Laptop: Laptop,
};

export default function LandingAreaPicker({ onSelectArea, areasList }) {
  const displayAreas = areasList && areasList.length > 0 ? areasList : AREAS;

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="text-center mb-10 sm:mb-14">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 mb-4">
          WCA Support Center
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          How can we help you today?
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Choose a department below to report an issue, request supplies, or log an asset work order.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {displayAreas.map((area) => {
          const IconComponent = iconMap[area.icon] || Wrench;
          return (
            <div
              key={area.id}
              onClick={() => onSelectArea(area)}
              className="relative group bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-400 p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1.5"
            >
              {/* Top Accent Pill */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${area.bannerGradient} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-7 h-7" />
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${area.badgeColor}`}>
                    {area.shortName}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  {area.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {area.tagline}
                </p>

                {/* Sample items preview */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Common Areas & Assets:
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    {area.assetTypes.slice(0, 3).map((asset) => (
                      <li key={asset.id} className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{asset.name.split('(')[0]}</span>
                      </li>
                    ))}
                    <li className="text-[11px] text-amber-700 font-medium pl-5">
                      + {area.assetTypes.length - 3} more categories
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-2">
                <button
                  type="button"
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${area.buttonColor} shadow-sm group-hover:shadow-md`}
                >
                  <span>Submit {area.shortName} Ticket</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful Info Footer */}
      <div className="mt-12 bg-slate-100 border border-slate-200 rounded-xl p-4 sm:p-5 text-center text-xs text-slate-600">
        <span className="font-semibold text-slate-800">Need immediate emergency support?</span> For urgent building or campus safety concerns, contact the main office directly at ext. 100.
      </div>
    </div>
  );
}
