import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { logAction } from '../utils/logger';

type FormValues = {
  title: string;
  journal: string;
  conceptualMap: string;
  iv: string;
  mediator: string;
  moderator: string;
  dv: string;
  wowFactor: string;
};

export default function ModelEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const splitTags = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);

      await addDoc(collection(db, 'modelCards'), {
        userId: user.uid,
        uploaderName: user.displayName || user.email || 'Unknown',
        title: data.title,
        journal: data.journal,
        conceptualMap: data.conceptualMap,
        iv: splitTags(data.iv),
        mediator: splitTags(data.mediator),
        moderator: splitTags(data.moderator),
        dv: splitTags(data.dv),
        wowFactor: data.wowFactor,
        createdAt: serverTimestamp(),
      });
      
      await logAction(user, 'Create', 'Models');
      
      reset();
      navigate('/models');
    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Failed to save model card.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-stone-500 focus:ring-stone-500 sm:text-sm p-2 border bg-stone-50";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">New Model Card</h1>
        <p className="text-stone-500 mt-2">Extract the core logic of the empirical paper.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700">Paper Title</label>
            <input {...register('title', { required: true })} className={inputClass} placeholder="e.g., The impact of psychological safety..." />
            {errors.title && <span className="text-xs text-red-500">Required</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Journal</label>
            <input {...register('journal', { required: true })} className={inputClass} placeholder="e.g., AMJ, JAP, ASQ" />
            {errors.journal && <span className="text-xs text-red-500">Required</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">Conceptual Map (X {'->'} M {'->'} Y)</label>
            <textarea {...register('conceptualMap')} rows={3} className={inputClass} placeholder="Describe the core logic flow..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700">Independent Variables (IV/X)</label>
              <input {...register('iv', { required: true })} className={inputClass} placeholder="Comma separated..." />
              {errors.iv && <span className="text-xs text-red-500">Required</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Dependent Variables (DV/Y)</label>
              <input {...register('dv', { required: true })} className={inputClass} placeholder="Comma separated..." />
              {errors.dv && <span className="text-xs text-red-500">Required</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Mediators (M)</label>
              <input {...register('mediator')} className={inputClass} placeholder="Comma separated..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Moderators (W)</label>
              <input {...register('moderator')} className={inputClass} placeholder="Comma separated..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">The "Wow" Factor</label>
            <textarea {...register('wowFactor')} rows={3} className={inputClass} placeholder="What makes this paper clever or counter-intuitive?" />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-stone-900 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 transition-all cursor-pointer active:scale-95",
              loading && "opacity-50 cursor-not-allowed active:scale-100"
            )}
          >
            {loading ? 'Saving...' : 'Save Model Card'}
          </button>
        </div>
      </form>
    </div>
  );
}
