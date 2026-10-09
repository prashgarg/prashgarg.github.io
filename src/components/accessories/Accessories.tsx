import { CalculatorIcon, FocusTimerIcon, NotepadIcon, PaintIcon, FilingCabinetIcon, AmbientMixerIcon, SequencerIcon } from './AccessoryIcons';

export type AccessoryId = 'notepad' | 'paint' | 'calculator' | 'focus' | 'cabinet' | 'ambient' | 'sequencer';
const items = [
  { id: 'notepad', label: 'Notepad', Icon: NotepadIcon },
  { id: 'paint', label: 'Paint', Icon: PaintIcon },
  { id: 'calculator', label: 'Calculator', Icon: CalculatorIcon },
  { id: 'focus', label: 'Focus timer', Icon: FocusTimerIcon },
  { id: 'cabinet', label: 'Filing cabinet', Icon: FilingCabinetIcon },
  { id: 'ambient', label: 'Ambient mixer', Icon: AmbientMixerIcon },
  { id: 'sequencer', label: 'Music sequencer', Icon: SequencerIcon },
] as const;

export default function Accessories({ onOpen }: { onOpen: (id: AccessoryId) => void }) {
  return <div className="accessory-app">
    <div className="accessories-folder" aria-label="Accessories folder">
      {items.map(({id,label,Icon})=><button key={id} className="accessories-shortcut" onClick={()=>onOpen(id)}>
        <Icon/><span>{label}</span>
      </button>)}
    </div>
    <p className="accessory-status">{items.length} items</p>
  </div>;
}
