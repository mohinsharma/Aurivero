import { ColorType } from 'lightweight-charts';
import { ResolvedTheme } from '../../context/ThemeContext';

export function getLightweightChartTheme(theme: ResolvedTheme) {
  if (theme === 'light') {
    return {
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: '#17211D',
      },
      grid: {
        vertLines: { color: '#E3EAE5' },
        horzLines: { color: '#E3EAE5' },
      },
      borderColor: '#E3EAE5',
      crosshairColor: '#68756E',
      labelBg: '#F0F4F1',
    };
  }
  return {
    layout: {
      background: { type: ColorType.Solid, color: '#121E19' },
      textColor: '#9AAEA2',
    },
    grid: {
      vertLines: { color: 'rgba(41, 59, 49, 0.55)' },
      horzLines: { color: 'rgba(41, 59, 49, 0.55)' },
    },
    borderColor: '#293B31',
    crosshairColor: '#6F8579',
    labelBg: '#182720',
  };
}
