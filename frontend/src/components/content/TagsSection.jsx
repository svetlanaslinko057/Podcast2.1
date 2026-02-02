import React from 'react';
import { Tag, Coins, Building, User, Hash, Globe } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

const TAG_CATEGORIES = {
  tokens: { icon: Coins, color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', label: 'Tokens' },
  exchanges: { icon: Building, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', label: 'Exchanges' },
  topics: { icon: Hash, color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', label: 'Topics' },
  people: { icon: User, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', label: 'People' },
  projects: { icon: Globe, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', label: 'Projects' },
  other: { icon: Tag, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200', label: 'Other' }
};

export const TagsSection = ({ tags = [], categorizedTags = {}, onTagClick }) => {
  // If no categorized tags, show flat list
  const hasCategorized = Object.values(categorizedTags).some(arr => arr?.length > 0);
  
  if (!hasCategorized && tags.length === 0) return null;

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-emerald-500" />
        Tags & Topics
      </h3>

      {hasCategorized ? (
        <div className="space-y-4">
          {Object.entries(categorizedTags).map(([category, tagList]) => {
            if (!tagList || tagList.length === 0) return null;
            
            const config = TAG_CATEGORIES[category] || TAG_CATEGORIES.other;
            const Icon = config.icon;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">{config.label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tagList.map((tag, idx) => (
                    <Badge
                      key={idx}
                      className={`${config.color} cursor-pointer transition-all`}
                      onClick={() => onTagClick && onTagClick(tag)}
                    >
                      {category === 'tokens' && '$'}{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <Badge
              key={idx}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-all"
              onClick={() => onTagClick && onTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
};

export default TagsSection;
