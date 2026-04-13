import type { ReactNode } from 'react';

export type TableSeat = 'south' | 'west' | 'north' | 'east';

export interface GameTableProps {
  numPlayers: number;
  mySeatIndex: number;
  renderSlot: (slot: TableSeat, seatIndex: number | null) => ReactNode;
  center: ReactNode;
  className?: string;
}

function layoutForPlayers(
  n: number,
): { slot: TableSeat; offset: number }[] {
  if (n >= 4) {
    return [
      { slot: 'south', offset: 0 },
      { slot: 'west', offset: 1 },
      { slot: 'north', offset: 2 },
      { slot: 'east', offset: 3 },
    ];
  }
  if (n === 3) {
    return [
      { slot: 'south', offset: 0 },
      { slot: 'west', offset: 1 },
      { slot: 'north', offset: 2 },
    ];
  }
  return [
    { slot: 'south', offset: 0 },
    { slot: 'north', offset: 1 },
  ];
}

function slotToPositionClass(slot: TableSeat): string {
  switch (slot) {
    case 'south':
      return 'bottom-[6%] left-1/2 -translate-x-1/2';
    case 'north':
      return 'top-[5%] left-1/2 -translate-x-1/2';
    case 'west':
      return 'left-[4%] top-1/2 -translate-y-1/2';
    case 'east':
      return 'right-[4%] top-1/2 -translate-y-1/2';
    default:
      return '';
  }
}

export function GameTable({
  numPlayers,
  mySeatIndex,
  renderSlot,
  center,
  className = '',
}: GameTableProps) {
  const n = Math.min(Math.max(numPlayers, 2), 4);
  const layout = layoutForPlayers(n);

  return (
    <div
      className={`felt-table felt-noise relative mx-auto aspect-[16/10] w-full max-w-6xl overflow-hidden rounded-[3rem] border border-gold/30 shadow-2xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-[2%] rounded-[2.5rem] border border-gold/15" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06),transparent_55%)]" />

      {layout.map(({ slot, offset }) => {
        const seatIndex = (mySeatIndex + offset) % n;
        return (
          <div
            key={slot}
            className={`absolute z-20 flex flex-col items-center gap-2 ${slotToPositionClass(slot)}`}
          >
            {renderSlot(slot, seatIndex)}
          </div>
        );
      })}

      <div className="pointer-events-auto absolute left-1/2 top-1/2 z-30 w-[52%] max-w-xl -translate-x-1/2 -translate-y-1/2">
        {center}
      </div>
    </div>
  );
}
