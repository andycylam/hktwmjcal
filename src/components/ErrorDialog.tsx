import React from 'react';

interface Props {
  message?: string | null;
  onClose: () => void;
}

export const ErrorDialog: React.FC<Props> = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 z-10 w-80">
        <h4 className="text-sm font-bold text-red-400">警告</h4>
        <p className="text-sm text-slate-200 mt-2">{message}</p>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1 bg-emerald-500 text-slate-900 rounded">關閉</button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;
