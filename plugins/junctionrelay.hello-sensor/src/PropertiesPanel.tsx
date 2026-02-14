import { useCallback } from 'react';
import {
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  Typography,
  Box,
} from '@mui/material';
import type { ElementPropertiesPanelProps } from '@junctionrelay/element-sdk';

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
        label="Sensor Tag"
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
          Font Size: {properties.fontSize as number}px
        </Typography>
        <Slider
          size="small"
          min={8}
          max={120}
          value={(properties.fontSize as number) ?? 24}
          onChange={(_, v) => update('fontSize', v)}
        />
      </Box>

      <TextField
        label="Text Color"
        size="small"
        fullWidth
        type="color"
        value={(properties.textColor as string) ?? '#FFFFFF'}
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
            checked={(properties.showLabel as boolean) ?? true}
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
