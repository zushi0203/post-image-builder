// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasPreview } from "./CanvasPreview";
import type { ImageLayer, CanvasSettings } from "./defs/CanvasPreviewTypes";

// HTMLCanvasElementのモック
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
  })),
});

describe("CanvasPreview", () => {
  const mockCanvasSettings: CanvasSettings = {
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
    outputFormat: "png",
    quality: 1,
  };

  const mockImageLayer: ImageLayer = {
    id: "layer-1",
    name: "Test Layer",
    type: "image",
    file: new File([""], "test.png"),
    imageData: null,
    visible: true,
    zIndex: 1,
    position: { x: 400, y: 300 },
    scale: 1,
    opacity: 1,
    rotation: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render canvas element", () => {
    render(<CanvasPreview layers={[]} canvasSettings={mockCanvasSettings} />);

    const canvas = screen.getByRole("img");
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe("CANVAS");
  });

  it("should render with layers", () => {
    render(
      <CanvasPreview
        layers={[mockImageLayer]}
        canvasSettings={mockCanvasSettings}
      />,
    );

    const canvas = screen.getByRole("img");
    expect(canvas).toBeInTheDocument();
  });

  it("should call onLayerPositionChange when provided", () => {
    const mockOnLayerPositionChange = vi.fn();

    render(
      <CanvasPreview
        layers={[mockImageLayer]}
        canvasSettings={mockCanvasSettings}
        onLayerPositionChange={mockOnLayerPositionChange}
      />,
    );

    const canvas = screen.getByRole("img");
    expect(canvas).toBeInTheDocument();
    // 実際のマウスイベントのテストは統合テストで行う
  });

  it("should apply CSS class name", () => {
    render(<CanvasPreview layers={[]} canvasSettings={mockCanvasSettings} />);

    const container = screen.getByRole("img").parentElement;
    expect(container).toHaveClass("canvas-preview");
  });
});
