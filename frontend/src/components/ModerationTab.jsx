import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Eye, Edit, Trash2, Shield, Headphones, Heart, Clock, Lock, Users } from 'lucide-react';
import { PodcastAccessManager } from './PodcastAccessManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

export const ModerationTab = ({ podcasts, onEdit, onDelete, onView }) => {
  const [managingAccess, setManagingAccess] = useState(null); // podcast being managed
  if (podcasts.length === 0) {
    return (
      <Card className="bg-white rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Content Moderation</h2>
          <Badge>0 Podcasts</Badge>
        </div>
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No content to moderate</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Content Moderation</h2>
        <Badge>{podcasts.length} Podcasts</Badge>
      </div>
      
      <div className="space-y-4">
        {podcasts.map(podcast => (
          <Card key={podcast.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              {/* Cover */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-cyan-500 flex-shrink-0">
                {podcast.cover_image ? (
                  <img src={podcast.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Headphones className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{podcast.title}</h3>
                  {podcast.visibility === 'private' && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{podcast.description}</p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {podcast.tags?.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {podcast.views_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {podcast.reactions_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor((podcast.duration || 0) / 60)}m
                  </span>
                  <Badge variant={podcast.visibility === 'public' ? 'default' : 'secondary'}>
                    {podcast.visibility}
                  </Badge>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                {podcast.visibility === 'private' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setManagingAccess(podcast)}
                    className="bg-amber-50 border-amber-200 hover:bg-amber-100"
                    title="Manage Access"
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onView(podcast.id)}
                  data-testid="view-podcast-button"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onEdit(podcast)}
                  data-testid="edit-podcast-button"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => onDelete(podcast.id)}
                  data-testid="delete-podcast-button"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Access Management Dialog */}
      {managingAccess && (
        <Dialog open={!!managingAccess} onOpenChange={() => setManagingAccess(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                Manage Access: {managingAccess.title}
              </DialogTitle>
            </DialogHeader>
            <PodcastAccessManager 
              podcastId={managingAccess.id}
              authorId={managingAccess.author_id}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};