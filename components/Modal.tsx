'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from '@/lib/client';

export function Modal({ busy, onClose, children }: { busy: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (busy) toast('Please wait until the current upload or save finishes.');
        else onClose();
      }}
    >
      {children}
    </dialog>
  );
}
