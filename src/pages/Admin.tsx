import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, addDoc, deleteDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Trash2, Plus } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [config, setConfig] = useState({ targetDate: '2026-05-15' });
  const [users, setUsers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.isAdmin) return;
      try {
        const configSnap = await getDoc(doc(db, 'systemConfig', 'global'));
        if (configSnap.exists()) {
          setConfig(configSnap.data() as any);
        }

        if (user.isSuperAdmin) {
          const usersSnap = await getDocs(collection(db, 'users'));
          setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if (user?.isAdmin) {
      const q = query(collection(db, 'usefulLinks'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error('Error fetching useful links in Admin:', error);
      });
      return unsubscribe;
    }
  }, [user]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'systemConfig', 'global'), config);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error(error);
      alert('Failed to update role.');
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkName || !newLinkUrl) return;
    try {
      await addDoc(collection(db, 'usefulLinks'), {
        name: newLinkName,
        url: newLinkUrl,
        createdAt: serverTimestamp()
      });
      setNewLinkName('');
      setNewLinkUrl('');
    } catch (error) {
      console.error(error);
      alert('Failed to add link.');
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'usefulLinks', id));
    } catch (error) {
      console.error(error);
      alert('Failed to delete link.');
    }
  };

  if (!user?.isAdmin) return <div className="p-8 text-red-500">Access Denied</div>;
  if (loading) return <div className="p-8">Loading admin panel...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Admin Settings</h1>
        <p className="text-stone-500 mt-2">Configure platform goals and manage permissions.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Global Targets Configuration</h2>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700">Target Date</label>
              <input
                type="date"
                required
                value={config.targetDate}
                onChange={e => setConfig({...config, targetDate: e.target.value})}
                className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-stone-900 text-white rounded-md text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Useful Links Configuration</h2>
        <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Site Name"
              required
              value={newLinkName}
              onChange={e => setNewLinkName(e.target.value)}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50"
            />
          </div>
          <div className="flex-1">
            <input
              type="url"
              placeholder="URL (https://...)"
              required
              value={newLinkUrl}
              onChange={e => setNewLinkUrl(e.target.value)}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-stone-900 text-white rounded-md text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Link
          </button>
        </form>

        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="text-sm text-stone-500 italic">No useful links configured.</p>
          ) : (
            links.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900 truncate">{link.name}</p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                    {link.url}
                  </a>
                </div>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors ml-4 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {user.isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">User Management (Super Admin)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm text-stone-900">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-stone-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-700'}`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {u.email !== 'zixuanwang202503@gmail.com' && (
                        <button
                          onClick={() => toggleRole(u.id, u.role || 'user')}
                          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
