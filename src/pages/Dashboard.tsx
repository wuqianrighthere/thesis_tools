import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [modelCount, setModelCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const targetDate = new Date('2026-05-15');
  const today = new Date();
  const daysLeft = differenceInDays(targetDate, today);
  const targetCount = 20;
  const progress = Math.min((modelCount / targetCount) * 100, 100);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'modelCards'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setModelCount(snapshot.size);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Dashboard</h1>
        <p className="text-stone-500 mt-2">Track your progress towards your research goals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">
            Effective Models
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-light tracking-tight text-stone-900">{modelCount}</span>
            <span className="text-sm text-stone-500">/ {targetCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">
            Days Remaining
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-light tracking-tight text-stone-900">
              {daysLeft > 0 ? daysLeft : 0}
            </span>
            <span className="text-sm text-stone-500">days</span>
          </div>
          <p className="text-xs text-stone-400 mt-1">Target: May 15, 2026</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <h3 className="text-sm font-medium text-stone-900 mb-4">Goal Progress</h3>
        <div className="w-full bg-stone-100 rounded-full h-4 overflow-hidden">
          <div
            className="bg-stone-900 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-stone-500 mt-3 text-right">
          {modelCount >= targetCount ? 'Goal achieved! 🎉' : `${targetCount - modelCount} more to go`}
        </p>
      </div>
    </div>
  );
}
