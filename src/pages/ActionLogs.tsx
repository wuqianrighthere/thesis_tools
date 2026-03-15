import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function ActionLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('All');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'actionLogs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching action logs:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <div className="p-8">Loading logs...</div>;

  const getOperatorName = (log: any) => log.operatorName || 'Unknown';
  const operators = ['All', ...Array.from(new Set(logs.map(getOperatorName)))];
  
  const availableDates = Array.from(new Set(logs.map(l => {
    if (l.timestamp) {
      return format(l.timestamp.toDate(), 'yyyy-MM-dd');
    }
    return null;
  }).filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a));

  const filteredLogs = logs.filter(l => {
    const operatorMatch = selectedOperator === 'All' || getOperatorName(l) === selectedOperator;
    let dateMatch = true;
    if (selectedDate && l.timestamp) {
      const logDate = format(l.timestamp.toDate(), 'yyyy-MM-dd');
      dateMatch = logDate === selectedDate;
    }
    return operatorMatch && dateMatch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Action Logs</h1>
          <p className="text-stone-500 mt-2">Track user actions across the platform.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Filter by Date</label>
            <select 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50"
            >
              <option value="">All Dates</option>
              {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Filter by Operator</label>
            <select 
              value={selectedOperator} 
              onChange={e => setSelectedOperator(e.target.value)}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50"
            >
              {operators.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500">No action logs found.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-stone-900">{getOperatorName(log)}</div>
                      <div className="text-xs text-stone-500">{log.operatorEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        log.actionType === 'Create' ? 'bg-green-100 text-green-800' :
                        log.actionType === 'Update' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {log.target}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500 max-w-xs truncate">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
