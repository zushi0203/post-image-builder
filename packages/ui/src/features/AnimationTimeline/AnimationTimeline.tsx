import React from "react";
import "./AnimationTimeline.css";

export interface FrameInfo {
  id: string;
  imageData: HTMLImageElement;
  delay: number;
  width: number;
  height: number;
}

export interface AnimationTimelineLayer {
  id: string;
  name: string;
  visible: boolean;
  frames: FrameInfo[];
  currentFrameIndex: number;
}

export interface AnimationTimelineProps {
  layers: AnimationTimelineLayer[];
  onFrameSelect: (layerId: string, frameIndex: number) => void;
  className?: string;
}

export const AnimationTimeline: React.FC<AnimationTimelineProps> = ({
  layers,
  onFrameSelect,
  className = "",
}) => {
  const gifLayers = layers.filter((layer) => layer.frames.length);

  if (gifLayers.length === 0) {
    return null;
  }

  const handleFrameClick = (layerId: string, frameIndex: number) => {
    onFrameSelect(layerId, frameIndex);
  };

  return (
    <div className={`animation-timeline ${className}`}>
      <div className="timeline-header">
        <h3>フレーム表示</h3>
      </div>

      <div className="timeline-content">
        {gifLayers.map((layer) => (
          <div key={layer.id} className="timeline-layer">
            <div className="layer-info">
              <span className="layer-name">{layer.name}</span>
              <span className="frame-count">
                ({layer.frames.length} frames)
              </span>
            </div>

            <div className="frames-container">
              {layer.frames.map((frame, index) => (
                <button
                  key={frame.id}
                  type="button"
                  className={`frame-thumbnail ${
                    index === layer.currentFrameIndex ? "active" : ""
                  }`}
                  onClick={() => handleFrameClick(layer.id, index)}
                  title={`Frame ${index + 1} (${frame.delay}ms)`}
                >
                  <div className="frame-image">
                    <img
                      src={frame.imageData.src}
                      alt={`Frame ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onError={() => {
                        console.warn(
                          `Failed to load frame image for ${layer.name} frame ${index + 1}`,
                        );
                      }}
                    />
                  </div>
                  <div className="frame-number">{index + 1}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
