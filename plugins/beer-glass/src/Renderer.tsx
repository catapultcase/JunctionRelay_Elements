import { useId } from 'react';
import type { ElementRendererProps } from '@junctionrelay/element-sdk';

// Glass interior geometry (viewBox 0 0 100 170)
const TOP_Y = 14;
const BOT_Y = 150;
const INT_H = BOT_Y - TOP_Y; // 136
const TOP_L = 17;
const TOP_R = 83;
const BOT_L = 29;
const BOT_R = 71;

const leftAt = (y: number) => BOT_L + (TOP_L - BOT_L) * (BOT_Y - y) / INT_H;
const rightAt = (y: number) => BOT_R + (TOP_R - BOT_R) * (BOT_Y - y) / INT_H;

const INTERIOR_PATH = `M ${TOP_L} ${TOP_Y} L ${BOT_L} ${BOT_Y} Q ${BOT_L} ${BOT_Y + 5} ${BOT_L + 5} ${BOT_Y + 5} L ${BOT_R - 5} ${BOT_Y + 5} Q ${BOT_R} ${BOT_Y + 5} ${BOT_R} ${BOT_Y} L ${TOP_R} ${TOP_Y} Z`;
const OUTLINE_PATH = `M ${TOP_L - 3} ${TOP_Y - 4} L ${BOT_L - 2} ${BOT_Y + 2} Q ${BOT_L - 2} ${BOT_Y + 10} ${BOT_L + 8} ${BOT_Y + 10} L ${BOT_R - 8} ${BOT_Y + 10} Q ${BOT_R + 2} ${BOT_Y + 10} ${BOT_R + 2} ${BOT_Y + 2} L ${TOP_R + 3} ${TOP_Y - 4} Z`;

const BUBBLES = [
  { cx: 42, r: 1.5, dur: 3, delay: 0 },
  { cx: 56, r: 2, dur: 2.5, delay: 0.7 },
  { cx: 48, r: 1, dur: 3.5, delay: 1.2 },
  { cx: 62, r: 1.8, dur: 2.8, delay: 0.3 },
  { cx: 37, r: 1.2, dur: 3.2, delay: 1.8 },
];

export const Renderer: React.FC<ElementRendererProps> = ({
  properties,
  resolvedValues,
  width,
  height,
  showPlaceholders,
}) => {
  const uid = useId().replace(/:/g, '');

  const sensorTag = properties.sensorTag as string;
  const beerColor = (properties.beerColor as string) || '#F59E0B';
  const foamColor = (properties.foamColor as string) || '#FEF3C7';
  const glassColor = (properties.glassColor as string) || 'rgba(255,255,255,0.3)';
  const showPercentage = (properties.showPercentage as boolean) ?? true;
  const showBubbles = (properties.showBubbles as boolean) ?? true;

  // Resolve sensor value (expects 0–100 percentage)
  const sensor = sensorTag ? resolvedValues[sensorTag] : undefined;
  const rawValue = sensor?.value;
  const percentage = typeof rawValue === 'number'
    ? Math.max(0, Math.min(100, rawValue))
    : (showPlaceholders ? 65 : 0);

  // Beer fill level
  const fillY = BOT_Y - INT_H * (percentage / 100);
  const leftFill = leftAt(fillY);
  const rightFill = rightAt(fillY);

  // Foam
  const foamH = percentage > 0 ? Math.min(12, 3 + percentage * 0.09) : 0;
  const foamTopY = Math.max(TOP_Y, fillY - foamH);
  const leftFoamTop = leftAt(foamTopY);
  const rightFoamTop = rightAt(foamTopY);
  const foamW = rightFoamTop - leftFoamTop;

  const foamPath = percentage > 0
    ? [
        `M ${leftFoamTop} ${foamTopY}`,
        `Q ${leftFoamTop + foamW * 0.15} ${foamTopY - 4} ${leftFoamTop + foamW * 0.3} ${foamTopY}`,
        `Q ${leftFoamTop + foamW * 0.5} ${foamTopY - 5} ${leftFoamTop + foamW * 0.7} ${foamTopY}`,
        `Q ${leftFoamTop + foamW * 0.85} ${foamTopY - 3.5} ${rightFoamTop} ${foamTopY}`,
        `L ${rightFill} ${fillY}`,
        `L ${leftFill} ${fillY}`,
        `Z`,
      ].join(' ')
    : '';

  return (
    <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 170" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
        <defs>
          <clipPath id={`${uid}-glass`}>
            <path d={INTERIOR_PATH} />
          </clipPath>
          <clipPath id={`${uid}-beer`}>
            <rect x="0" y={fillY} width="100" height={BOT_Y - fillY + 10} />
          </clipPath>
          <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={beerColor} stopOpacity={0.85} />
            <stop offset="100%" stopColor={beerColor} />
          </linearGradient>
        </defs>

        {/* ---- contents clipped to glass interior ---- */}
        <g clipPath={`url(#${uid}-glass)`}>
          {/* Beer liquid */}
          {percentage > 0 && (
            <rect
              x="0" y={fillY}
              width="100" height={BOT_Y - fillY + 10}
              fill={`url(#${uid}-grad)`}
            />
          )}

          {/* Foam head */}
          {percentage > 0 && <path d={foamPath} fill={foamColor} />}

          {/* Rising bubbles (clipped to beer region) */}
          {showBubbles && percentage > 5 && (
            <g clipPath={`url(#${uid}-beer)`}>
              {BUBBLES.map((b, i) => (
                <circle key={i} cx={b.cx} r={b.r} fill="rgba(255,255,255,0.45)">
                  <animate
                    attributeName="cy"
                    values={`${BOT_Y};${fillY}`}
                    dur={`${b.dur}s`}
                    begin={`${b.delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.5;0.4;0"
                    dur={`${b.dur}s`}
                    begin={`${b.delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          )}

          {/* Glass reflection highlight */}
          <path
            d={`M ${TOP_L + 2} ${TOP_Y + 8} L ${BOT_L + 2} ${BOT_Y - 8} L ${BOT_L + 5} ${BOT_Y - 8} L ${TOP_L + 5} ${TOP_Y + 8} Z`}
            fill="rgba(255,255,255,0.09)"
          />
        </g>

        {/* ---- glass outline ---- */}
        <path
          d={OUTLINE_PATH}
          fill="none"
          stroke={glassColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* Glass rim */}
        <line
          x1={TOP_L - 4} y1={TOP_Y - 4}
          x2={TOP_R + 4} y2={TOP_Y - 4}
          stroke={glassColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Glass base */}
        <line
          x1={BOT_L - 6} y1={BOT_Y + 10}
          x2={BOT_R + 6} y2={BOT_Y + 10}
          stroke={glassColor}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Percentage label */}
        {showPercentage && (
          <text
            x="50"
            y={(TOP_Y + BOT_Y) / 2 + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={3}
            paintOrder="stroke"
            fontSize={16}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {Math.round(percentage)}%
          </text>
        )}
      </svg>
    </div>
  );
};
