import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, Save, Loader2, Lock, Globe } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function NFTSettings() {
  const [podcasts, setPodcasts] = useState([]);
  const [selectedPodcast, setSelectedPodcast] = useState('');
  const [gateConfig, setGateConfig] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [gateType, setGateType] = useState('any');
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPodcasts();
  }, []);

  useEffect(() => {
    if (selectedPodcast) {
      loadGateConfig();
    }
  }, [selectedPodcast]);

  const loadPodcasts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/podcasts?author_id=demo-author-123&limit=100`);
      setPodcasts(response.data);
    } catch (error) {
      console.error('Failed to load podcasts:', error);
    }
  };

  const loadGateConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/nft/gates/${selectedPodcast}`);
      setGateConfig(response.data);
      setEnabled(response.data.enabled || false);
      setGateType(response.data.gate_type || 'any');
      setCollections(response.data.collections || []);
    } catch (error) {
      console.error('Failed to load gate config:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCollection = () => {
    setCollections([...collections, {
      contract_address: '',
      chain: 'ethereum',
      token_ids: [],
      min_balance: 1
    }]);
  };

  const removeCollection = (index) => {
    setCollections(collections.filter((_, i) => i !== index));
  };

  const updateCollection = (index, field, value) => {
    const updated = [...collections];
    updated[index] = { ...updated[index], [field]: value };
    setCollections(updated);
  };

  const saveConfiguration = async () => {
    if (!selectedPodcast) {
      toast.error('Please select a podcast');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('podcast_id', selectedPodcast);
      formData.append('enabled', enabled);
      formData.append('gate_type', gateType);
      formData.append('collections_json', JSON.stringify(collections));

      await axios.post(`${API_URL}/api/nft/configure`, formData);
      toast.success('NFT gate configured successfully!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full text-purple-700 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            NFT-Gated Content
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            NFT <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Gating</span>
          </h1>
          <p className="text-gray-600">
            Configure token-gated access to your premium podcast episodes
          </p>
        </div>

        {/* Podcast Selection */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Podcast</label>
          <select
            value={selectedPodcast}
            onChange={(e) => setSelectedPodcast(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            data-testid="podcast-select"
          >
            <option value="">Choose a podcast...</option>
            {podcasts.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {selectedPodcast && (
          <>
            {/* Enable/Disable Gate */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Enable NFT Gate</h3>
                  <p className="text-sm text-gray-600">Require NFT ownership to access this podcast</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                    data-testid="enable-nft-gate-toggle"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </div>

            {enabled && (
              <>
                {/* Gate Type */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Gate Type</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      gateType === 'any' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="gate_type"
                        value="any"
                        checked={gateType === 'any'}
                        onChange={(e) => setGateType(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-medium text-gray-900 mb-1">Any Collection</div>
                      <div className="text-sm text-gray-600">User needs NFT from ANY of the collections</div>
                    </label>
                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      gateType === 'all' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="gate_type"
                        value="all"
                        checked={gateType === 'all'}
                        onChange={(e) => setGateType(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-medium text-gray-900 mb-1">All Collections</div>
                      <div className="text-sm text-gray-600">User needs NFT from ALL collections</div>
                    </label>
                  </div>
                </div>

                {/* NFT Collections */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">NFT Collections</h3>
                    <button
                      onClick={addCollection}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                      data-testid="add-collection-btn"
                    >
                      <Plus className="w-4 h-4" />
                      Add Collection
                    </button>
                  </div>

                  {collections.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No collections added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {collections.map((collection, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-medium text-gray-900">Collection #{index + 1}</h4>
                            <button
                              onClick={() => removeCollection(index)}
                              className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Address</label>
                              <input
                                type="text"
                                value={collection.contract_address}
                                onChange={(e) => updateCollection(index, 'contract_address', e.target.value)}
                                placeholder="0x..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chain</label>
                                <select
                                  value={collection.chain}
                                  onChange={(e) => updateCollection(index, 'chain', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                  <option value="ethereum">Ethereum</option>
                                  <option value="polygon">Polygon</option>
                                  <option value="solana">Solana</option>
                                  <option value="arbitrum">Arbitrum</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Balance</label>
                                <input
                                  type="number"
                                  value={collection.min_balance}
                                  onChange={(e) => updateCollection(index, 'min_balance', parseInt(e.target.value))}
                                  min="1"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <button
                  onClick={saveConfiguration}
                  disabled={saving || collections.length === 0}
                  className="w-full px-6 py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
                  data-testid="save-nft-config-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Configuration
                    </>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 mt-6">
          <h4 className="font-semibold text-purple-900 mb-2">How NFT-Gating Works</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Users must connect their wallet to access gated content</li>
            <li>• Ownership is verified on-chain before granting access</li>
            <li>• You can require ownership of specific token IDs or any token from a collection</li>
            <li>• Multiple collections can be configured for tiered access</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
