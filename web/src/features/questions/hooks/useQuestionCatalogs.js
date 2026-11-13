import { useEffect, useState } from 'react';
import { questionsApi } from '../services/questions.api';
export default function useQuestionCatalogs() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const result = await questionsApi.catalogs(); if (active) { setData(result.data); setError(''); } }
      catch (failure) { if (active) setError(failure.message); }
      finally { if (active) setLoading(false); }
    };
    refresh();
    window.addEventListener('skillhub:catalog-updated', refresh);
    return () => { active = false; window.removeEventListener('skillhub:catalog-updated', refresh); };
  }, []);
  return { data, loading, error };
}
