export type ToolType = 'move' | 'brush' | 'rect' | 'ellipse' | 'linear';

export type EffectType = 'blur' | 'pixelate';

export type MaskAction = 'draw' | 'erase';

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EditorSettings {
  tool: ToolType;
  action: MaskAction;
  effectType: EffectType;
  strength: number; // 0..100
  size: number; // 5..300 (brush size relative to 1000px base)
  feather: number; // 0..100 (%)
  angle: number; // 0..359 (degrees for rect / ellipse)
  overlayEnabled: boolean;
  overlayColor: string;
}

export interface ImageMeta {
  name: string;
  width: number;
  height: number;
}
