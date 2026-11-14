import React from 'react';
import {
  Blend,
  Brush,
  Circle,
  Hand,
  Square,
} from 'lucide-react';
import type { ToolType } from '../types/editor';

interface ToolRailProps {
  activeTool: ToolType;
  disabled: boolean;
  onSelectTool: (tool: ToolType) => void;
}

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { id: 'move', label: '이동', shortcut: 'V', icon: Hand },
  { id: 'brush', label: '브러쉬', shortcut: 'B', icon: Brush },
  { id: 'rect', label: '직사각형', shortcut: 'R', icon: Square },
  { id: 'ellipse', label: '타원', shortcut: 'E', icon: Circle },
  { id: 'linear', label: '선형', shortcut: 'G', icon: Blend },
];

export const DesktopToolRail: React.FC<ToolRailProps> = ({
  activeTool,
  disabled,
  onSelectTool,
}) => {
  return (
    <aside
      aria-label="편집 도구 모음"
      className="hidden md:flex flex-col items-center w-[72px] bg-[#11151E] border-r border-slate-800/80 py-3 gap-1.5 shrink-0 z-30"
    >
      {TOOLS.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <React.Fragment key={tool.id}>
            {index === 1 && (
              <div className="w-8 h-px bg-slate-800 my-1" aria-hidden="true" />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={`${tool.label} 도구`}
              aria-pressed={isActive}
              className={`w-13 h-13 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/35'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                {tool.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </aside>
  );
};

export const MobileToolBar: React.FC<ToolRailProps> = ({
  activeTool,
  disabled,
  onSelectTool,
}) => {
  return (
    <nav
      aria-label="모바일 편집 도구 모음"
      className="md:hidden h-16 bg-[#11151E]/95 backdrop-blur-md border-t border-slate-800/80 grid grid-cols-5 items-center px-2 shrink-0 z-50"
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectTool(tool.id)}
            aria-label={`${tool.label} 도구`}
            aria-pressed={isActive}
            className={`min-h-[48px] min-w-[48px] mx-auto px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
              isActive
                ? 'text-sky-400 bg-sky-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none whitespace-nowrap">
              {tool.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
