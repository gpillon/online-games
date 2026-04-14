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
      { slot: 'east', offset: 1 },
      { slot: 'north', offset: 2 },
      { slot: 'west', offset: 3 },
    ];
  }
  if (n === 3) {
    return [
      { slot: 'south', offset: 0 },
      { slot: 'east', offset: 1 },
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
      return 'bottom-[4%] left-1/2 max-w-[min(100%,22rem)] -translate-x-1/2 px-1 sm:bottom-[6%] sm:max-w-none sm:px-0';
    case 'north':
      return 'top-[3%] left-1/2 max-w-[min(100%,20rem)] -translate-x-1/2 px-1 sm:top-[5%] sm:max-w-none sm:px-0';
    case 'west':
      return 'left-[2%] top-1/2 -translate-y-1/2 sm:left-[4%]';
    case 'east':
      return 'right-[2%] top-1/2 -translate-y-1/2 sm:right-[4%]';
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
      className={`felt-table felt-noise relative mx-auto aspect-[4/5] w-full max-w-full overflow-hidden rounded-2xl border border-gold/30 shadow-2xl sm:aspect-[16/10] sm:max-w-6xl sm:rounded-[3rem] ${className}`}
    >
      <div className="pointer-events-none absolute inset-[2%] rounded-xl border border-gold/15 sm:rounded-[2.5rem]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06),transparent_55%)]" />

      {layout.map(({ slot, offset }) => {
        const seatIndex = (mySeatIndex + offset) % n;
        return (
          <div
            key={slot}
            className={`absolute z-20 flex max-w-full flex-col items-center gap-1 sm:gap-2 ${slotToPositionClass(slot)}`}
          >
            {renderSlot(slot, seatIndex)}
          </div>
        );
      })}

      <div className="pointer-events-auto absolute left-1/2 top-1/2 z-30 w-[min(92%,20rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 sm:w-[52%] sm:max-w-xl">
        {center}
      </div>
    </div>
  );
}
