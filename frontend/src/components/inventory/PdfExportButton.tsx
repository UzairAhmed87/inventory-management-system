import React, { useState, useEffect, ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface PdfExportButtonProps {
  document: React.ReactElement;
  fileName: string;
}

interface PDFLinkProps {
  document: React.ReactElement;
  fileName: string;
  children: (props: { loading: boolean; }) => React.ReactNode;
}

export const PdfExportButton = ({ document, fileName }: PdfExportButtonProps) => {
  const [PDFDownloadLink, setPDFDownloadLink] = useState<ComponentType<PDFLinkProps> | null>(null);

  useEffect(() => {
    import('@react-pdf/renderer').then(module => {
      setPDFDownloadLink(() => module.PDFDownloadLink as ComponentType<PDFLinkProps>);
    }).catch(error => {
      console.error("Failed to load PDF renderer:", error);
    });
  }, []);

  if (!PDFDownloadLink) {
    return <Button disabled>Export PDF</Button>;
  }

  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }) => (
        <Button disabled={loading}>
          {loading ? 'Generating...' : <><FileDown className="h-4 w-4 mr-2" />Export PDF</>}
        </Button>
      )}
    </PDFDownloadLink>
  );
}; 