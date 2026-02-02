import React from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Create Playlist Dialog
export const CreatePlaylistDialog = ({
  open,
  onOpenChange,
  name,
  setName,
  description,
  setDescription,
  onCreate,
  trigger
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Playlist</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium text-gray-900 mb-2 block">
            Playlist Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Playlist"
            className="bg-gray-50"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-900 mb-2 block">
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="bg-gray-50"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onCreate}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
          >
            <Check className="w-4 h-4 mr-2" />
            Create
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// Edit Playlist Dialog
export const EditPlaylistDialog = ({
  open,
  onOpenChange,
  playlist,
  setPlaylist,
  onSave
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Playlist</DialogTitle>
      </DialogHeader>
      {playlist && (
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Playlist Name *
            </label>
            <Input
              value={playlist.name}
              onChange={(e) => setPlaylist({...playlist, name: e.target.value})}
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Description
            </label>
            <Input
              value={playlist.description || ''}
              onChange={(e) => setPlaylist({...playlist, description: e.target.value})}
              className="bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={onSave}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

// Share Playlist Dialog
export const SharePlaylistDialog = ({
  open,
  onOpenChange,
  playlist,
  onCopyLink,
  onShareTwitter
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Share Playlist</DialogTitle>
      </DialogHeader>
      {playlist && (
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Share Link
            </label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/playlist/${playlist.id}`}
                readOnly
                className="bg-gray-50"
              />
              <Button onClick={onCopyLink}>
                Copy
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={onShareTwitter}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Share on Twitter
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

// Edit Podcast Dialog
export const EditPodcastDialog = ({
  open,
  onOpenChange,
  podcast,
  setPodcast,
  onSave
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit Podcast</DialogTitle>
      </DialogHeader>
      {podcast && (
        <div className="space-y-4 mt-4">
          <div>
            <Label>Title</Label>
            <Input 
              value={podcast.title}
              onChange={(e) => setPodcast({...podcast, title: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea 
              value={podcast.description}
              onChange={(e) => setPodcast({...podcast, description: e.target.value})}
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input 
              value={podcast.tags?.join(', ')}
              onChange={(e) => setPodcast({...podcast, tags: e.target.value.split(',').map(t => t.trim())})}
              className="mt-1"
              placeholder="tech, interview, crypto"
            />
          </div>
          <div>
            <Label>Visibility</Label>
            <Select 
              value={podcast.visibility || 'public'}
              onValueChange={(value) => setPodcast({...podcast, visibility: value})}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={onSave} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);
