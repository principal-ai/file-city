// Canvas type declarations for server-side rendering
// These types are provided by the 'canvas' npm package at runtime

declare global {
  interface CanvasRenderingContext2D {
    // Basic properties and methods from node-canvas
    [key: string]: any;
  }

  class Path2D {
    constructor();
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
  }
}

export {};