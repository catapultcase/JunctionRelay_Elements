import { useState, useEffect } from 'react';
import { useElementHost } from '@junctionrelay/element-sdk';
import type { ElementRendererProps } from '@junctionrelay/element-sdk';

export const Renderer: React.FC<ElementRendererProps> = ({
  properties,
  resolvedValues,
  width,
  height,
  showPlaceholders,
}) => {
  const { fonts } = useElementHost();
  const [fontReady, setFontReady] = useState(false);

  const sensorTag = properties.sensorTag as string;
  const label = properties.label as string;
  const fontSize = properties.fontSize as number;
  const textColor = properties.textColor as string;
  const backgroundColor = properties.backgroundColor as string;
  const showLabel = properties.showLabel as boolean;
  const showUnit = properties.showUnit as boolean;
  const fontFamily = (properties.fontFamily as string) || 'Inter';

  // Load font on mount / change
  useEffect(() => {
    let mounted = true;
    setFontReady(false);
    fonts.loadGoogleFont(fontFamily).then(() => {
      if (mounted) setFontReady(true);
    });
    return () => { mounted = false; };
  }, [fontFamily, fonts]);

  // Resolve sensor value
  const sensor = sensorTag ? resolvedValues[sensorTag] : undefined;
  const displayValue = sensor?.value ?? (showPlaceholders ? '---' : '');
  const displayUnit = sensor?.unit ?? '';
  const displayLabel = sensor?.label ?? label;

  // Hide unit for meta-types
  const unitText = showUnit && displayUnit && displayUnit !== 'text' && displayUnit !== 'boolean'
    ? ` ${displayUnit}`
    : '';

  if (!fontReady) return null;

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
        fontFamily,
        overflow: 'hidden',
      }}
    >
      {showLabel && displayLabel && (
        <div
          style={{
            fontSize: Math.max(10, fontSize * 0.5),
            color: textColor,
            opacity: 0.7,
            marginBottom: 2,
          }}
        >
          {displayLabel}
        </div>
      )}
      <div
        style={{
          fontSize,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.1,
        }}
      >
        {displayValue}{unitText}
      </div>
    </div>
  );
};
