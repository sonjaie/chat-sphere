import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏',
    '🎉', '🎊', '🔥', '💯', '⭐', '✨', '💫', '🌟',
    '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
    '😴', '😪', '😵', '🤪', '🤨', '🧐', '🤓', '😎'
  ];

  return (
    <div 
      ref={pickerRef}
      className="bg-card border border-border rounded-lg shadow-lg p-2 sm:p-3 md:p-4 w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:w-64"
      data-testid="emoji-picker-container"
    >
      <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-8 gap-1 sm:gap-1 md:gap-2 max-h-48 overflow-y-auto">
        {emojis.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className="p-2 sm:p-2 md:p-2 hover:bg-muted rounded text-lg h-auto aspect-square min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] md:min-h-[44px] md:min-w-[44px]"
            onClick={() => onEmojiSelect(emoji)}
            data-testid={`emoji-${emoji}`}
          >
            {emoji}
          </Button>
        ))}
      </div>
    </div>
  );
}
