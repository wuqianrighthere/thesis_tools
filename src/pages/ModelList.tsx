import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';

export default function ModelList() {
  const { user } = useAuth();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'modelCards'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <div>Loading models...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">My Models</h1>
        <p className="text-stone-500 mt-2">All the empirical models you've extracted.</p>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <p className="text-stone-500">No models found. Start by adding one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {models.map((model) => (
            <div key={model.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">{model.title}</h3>
                  <p className="text-sm text-stone-500 font-medium">{model.journal}</p>
                </div>
                {model.createdAt && (
                  <span className="text-xs text-stone-400">
                    {format(model.createdAt.toDate(), 'MMM d, yyyy')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">IV (X)</span>
                  <div className="flex flex-wrap gap-1">
                    {model.iv?.map((v: string) => <span key={v} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{v}</span>)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Mediator (M)</span>
                  <div className="flex flex-wrap gap-1">
                    {model.mediator?.map((v: string) => <span key={v} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">{v}</span>)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Moderator (W)</span>
                  <div className="flex flex-wrap gap-1">
                    {model.moderator?.map((v: string) => <span key={v} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium">{v}</span>)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">DV (Y)</span>
                  <div className="flex flex-wrap gap-1">
                    {model.dv?.map((v: string) => <span key={v} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{v}</span>)}
                  </div>
                </div>
              </div>

              {model.wowFactor && (
                <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Wow Factor</span>
                  <p className="text-sm text-stone-700 italic">"{model.wowFactor}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
