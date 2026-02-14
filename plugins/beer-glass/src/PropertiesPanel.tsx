import { useCallback } from 'react';
import {
  TextField,
  Switch,
  FormControlLabel,
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
        helperText="Bind to a 0–100 % sensor value"
      />

      <TextField
        label="Beer Color"
        size="small"
        fullWidth
        type="color"
        value={(properties.beerColor as string) ?? '#F59E0B'}
        onChange={(e) => update('beerColor', e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <TextField
        label="Foam Color"
        size="small"
        fullWidth
        type="color"
        value={(properties.foamColor as string) ?? '#FEF3C7'}
        onChange={(e) => update('foamColor', e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <TextField
        label="Glass Tint"
        size="small"
        fullWidth
        value={(properties.glassColor as string) ?? 'rgba(255,255,255,0.3)'}
        onChange={(e) => update('glassColor', e.target.value)}
        helperText="CSS color for glass outline"
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={(properties.showPercentage as boolean) ?? true}
            onChange={(e) => update('showPercentage', e.target.checked)}
          />
        }
        label="Show Percentage"
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={(properties.showBubbles as boolean) ?? true}
            onChange={(e) => update('showBubbles', e.target.checked)}
          />
        }
        label="Show Bubbles"
      />
    </Box>
  );
};
