
import React from 'react';
import { CloseIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  let sizeClasses = 'max-w-md'; // md
  if (size === 'sm') sizeClasses = 'max-w-sm';
  if (size === 'lg') sizeClasses = 'max-w-lg';
  if (size === 'xl') sizeClasses = 'max-w-xl';
  if (size === 'full') sizeClasses = 'max-w-full h-full rounded-none';


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[100] p-4"
      onClick={onClose} // Close on overlay click
    >
      <div
        className={`bg-white rounded-lg shadow-xl p-6 relative w-full ${sizeClasses} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal
      >
        {title && (
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-700">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Close modal"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        )}
        {!title && (
             <button
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors z-10"
              aria-label="Close modal"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
        )}
        <div className="overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
