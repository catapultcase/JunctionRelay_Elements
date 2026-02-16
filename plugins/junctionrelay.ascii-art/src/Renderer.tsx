import { useMemo } from 'react';
import type { ElementRendererProps } from '@junctionrelay/element-sdk';
import { renderAsciiArt } from './font.js';

const ROWS = 5;

// Approximate character-cell aspect ratio for common monospace fonts.
// Width ≈ 0.6 × fontSize, height ≈ lineHeight × fontSize.
const CH_WIDTH_RATIO = 0.6;
const LINE_HEIGHT = 1.15;

export const Renderer: React.FC<ElementRendererProps> = ({
  properties,
  resolvedValues,
  width,
  height,
  showPlaceholders,
}) => {
  const sensorTag = properties.sensorTag as string;
  const fillChar = (properties.fillChar as string) || '█';
  const textColor = (properties.textColor as string) || '#00FF00';
  const backgroundColor = (properties.backgroundColor as string) || 'transparent';
  const showUnit = (properties.showUnit as boolean) ?? true;
  const showLabel = (properties.showLabel as boolean) ?? false;
  const label = (properties.label as string) || '';

  // Resolve sensor value
  const sensor = sensorTag ? resolvedValues[sensorTag] : undefined;
  const rawValue = sensor?.displayValue ?? sensor?.value;
  const unit = sensor?.unit ?? '';
  const sensorLabel = sensor?.label ?? (label || 'Value');

  // Build display string
  const displayText = useMemo(() => {
    let text: string;
    if (rawValue !== undefined && rawValue !== null) {
      text = String(rawValue);
    } else if (showPlaceholders) {
      text = '---';
    } else {
      return '';
    }

    // Append unit (skip meta-type units)
    const effectiveUnit = unit || (showPlaceholders ? '~' : '');
    if (showUnit && effectiveUnit && effectiveUnit !== 'text' && effectiveUnit !== 'boolean') {
      text += effectiveUnit;
    }

    return text;
  }, [rawValue, showUnit, unit, showPlaceholders]);

  // Generate ASCII art lines
  const lines = useMemo(
    () => (displayText ? renderAsciiArt(displayText, fillChar) : []),
    [displayText, fillChar],
  );

  // Calculate font size to fit within the element
  const fontSize = useMemo(() => {
    if (lines.length === 0) return 12;
    const maxCols = Math.max(...lines.map((l) => l.length), 1);

    // Reserve space for label row if shown
    const labelRows = showLabel && sensorLabel ? 1.5 : 0;
    const availableHeight = height * 0.95;
    const availableWidth = width * 0.95;

    const fitH = availableHeight / ((ROWS + labelRows) * LINE_HEIGHT);
    const fitW = availableWidth / (maxCols * CH_WIDTH_RATIO);
    return Math.max(4, Math.min(fitH, fitW));
  }, [lines, width, height, showLabel, sensorLabel]);

  if (!displayText) {
    return (
      <div
        style={{
          width,
          height,
          backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          color: textColor,
          opacity: 0.3,
          fontSize: 14,
        }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showLabel && sensorLabel && (
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: fontSize * 0.9,
            color: textColor,
            opacity: 0.6,
            lineHeight: 1.4,
            whiteSpace: 'pre',
          }}
        >
          {sensorLabel}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'monospace',
          fontSize,
          lineHeight: LINE_HEIGHT,
          color: textColor,
          whiteSpace: 'pre',
          letterSpacing: 0,
        }}
      >
        {lines.join('\n')}
      </pre>
    </div>
  );
};
