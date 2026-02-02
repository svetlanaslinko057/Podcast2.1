import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Users, Settings, Save, AlertCircle, Trash2, Ban } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('wallets');
  
  // Wallets state
  const [ownerWallet, setOwnerWallet] = useState('');
  const [adminWallets, setAdminWallets] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  
  // Club settings state
  const [clubSettings, setClubSettings] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [walletsRes, clubRes] = await Promise.all([
        axios.get(`${API}/admin/settings`),
        axios.get(`${API}/club/settings`)
      ]);
      
      setOwnerWallet(walletsRes.data.owner_wallet || '');
      setAdminWallets(walletsRes.data.admin_wallets.length > 0 ? walletsRes.data.admin_wallets : ['']);
      setClubSettings(clubRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const response = await axios.get(`${API}/users`);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
    }
  }, [activeTab]);

  const handleSaveWallets = async () => {
    setSaving(true);
    setMessage(null);

    // Filter empty wallets
    const filteredAdminWallets = adminWallets.filter(w => w.trim() !== '');

    try {
      await axios.post(`${API}/admin/settings`, {
        owner_wallet: ownerWallet.trim(),
        admin_wallets: filteredAdminWallets
      });

      setMessage({ type: 'success', text: 'Настройки успешно сохранены!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Ошибка при сохранении настроек' 
      });
    } finally {
      setSaving(false);
    }
  };

  const addAdminWallet = () => {
    setAdminWallets([...adminWallets, '']);
  };

  const removeAdminWallet = (index) => {
    const updated = adminWallets.filter((_, i) => i !== index);
    setAdminWallets(updated.length > 0 ? updated : ['']);
  };

  const updateAdminWallet = (index, value) => {
    const updated = [...adminWallets];
    updated[index] = value;
    setAdminWallets(updated);
  };

  const handleDeleteMember = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого участника?')) return;
    
    try {
      await axios.delete(`${API}/users/${userId}`);
      setMessage({ type: 'success', text: 'Участник удален' });
      loadMembers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка при удалении участника' });
    }
  };

  const handleBanMember = async (userId) => {
    try {
      await axios.post(`${API}/moderation/ban`, { user_id: userId });
      setMessage({ type: 'success', text: 'Участник заблокирован' });
      loadMembers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка при блокировке' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Панель Администратора
          </h1>
          <p className="text-gray-600 mt-2">
            Управление клубом, участниками и настройками
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-xl p-4 mb-6 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-900' 
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallets" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Кошельки
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Участники
            </TabsTrigger>
            <TabsTrigger value="club" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Настройки Клуба
            </TabsTrigger>
          </TabsList>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-6">
            {/* Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Важно:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Владелец (Owner) имеет полный контроль над клубом</li>
                    <li>Администраторы (Admins) могут создавать контент и управлять пользователями</li>
                    <li>Адреса кошельков должны начинаться с 0x</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Owner Wallet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Кошелек Владельца (Owner)
                </CardTitle>
                <CardDescription>
                  Полные права на управление клубом
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={ownerWallet}
                  onChange={(e) => setOwnerWallet(e.target.value)}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* Admin Wallets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Кошельки Администраторов
                </CardTitle>
                <CardDescription>
                  Могут создавать контент и модерировать
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {adminWallets.map((wallet, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={wallet}
                      onChange={(e) => updateAdminWallet(index, e.target.value)}
                      className="font-mono text-sm"
                    />
                    {adminWallets.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdminWallet(index)}
                        className="shrink-0"
                      >
                        Удалить
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAdminWallet}
                  className="w-full"
                >
                  + Добавить админа
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveWallets}
                disabled={saving}
                size="lg"
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Участники клуба</CardTitle>
                <CardDescription>
                  Управление участниками и их ролями
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="text-center py-8">Загрузка...</div>
                ) : members.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Пользователь</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Роль</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">XP</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <tr key={member.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                                  {member.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-xs text-gray-500 font-mono">
                                    {member.wallet_address?.slice(0, 10)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              {(member.xp_total || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleBanMember(member.id)}
                                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Нет участников
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Club Settings Tab */}
          <TabsContent value="club" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Настройки клуба</CardTitle>
                <CardDescription>
                  Общие настройки и информация о клубе
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clubSettings ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название клуба
                      </label>
                      <div className="text-lg font-semibold">
                        {clubSettings.club_name || 'FOMO Voice Club'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Описание
                      </label>
                      <div className="text-gray-600">
                        {clubSettings.description || 'Private voice club'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Всего участников
                        </label>
                        <div className="text-2xl font-bold">
                          {members.length}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Администраторов
                        </label>
                        <div className="text-2xl font-bold">
                          {adminWallets.filter(w => w).length}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Настройки не загружены
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
