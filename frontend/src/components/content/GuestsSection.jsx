import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Twitter, Globe, Building2, Mic } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const API = process.env.REACT_APP_BACKEND_URL;

const ROLE_COLORS = {
  'Host': 'bg-emerald-100 text-emerald-700',
  'Co-host': 'bg-blue-100 text-blue-700',
  'Guest': 'bg-purple-100 text-purple-700',
  'Expert': 'bg-amber-100 text-amber-700'
};

export const GuestsSection = ({ podcastId }) => {
  const [guests, setGuests] = useState([]);

  const fetchGuests = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/content/podcasts/${podcastId}/guests`);
      setGuests(res.data);
    } catch (error) {
      console.error('Failed to fetch guests:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  if (guests.length === 0) return null;

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-purple-500" />
        In This Episode ({guests.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guests.map((guest) => (
          <div 
            key={guest.id} 
            className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 hover:shadow-md transition-all"
          >
            <div className="flex gap-4">
              <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                <AvatarImage src={guest.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-lg">
                  {guest.name?.split(' ').map(n => n[0]).join('') || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-gray-900">{guest.name}</h4>
                  <Badge className={ROLE_COLORS[guest.role] || 'bg-gray-100 text-gray-700'}>
                    {guest.role === 'Host' && <Mic className="w-3 h-3 mr-1" />}
                    {guest.role}
                  </Badge>
                </div>
                
                {guest.company && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {guest.company}
                  </p>
                )}
                
                {guest.bio && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{guest.bio}</p>
                )}
                
                <div className="flex gap-2 mt-2">
                  {guest.twitter && (
                    <a
                      href={`https://twitter.com/${guest.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1DA1F2] hover:text-[#1a8cd8]"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {guest.website && (
                    <a
                      href={guest.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default GuestsSection;
