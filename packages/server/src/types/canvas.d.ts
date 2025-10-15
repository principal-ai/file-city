// Canvas type declarations for server-side rendering
// These types are provided by the 'canvas' npm package at runtime

declare global {
  interface CanvasRenderingContext2D {
    // Basic properties and methods from node-canvas
    // Using unknown for index signature as we don't know all possible properties
    [key: string]: unknown;

    // Explicitly type the methods we actually use
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    fillRect(x: number, y: number, width: number, height: number): void;
    strokeRect(x: number, y: number, width: number, height: number): void;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  }

  class Path2D {
    constructor();
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
  }
}

export {};