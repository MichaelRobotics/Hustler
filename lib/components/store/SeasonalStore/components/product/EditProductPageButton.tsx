'use client';

import React from 'react';
import { Button } from 'frosted-ui';
import { Eye } from 'lucide-react';

interface EditProductPageButtonProps {
  onClick: () => void;
}

export const EditProductPageButton: React.FC<EditProductPageButtonProps> = ({
  onClick,
}) => {
  return (
    <div className="mb-4">
      <Button
        size="3"
        color="violet"
        variant="solid"
        onClick={onClick}
        className="w-full !px-4 !py-2.5 shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <Eye size={16} strokeWidth={2.5} />
        <span className="font-bold text-base antialiased subpixel-antialiased">Edit Product Page</span>
      </Button>
    </div>
  );
};



