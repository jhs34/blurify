export class HistoryManager<T> {
  private stack: T[] = [];
  private index = -1;
  private readonly maxEntries: number;

  constructor(maxEntries = 20) {
    this.maxEntries = Math.max(2, maxEntries);
  }

  reset(initialState?: T): void {
    this.stack = [];
    this.index = -1;
    if (initialState !== undefined) {
      this.push(initialState);
    }
  }

  push(snapshot: T): void {
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }
    this.stack.push(snapshot);
    if (this.stack.length > this.maxEntries) {
      this.stack.shift();
      this.index = this.stack.length - 1;
    } else {
      this.index = this.stack.length - 1;
    }
  }

  undo(): T | null {
    if (!this.canUndo) return null;
    this.index -= 1;
    return this.stack[this.index] ?? null;
  }

  redo(): T | null {
    if (!this.canRedo) return null;
    this.index += 1;
    return this.stack[this.index] ?? null;
  }

  get current(): T | null {
    if (this.index < 0 || this.index >= this.stack.length) return null;
    return this.stack[this.index];
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index >= 0 && this.index < this.stack.length - 1;
  }

  get step(): number {
    return this.index;
  }

  get length(): number {
    return this.stack.length;
  }
}
