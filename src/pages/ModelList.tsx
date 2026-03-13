import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ModelList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUploader, setSelectedUploader] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(searchParams.get('date') || '');
  
  const [editingModel, setEditingModel] = useState<any | null>(null);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', journal: '', conceptualMap: '', iv: '', mediator: '', moderator: '', dv: '', wowFactor: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'modelCards'),
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

  const handleDeleteClick = (id: string) => {
    setModelToDelete(id);
  };

  const confirmDelete = async () => {
    if (!modelToDelete) return;
    try {
      await deleteDoc(doc(db, 'modelCards', modelToDelete));
      setModelToDelete(null);
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleEditClick = (model: any) => {
    setEditForm({
      title: model.title,
      journal: model.journal,
      conceptualMap: model.conceptualMap || '',
      iv: (model.iv || []).join(', '),
      mediator: (model.mediator || []).join(', '),
      moderator: (model.moderator || []).join(', '),
      dv: (model.dv || []).join(', '),
      wowFactor: model.wowFactor || ''
    });
    setEditingModel(model);
  };

  const handleEditSave = async () => {
    if (!editingModel) return;
    try {
      const splitTags = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);
      await updateDoc(doc(db, 'modelCards', editingModel.id), {
        title: editForm.title,
        journal: editForm.journal,
        conceptualMap: editForm.conceptualMap,
        iv: splitTags(editForm.iv),
        mediator: splitTags(editForm.mediator),
        moderator: splitTags(editForm.moderator),
        dv: splitTags(editForm.dv),
        wowFactor: editForm.wowFactor
      });
      setEditingModel(null);
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Failed to update model.");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Models Export', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const tableColumn = ["Title", "Journal", "IV (X)", "Mediator (M)", "Moderator (W)", "DV (Y)", "Wow Factor"];
    const tableRows = filteredModels.map(model => [
      model.title || '',
      model.journal || '',
      (model.iv || []).join(', '),
      (model.mediator || []).join(', '),
      (model.moderator || []).join(', '),
      (model.dv || []).join(', '),
      model.wowFactor || ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 50 }
      },
      headStyles: { fillColor: [41, 37, 36] } // stone-900
    });

    doc.save('models-export.pdf');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Models</h1>
          <p className="text-stone-500 mt-2">All the empirical models extracted by the team.</p>
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

      {filteredModels.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
          <p className="text-stone-500">No models found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredModels.map((model) => (
            <div key={model.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded font-medium",
                      getUploaderName(model) === 'Generated' ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
                    )}>
                      {getUploaderName(model)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900">{model.title}</h3>
                  <p className="text-sm text-stone-500 font-medium">{model.journal}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {model.createdAt && (
                    <span className="text-xs text-stone-400">
                      {format(model.createdAt.toDate(), 'MMM d, yyyy')}
                    </span>
                  )}
                  {model.userId === user?.uid && (
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => handleEditClick(model)} 
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 border border-blue-200 shadow-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(model.id)} 
                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition-all cursor-pointer active:scale-95 border border-red-200 shadow-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
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
      {editingModel && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Model</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Title</label>
                <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Journal</label>
                <input value={editForm.journal} onChange={e => setEditForm({...editForm, journal: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Conceptual Map</label>
                <input value={editForm.conceptualMap} onChange={e => setEditForm({...editForm, conceptualMap: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700">IV (comma separated)</label>
                  <input value={editForm.iv} onChange={e => setEditForm({...editForm, iv: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">DV (comma separated)</label>
                  <input value={editForm.dv} onChange={e => setEditForm({...editForm, dv: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Mediator</label>
                  <input value={editForm.mediator} onChange={e => setEditForm({...editForm, mediator: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Moderator</label>
                  <input value={editForm.moderator} onChange={e => setEditForm({...editForm, moderator: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Wow Factor</label>
                <textarea value={editForm.wowFactor} onChange={e => setEditForm({...editForm, wowFactor: e.target.value})} className="mt-1 block w-full rounded-md border-stone-300 p-2 border" rows={3} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingModel(null)} className="px-4 py-2 text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200 transition-all cursor-pointer active:scale-95">Cancel</button>
              <button onClick={handleEditSave} className="px-4 py-2 text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-all cursor-pointer active:scale-95">Save Changes</button>
            </div>
          </div>
        </div>
      )}
      {modelToDelete && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-stone-900 mb-2">Delete Model</h2>
            <p className="text-stone-500 mb-6">Are you sure you want to delete this model? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModelToDelete(null)} 
                className="px-4 py-2 text-stone-600 bg-stone-100 rounded-md hover:bg-stone-200 transition-all cursor-pointer active:scale-95 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-all cursor-pointer active:scale-95 font-medium shadow-sm"
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
