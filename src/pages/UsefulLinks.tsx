import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ExternalLink } from 'lucide-react';

export default function UsefulLinks() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'usefulLinks'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching useful links:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="p-8">Loading links...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Useful Links</h1>
        <p className="text-stone-500 mt-2">Quick access to important resources and websites.</p>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <p className="text-stone-500">No useful links configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {links.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer active:scale-[0.99]"
            >
              <span className="text-lg font-medium text-stone-900 group-hover:text-blue-600 transition-colors">
                {link.name}
              </span>
              <ExternalLink className="w-5 h-5 text-stone-400 group-hover:text-blue-600 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
