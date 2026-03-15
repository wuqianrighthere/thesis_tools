import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';
import clsx from 'clsx';
import { logAction } from '../utils/logger';

export default function VariablesLab() {
  const { user } = useAuth();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUploader, setSelectedUploader] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Simulation State
  const [selectedIV, setSelectedIV] = useState<string | null>(null);
  const [selectedM, setSelectedM] = useState<string | null>(null);
  const [selectedW, setSelectedW] = useState<string | null>(null);
  const [selectedDV, setSelectedDV] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'modelCards'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setModels(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching model cards in VariablesLab:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const getUploaderName = (model: any) => {
    if (model.uploaderName) return model.uploaderName;
    const generatedTitles = [
      "The impact of transformational leadership on innovative work behavior",
      "Abusive supervision and turnover intention",
      "High-Performance Work Systems and Task Performance",
      "Telecommuting and Job Satisfaction",
      "Inclusive Leadership and Team Creativity",
      "Servant Leadership and OCB",
      "Workplace Ostracism and Counterproductive Work Behavior",
      "Algorithmic Management and Worker Well-being"
    ];
    if (generatedTitles.includes(model.title)) return "Generated";
    return "Unknown";
  };

  const uploaders = ['All', ...Array.from(new Set(models.map(getUploaderName)))];
  
  const availableDates = Array.from(new Set(models.map(m => {
    if (m.createdAt) {
      return format(m.createdAt.toDate(), 'yyyy-MM-dd');
    }
    return null;
  }).filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a));
  
  const filteredModels = models.filter(m => {
    const uploaderMatch = selectedUploader === 'All' || getUploaderName(m) === selectedUploader;
    let dateMatch = true;
    if (selectedDate && m.createdAt) {
      const modelDate = format(m.createdAt.toDate(), 'yyyy-MM-dd');
      dateMatch = modelDate === selectedDate;
    }
    return uploaderMatch && dateMatch;
  });

  // Extract unique variables
  const extractUnique = (key: string): string[] => {
    const all = filteredModels.flatMap(m => m[key] || []);
    return Array.from(new Set(all)).filter(Boolean) as string[];
  };

  const ivs = extractUnique('iv');
  const mediators = extractUnique('mediator');
  const moderators = extractUnique('moderator');
  const dvs = extractUnique('dv');

  const handleSaveSimulation = async () => {
    if (!user || !selectedIV || !selectedDV) {
      alert('Please select at least an IV and a DV to simulate a topic.');
      return;
    }
    setSimulating(true);
    try {
      await addDoc(collection(db, 'simulatedTopics'), {
        userId: user.uid,
        uploaderName: user.displayName || user.email?.split('@')[0] || 'Unknown',
        iv: selectedIV,
        mediator: selectedM,
        moderator: selectedW,
        dv: selectedDV,
        createdAt: serverTimestamp(),
      });
      
      await logAction(user, 'Create', 'New Ideas');
      
      alert('Simulated topic saved successfully!');
      // Reset selections
      setSelectedIV(null);
      setSelectedM(null);
      setSelectedW(null);
      setSelectedDV(null);
    } catch (error) {
      console.error('Error saving simulation: ', error);
      alert('Failed to save simulation.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <div>Loading lab...</div>;

  const renderVariableList = (
    title: string,
    items: string[],
    selected: string | null,
    onSelect: (val: string | null) => void,
    colorClass: string,
    bgClass: string
  ) => (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col h-full">
      <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4">{title}</h3>
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No variables found.</p>
        ) : (
          items.map(item => (
            <button
              key={item}
              onClick={() => onSelect(selected === item ? null : item)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer active:scale-95 border",
                selected === item
                  ? `${bgClass} ${colorClass} border-transparent font-medium`
                  : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
              )}
            >
              {item}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Variables Lab</h1>
          <p className="text-stone-500 mt-2">Mix and match variables from your reading to generate novel topics.</p>
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
            <label className="block text-xs font-medium text-stone-500 mb-1">Filter by Uploader</label>
            <select 
              value={selectedUploader} 
              onChange={e => setSelectedUploader(e.target.value)}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50"
            >
              {uploaders.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Simulation Board */}
      <div className="bg-stone-900 p-8 rounded-2xl shadow-lg border border-stone-800 text-white">
        <h2 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-6">Simulation Board</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-stone-500 uppercase tracking-wider">IV (X)</span>
            <div className={clsx("px-6 py-3 rounded-xl border-2 border-dashed min-w-[140px] text-center font-medium", selectedIV ? "bg-blue-900/50 border-blue-500 text-blue-200" : "border-stone-700 text-stone-500")}>
              {selectedIV || 'Select IV'}
            </div>
          </div>

          <span className="text-stone-600 font-bold text-xl">→</span>

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-stone-500 uppercase tracking-wider">Mediator (M)</span>
            <div className={clsx("px-6 py-3 rounded-xl border-2 border-dashed min-w-[140px] text-center font-medium", selectedM ? "bg-purple-900/50 border-purple-500 text-purple-200" : "border-stone-700 text-stone-500")}>
              {selectedM || 'Select M'}
            </div>
          </div>

          <span className="text-stone-600 font-bold text-xl">→</span>

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-stone-500 uppercase tracking-wider">DV (Y)</span>
            <div className={clsx("px-6 py-3 rounded-xl border-2 border-dashed min-w-[140px] text-center font-medium", selectedDV ? "bg-emerald-900/50 border-emerald-500 text-emerald-200" : "border-stone-700 text-stone-500")}>
              {selectedDV || 'Select DV'}
            </div>
          </div>
        </div>

        {selectedW && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="text-xs text-stone-500 uppercase tracking-wider">Moderator (W)</span>
            <div className="px-6 py-3 rounded-xl border-2 border-amber-500 bg-amber-900/50 text-amber-200 min-w-[140px] text-center font-medium">
              {selectedW}
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <button
            onClick={handleSaveSimulation}
            disabled={!selectedIV || !selectedDV || simulating}
            className="px-8 py-3 bg-white text-stone-900 font-medium rounded-lg hover:bg-stone-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {simulating ? 'Saving...' : 'Save Simulated Topic'}
          </button>
        </div>
      </div>

      {/* Variables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-1 min-h-[400px]">
        {renderVariableList('Independent (IV)', ivs, selectedIV, setSelectedIV, 'text-blue-700', 'bg-blue-100')}
        {renderVariableList('Mediator (M)', mediators, selectedM, setSelectedM, 'text-purple-700', 'bg-purple-100')}
        {renderVariableList('Moderator (W)', moderators, selectedW, setSelectedW, 'text-amber-700', 'bg-amber-100')}
        {renderVariableList('Dependent (DV)', dvs, selectedDV, setSelectedDV, 'text-emerald-700', 'bg-emerald-100')}
      </div>
    </div>
  );
}
