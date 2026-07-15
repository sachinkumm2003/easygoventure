import { useId } from 'react';
import { Input } from '@shared/components/ui/input';
import { ROOM_TYPE_SUGGESTIONS } from '@shared/lib/lead-pricing';

interface RoomTypeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RoomTypeInput({
  value,
  onChange,
  placeholder = 'Standard, Deluxe, Suite...',
  className,
}: RoomTypeInputProps) {
  const id = useId().replace(/:/g, '');
  const listId = `room-types-${id}`;

  return (
    <>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        list={listId}
      />
      <datalist id={listId}>
        {ROOM_TYPE_SUGGESTIONS.map((roomType) => (
          <option key={roomType} value={roomType} />
        ))}
      </datalist>
    </>
  );
}
