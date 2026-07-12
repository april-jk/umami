import { Icon, LoadingButton, Tooltip, TooltipTrigger, useToast } from '@umami/react-zen';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useApi, useMessages } from '@/components/hooks';
import { isPlanLimitError } from '@/components/hooks/useApi';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useFilterParameters } from '@/components/hooks/useFilterParameters';
import { Download } from '@/components/icons';

export function ExportButton({ websiteId }: { websiteId: string }) {
  const { t, labels, messages } = useMessages();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const date = useDateParameters();
  const filters = useFilterParameters();
  const searchParams = useSearchParams();
  const { get } = useApi();

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const { zip } = await get(`/websites/${websiteId}/export`, {
        ...date,
        ...filters,
        ...searchParams,
        format: 'json',
      });

      await loadZip(zip);
    } catch (error) {
      if (!isPlanLimitError(error as Error)) {
        toast(t(messages.error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipTrigger delay={0}>
      <LoadingButton
        variant="quiet"
        showText={!isLoading}
        isLoading={isLoading}
        onClick={handleClick}
      >
        <Icon>
          <Download />
        </Icon>
      </LoadingButton>
      <Tooltip>{t(labels.download)}</Tooltip>
    </TooltipTrigger>
  );
}

async function loadZip(zip: string) {
  const binary = atob(zip);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'download.zip';
  a.click();
  URL.revokeObjectURL(url);
}
