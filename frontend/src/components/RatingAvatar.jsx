import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getRatingBorderClass } from '../utils/ratingUtils';

/**
 * RatingAvatar - Avatar component with dynamic border color based on rating
 * 
 * @param {object} props
 * @param {string} props.src - Avatar image URL
 * @param {string} props.fallback - Fallback text (usually initials)
 * @param {number} props.rating - User rating (0-100)
 * @param {string} props.size - Size: 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} props.className - Additional CSS classes
 */
export const RatingAvatar = ({ 
  src, 
  fallback = '?', 
  rating = 0, 
  size = 'md',
  className = '' 
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-10 h-10 border-2',
    md: 'w-16 h-16 border-4',
    lg: 'w-24 h-24 border-4',
    xl: 'w-32 h-32 border-[6px]'
  };
  
  // Get rating-based border color
  const borderClass = getRatingBorderClass(rating);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <Avatar className={`${sizeClass} ${borderClass} ${className}`}>
      <AvatarImage src={src} alt={`Avatar with rating ${rating}`} />
      <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};

export default RatingAvatar;
