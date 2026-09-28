import React from 'react';

// URL regex matching http, https, and www prefixes
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;

interface AutoLinkTextProps {
  text?: string | null;
  className?: string;
}

export const AutoLinkText: React.FC<AutoLinkTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          const href = part.startsWith('http') ? part : `https://${part}`;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 font-medium break-all hover:underline cursor-pointer"
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
