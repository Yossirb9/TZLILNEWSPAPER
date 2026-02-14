interface MagazinePageProps {
  children: React.ReactNode;
  pageNumber?: number;
  className?: string;
  noPadding?: boolean;
}

export default function MagazinePage({
  children,
  pageNumber,
  className = "",
  noPadding = false,
}: MagazinePageProps) {
  return (
    <div
      className={`magazine-page ${className}`}
      style={{ padding: noPadding ? 0 : undefined }}
    >
      {children}
      {pageNumber && (
        <div className="page-number">{pageNumber}</div>
      )}
    </div>
  );
}
