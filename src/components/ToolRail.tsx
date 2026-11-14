import React from 'react';
import {
  Blend,
  Brush,
  Circle,
  Hand,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import type { ToolType } from '../types/editor';

interface ToolRailProps {
  activeTool: ToolType;
  disabled: boolean;
  onSelectTool: (tool: ToolType) => void;
}

interface MobileToolBarProps extends ToolRailProps {
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
}

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
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
      className="flex flex-col items-center w-16 bg-[#0f0f10] border-r border-[#ededed]/[0.08] py-3 gap-1 shrink-0 z-30"
    >
      {TOOLS.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <React.Fragment key={tool.id}>
            {index === 1 && (
              <div
                className="w-8 h-px bg-[#ededed]/[0.08] my-1"
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={`${tool.label} 도구`}
              aria-pressed={isActive}
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
                isActive
                  ? 'surface-active text-[#ededed] border border-[#ededed]/[0.10]'
                  : 'text-[#85858b] hover:text-[#ededed] hover:bg-[#19191b] border border-transparent'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[11px] font-normal leading-none whitespace-nowrap">
                {tool.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </aside>
  );
};

export const MobileToolBar: React.FC<MobileToolBarProps> = ({
  activeTool,
  disabled,
  isInspectorOpen,
  onSelectTool,
  onToggleInspector,
}) => {
  return (
    <nav
      aria-label="모바일 편집 도구 모음"
      className="h-16 bg-[#0f0f10] border-t border-[#ededed]/[0.08] grid grid-cols-6 items-center px-1.5 shrink-0 z-50"
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
            className={`h-12 min-w-[44px] w-full max-w-[60px] mx-auto px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
              isActive
                ? 'surface-active text-[#ededed] border border-[#ededed]/[0.10]'
                : 'text-[#85858b] hover:text-[#ededed] border border-transparent'
            }`}
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="text-[11px] font-normal leading-none whitespace-nowrap">
              {tool.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={onToggleInspector}
        aria-label="세부 설정 열기"
        aria-expanded={isInspectorOpen}
        className={`relative h-12 min-w-[44px] w-full max-w-[60px] mx-auto px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] ${
          isInspectorOpen
            ? 'bg-[#232325] text-[#ededed] border border-[#3b82f6]/50'
            : 'text-[#a1a1a6] hover:text-[#ededed] border border-transparent'
        }`}
      >
        <SlidersHorizontal size={18} strokeWidth={1.5} />
        <span className="text-[11px] font-normal leading-none whitespace-nowrap">
          조절
        </span>
      </button>
    </nav>
  );
};
