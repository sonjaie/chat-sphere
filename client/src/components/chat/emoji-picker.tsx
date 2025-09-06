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
      className="bg-card border border-border rounded-lg shadow-lg p-3 w-64"
      data-testid="emoji-picker-container"
    >
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {emojis.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-muted rounded text-lg h-auto aspect-square"
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
