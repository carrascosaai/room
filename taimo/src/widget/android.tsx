import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlexWidget, TextWidget, type WidgetTaskHandler } from 'react-native-android-widget';

import type { WidgetData } from './data';

export const WIDGET_KEY = 'taimo:widget';
export const WIDGET_NAME = 'TaimoWidget';

const MINT = '#2EE59D';
const BG = '#0A0F0D';
const TEXT = '#F2FBF7';
const MUTED = '#9BB0A8';

/** Widget de Android: cuánto te queda, cuánto puedes gastar al día y botones para apuntar. */
export function TaimoAndroidWidget({ data }: { data: WidgetData | null }) {
  const pct = Math.max(0, Math.min(1, data?.progress ?? 0));
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BG, borderRadius: 22, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={data?.title ?? 'Taimo'} style={{ fontSize: 12, color: MUTED }} />
        <TextWidget text={data?.left ?? '—'} style={{ fontSize: 28, fontWeight: 'bold', color: data?.over ? '#EF4444' : TEXT }} />
        <FlexWidget style={{ height: 6, width: 'match_parent', backgroundColor: '#1A2420', borderRadius: 3, marginTop: 4, marginBottom: 4 }}>
          <FlexWidget style={{ height: 6, width: Math.max(1, Math.round(pct * 260)), backgroundColor: data?.over ? '#EF4444' : MINT, borderRadius: 3 }} />
        </FlexWidget>
        <TextWidget text={data?.perDay ?? ''} style={{ fontSize: 12, color: MUTED }} maxLines={2} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'taimo://add' }}
          style={{ flex: 1, backgroundColor: MINT, borderRadius: 16, padding: 6, marginRight: 6, alignItems: 'center' }}
        >
          <TextWidget text={`+ ${data?.add ?? ''}`} style={{ fontSize: 13, fontWeight: 'bold', color: '#04140D' }} />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'taimo://add?scan=1' }}
          style={{ flex: 1, backgroundColor: '#1A2420', borderRadius: 16, padding: 6, alignItems: 'center' }}
        >
          <TextWidget text={data?.scan ?? '📷'} style={{ fontSize: 13, fontWeight: 'bold', color: TEXT }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

async function readData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEY);
    return raw ? (JSON.parse(raw) as WidgetData) : null;
  } catch {
    return null;
  }
}

/** Android pide dibujar el widget (al añadirlo, cada 30 min o al cambiar de tamaño). */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;
  renderWidget(<TaimoAndroidWidget data={await readData()} />);
};
