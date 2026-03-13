import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function NewIdeas() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUploader, setSelectedUploader] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(searchParams.get('date') || '');
  const [editingIdea, setEditingIdea] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ iv: '', mediator: '', moderator: '', dv: '' });
  const [models, setModels] = useState<any[]>([]);
  const [ideaToDelete, setIdeaToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'modelCards'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModels(data);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'simulatedTopics'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIdeas(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) return <div>Loading ideas...</div>;

  const getUploaderName = (idea: any) => {
    return idea.uploaderName || 'Unknown';
  };

  const uploaders = ['All', ...Array.from(new Set(ideas.map(getUploaderName)))];
  
  const availableDates = Array.from(new Set(ideas.map(i => {
    if (i.createdAt) {
      return format(i.createdAt.toDate(), 'yyyy-MM-dd');
    }
    return null;
  }).filter(Boolean) as string[])).sort((a, b) => b.localeCompare(a));
  
  const filteredIdeas = ideas.filter(i => {
    const uploaderMatch = selectedUploader === 'All' || getUploaderName(i) === selectedUploader;
    let dateMatch = true;
    if (selectedDate && i.createdAt) {
      const ideaDate = format(i.createdAt.toDate(), 'yyyy-MM-dd');
      dateMatch = ideaDate === selectedDate;
    }
    return uploaderMatch && dateMatch;
  });

  const ivs = Array.from(new Set(models.flatMap(m => m.iv || []))).filter(Boolean).sort();
  const mediators = Array.from(new Set(models.flatMap(m => m.mediator || []))).filter(Boolean).sort();
  const moderators = Array.from(new Set(models.flatMap(m => m.moderator || []))).filter(Boolean).sort();
  const dvs = Array.from(new Set(models.flatMap(m => m.dv || []))).filter(Boolean).sort();

  const handleDeleteClick = (id: string) => {
    setIdeaToDelete(id);
  };

  const confirmDelete = async () => {
    if (!ideaToDelete) return;
    try {
      await deleteDoc(doc(db, 'simulatedTopics', ideaToDelete));
      setIdeaToDelete(null);
    } catch (error) {
      console.error("Error deleting idea: ", error);
    }
  };

  const handleEditClick = (idea: any) => {
    setEditingIdea(idea);
    setEditForm({
      iv: idea.iv || '',
      mediator: idea.mediator || '',
      moderator: idea.moderator || '',
      dv: idea.dv || ''
    });
  };

  const handleUpdate = async () => {
    if (!editingIdea) return;
    try {
      await updateDoc(doc(db, 'simulatedTopics', editingIdea.id), editForm);
      setEditingIdea(null);
    } catch (error) {
      console.error("Error updating idea: ", error);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Ideas Export', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableColumn = ["Uploader", "Date", "IV (X)", "Mediator (M)", "Moderator (W)", "DV (Y)"];
    const tableRows = filteredIdeas.map(idea => [
      getUploaderName(idea),
      idea.createdAt ? format(idea.createdAt.toDate(), 'yyyy-MM-dd') : '',
      idea.iv || '',
      idea.mediator || '',
      idea.moderator || '',
      idea.dv || ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [41, 37, 36] } // stone-900
    });

    doc.save('ideas-export.pdf');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">New Ideas</h1>
          <p className="text-stone-500 mt-2">Simulated models generated from the Variables Lab.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Filter by Date</label>
            <select 
              value={selectedDate} 
              onChange={e => {
                setSelectedDate(e.target.value);
                if (e.target.value) {
                  setSearchParams({ date: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
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
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-stone-900 text-white rounded-md text-sm font-medium hover:bg-stone-800 transition-colors shadow-sm whitespace-nowrap"
          >
            Export to PDF
          </button>
        </div>
      </div>

      {filteredIdeas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <p className="text-stone-500">No ideas found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredIdeas.map((idea) => (
            <div key={idea.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-600">
                    {getUploaderName(idea)}
                  </span>
                  {idea.createdAt && (
                    <span className="text-xs text-stone-400">
                      {format(idea.createdAt.toDate(), 'MMM d, yyyy HH:mm')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditClick(idea)} 
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 border border-blue-200 shadow-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(idea.id)} 
                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 border border-red-200 shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 bg-stone-50 p-6 rounded-xl border border-stone-100">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">IV (X)</span>
                  <div className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-center font-medium min-w-[120px]">
                    {idea.iv}
                  </div>
                </div>

                <span className="text-stone-400 font-bold text-xl">→</span>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Mediator (M)</span>
                  <div className={clsx(
                    "px-4 py-2 rounded-lg text-center font-medium min-w-[120px] border",
                    idea.mediator ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-stone-100 text-stone-400 border-stone-200 border-dashed"
                  )}>
                    {idea.mediator || 'None'}
                  </div>
                </div>

                <span className="text-stone-400 font-bold text-xl">→</span>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">DV (Y)</span>
                  <div className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-center font-medium min-w-[120px]">
                    {idea.dv}
                  </div>
                </div>
              </div>

              {idea.moderator && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Moderator (W)</span>
                  <div className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-center font-medium min-w-[120px]">
                    {idea.moderator}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingIdea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Edit Idea</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">IV (X)</label>
                <select
                  value={editForm.iv}
                  onChange={e => setEditForm({...editForm, iv: e.target.value})}
                  className="w-full rounded-xl border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 p-3 border bg-stone-50"
                >
                  <option value="">Select IV...</option>
                  {ivs.map((v: any) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Mediator (M)</label>
                <select
                  value={editForm.mediator}
                  onChange={e => setEditForm({...editForm, mediator: e.target.value})}
                  className="w-full rounded-xl border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 p-3 border bg-stone-50"
                >
                  <option value="">None</option>
                  {mediators.map((v: any) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Moderator (W)</label>
                <select
                  value={editForm.moderator}
                  onChange={e => setEditForm({...editForm, moderator: e.target.value})}
                  className="w-full rounded-xl border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 p-3 border bg-stone-50"
                >
                  <option value="">None</option>
                  {moderators.map((v: any) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">DV (Y)</label>
                <select
                  value={editForm.dv}
                  onChange={e => setEditForm({...editForm, dv: e.target.value})}
                  className="w-full rounded-xl border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 p-3 border bg-stone-50"
                >
                  <option value="">Select DV...</option>
                  {dvs.map((v: any) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setEditingIdea(null)}
                className="px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-5 py-2.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer active:scale-95 shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ideaToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-stone-200">
            <h2 className="text-xl font-bold text-stone-900 mb-2">Delete Idea</h2>
            <p className="text-stone-500 mb-6">Are you sure you want to delete this idea? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIdeaToDelete(null)} 
                className="px-4 py-2 text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-all cursor-pointer active:scale-95 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all cursor-pointer active:scale-95 font-medium shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
