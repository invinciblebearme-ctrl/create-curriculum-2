import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBookById, getPdfBlobUrl } from '@/services/api';
import { Book } from '@/types/book';
import { FlipBookViewer } from '@/components/viewer/FlipBookViewer';
import { Loader2, AlertCircle } from 'lucide-react';

export const ViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const bookData = await fetchBookById(id);
        const url = await getPdfBlobUrl(id);
        if (active) {
          setBook(bookData);
          setPdfUrl(url);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || '전자책을 불러올 수 없습니다.');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#1E1D1B] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-300">전자책을 준비하는 중입니다...</p>
      </div>
    );
  }

  if (error || !book || !pdfUrl) {
    return (
      <div className="fixed inset-0 bg-[#1E1D1B] flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold mb-1">도서를 열 수 없습니다</h2>
        <p className="text-xs text-neutral-400 mb-6">{error || '정보를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold"
        >
          홈으로 나가기
        </button>
      </div>
    );
  }

  return (
    <FlipBookViewer
      pdfUrl={pdfUrl}
      title={book.title}
      onClose={() => navigate('/')}
    />
  );
};
