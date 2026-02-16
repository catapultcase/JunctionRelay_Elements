import { useCallback } from 'react';
import {
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import type { ElementPropertiesPanelProps } from '@junctionrelay/element-sdk';

const FILL_CHARS = [
  { value: '█', label: '█ Block' },
  { value: '#', label: '# Hash' },
  { value: '@', label: '@ At' },
  { value: '*', label: '* Star' },
  { value: '▓', label: '▓ Shade' },
  { value: '░', label: '░ Light' },
] as const;

export const PropertiesPanel: React.FC<ElementPropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
}) => {
  const { id, properties } = selectedElement;

  const update = useCallback(
    (key: string, value: unknown) => {
      onUpdateElement(id, { properties: { ...properties, [key]: value } });
    },
    [id, properties, onUpdateElement],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="SensorTag"
        size="small"
        fullWidth
        value={(properties.sensorTag as string) ?? ''}
        onChange={(e) => update('sensorTag', e.target.value)}
      />

      <TextField
        label="Label"
        size="small"
        fullWidth
        value={(properties.label as string) ?? ''}
        onChange={(e) => update('label', e.target.value)}
      />

      <Box>
        <Typography variant="caption" gutterBottom>
          Fill Character
        </Typography>
        <ToggleButtonGroup
          value={(properties.fillChar as string) ?? '█'}
          exclusive
          onChange={(_, v) => { if (v !== null) update('fillChar', v); }}
          size="small"
          fullWidth
          sx={{ mt: 0.5 }}
        >
          {FILL_CHARS.map((fc) => (
            <ToggleButton
              key={fc.value}
              value={fc.value}
              sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            >
              {fc.value}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <TextField
        label="Text Color"
        size="small"
        fullWidth
        type="color"
        value={(properties.textColor as string) ?? '#00FF00'}
        onChange={(e) => update('textColor', e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <TextField
        label="Background Color"
        size="small"
        fullWidth
        value={(properties.backgroundColor as string) ?? 'transparent'}
        onChange={(e) => update('backgroundColor', e.target.value)}
        helperText="CSS color or 'transparent'"
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={(properties.showLabel as boolean) ?? false}
            onChange={(e) => update('showLabel', e.target.checked)}
          />
        }
        label="Show Label"
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={(properties.showUnit as boolean) ?? true}
            onChange={(e) => update('showUnit', e.target.checked)}
          />
        }
        label="Show Unit"
      />
    </Box>
  );
};
