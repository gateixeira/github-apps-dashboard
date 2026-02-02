import type { FC } from 'react';
import { Button, ButtonGroup } from '@primer/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  loadedPages?: number; // Number of pages that have been loaded (for progressive loading)
}

export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  perPage,
  onPageChange,
  loadedPages,
}) => {
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalCount);
  
  // If loadedPages is provided, use it to determine which pages are clickable
  const maxClickablePage = loadedPages ?? totalPages;

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Always show pagination if there will be more than 1 page
  if (totalPages <= 1 && totalCount <= perPage) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 12, color: '#6e7781' }}>
        Showing {startItem}-{endItem} of {totalCount}
      </span>
      
      <ButtonGroup>
        <Button
          size="small"
          leadingVisual={ChevronLeftIcon}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        
        {getPageNumbers().map((page, index) => (
          typeof page === 'number' ? (
            <Button
              key={index}
              size="small"
              variant={page === currentPage ? 'primary' : 'default'}
              onClick={() => onPageChange(page)}
              disabled={page > maxClickablePage}
            >
              {page}
            </Button>
          ) : (
            <Button key={index} size="small" disabled variant="invisible">
              {page}
            </Button>
          )
        ))}
        
        <Button
          size="small"
          trailingVisual={ChevronRightIcon}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || currentPage >= maxClickablePage}
        >
          Next
        </Button>
      </ButtonGroup>
    </div>
  );
};
