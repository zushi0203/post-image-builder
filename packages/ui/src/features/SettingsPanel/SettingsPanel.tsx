import {
  Slider,
  NumberField,
  Label,
  Input,
  Select,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  Key,
} from "react-aria-components";
import "./SettingsPanel.css";

export interface SettingsPanelProps {
  scale?: number;
  onScaleChange?: (scale: number) => void;
  outputFormat?: "png" | "gif" | "apng";
  onFormatChange?: (key: Key | null) => void;
  width?: number;
  height?: number;
  onSizeChange?: (width: number, height: number) => void;
  className?: string;
}

export const SettingsPanel = ({
  scale = 1,
  onScaleChange,
  outputFormat = "png",
  onFormatChange,
  width = 1920,
  height = 1080,
  onSizeChange,
  className = "",
}: SettingsPanelProps) => {
  return (
    <div className={`settings-panel ${className}`}>
      <h2 className="settings-panel-title">設定</h2>

      <div className="setting-group">
        <Label className="setting-label">拡大率</Label>
        <Slider
          value={scale}
          onChange={onScaleChange}
          minValue={0.1}
          maxValue={3}
          step={0.1}
          className="scale-slider"
        >
          <div className="slider-track">
            <div className="slider-thumb" />
          </div>
        </Slider>
        <span className="setting-value">{(scale * 100).toFixed(0)}%</span>
      </div>

      <div className="setting-group">
        <Label className="setting-label">出力サイズ</Label>
        <div className="size-inputs">
          <NumberField
            value={width}
            onChange={(value) => onSizeChange?.(value, height)}
            minValue={1}
            className="size-input"
          >
            <Label>幅</Label>
            <Input />
          </NumberField>
          <NumberField
            value={height}
            onChange={(value) => onSizeChange?.(width, value)}
            minValue={1}
            className="size-input"
          >
            <Label>高さ</Label>
            <Input />
          </NumberField>
        </div>
      </div>

      <div className="setting-group">
        <Label className="setting-label">出力形式</Label>
        <Select
          selectedKey={outputFormat}
          onSelectionChange={onFormatChange}
          className="format-select"
        >
          <Button>
            <SelectValue />
            <span aria-hidden="true">▼</span>
          </Button>
          <Popover>
            <ListBox>
              <ListBoxItem id="png">PNG (静止画)</ListBoxItem>
              <ListBoxItem id="gif">GIF (アニメーション)</ListBoxItem>
              <ListBoxItem id="apng">APNG (アニメーション)</ListBoxItem>
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
};

export default SettingsPanel;
