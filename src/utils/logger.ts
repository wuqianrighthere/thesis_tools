import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logAction = async (
  user: any,
  actionType: 'Create' | 'Update' | 'Delete',
  target: 'Models' | 'New Ideas',
  details?: string
) => {
  if (!user) return;
  try {
    await addDoc(collection(db, 'actionLogs'), {
      timestamp: serverTimestamp(),
      operatorName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      operatorEmail: user.email || 'unknown@example.com',
      actionType,
      target,
      details: details || ''
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};
