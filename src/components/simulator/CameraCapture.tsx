import { useEffect, useRef, useState } from 'react';
import { Button, Notice } from '../ui';
import { canvasToBlob } from '../../lib/image';

/**
 * Câmera ao vivo (getUserMedia). Requer HTTPS ou localhost. Quando não
 * estiver disponível, o componente pai usa o seletor de arquivo com
 * `capture="environment"`, que abre a câmera nativa do celular.
 */
export default function CameraCapture({ onCapture, onClose, onFallback }: { onCapture: (b: Blob) => void; onClose: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Câmera ao vivo indisponível neste navegador ou conexão (é necessário HTTPS).');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().then(() => setReady(true)).catch(() => setReady(true));
        }
      })
      .catch((e: Error) => setError(`Não foi possível acessar a câmera (${e.name === 'NotAllowedError' ? 'permissão negada' : e.message}).`));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = async () => {
    const v = video.current!;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    onCapture(await canvasToBlob(c, 'image/jpeg', 0.95));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" role="dialog" aria-label="Câmera">
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="max-w-md space-y-3">
            <Notice tone="warn" title="Câmera ao vivo indisponível">{error}</Notice>
            <Button variant="accent" onClick={onFallback}>Abrir câmera do aparelho</Button>
          </div>
        ) : (
          <video ref={video} playsInline muted className="max-h-full max-w-full rounded-lg" />
        )}
      </div>
      <div className="flex items-center justify-center gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        {!error && (
          <Button variant="accent" onClick={capture} disabled={!ready}>
            Tirar foto
          </Button>
        )}
      </div>
    </div>
  );
}
