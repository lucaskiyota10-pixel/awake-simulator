import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Composition } from '../types';
import { deleteComposition, listCompositions } from '../services/compositions';
import { getAssetBlob } from '../lib/assets';
import { useAssetUrl } from '../lib/hooks';
import { downloadBlob } from '../lib/image';
import { useSimulator } from '../store/simulator';
import { getRoom } from '../services/rooms';
import { Badge, Button, Notice, PageHeader, Spinner } from '../components/ui';

const statusLabel: Record<Composition['scaleStatus'], { text: string; tone: 'blue' | 'warn' }> = {
  calibrated: { text: 'Escala real calibrada', tone: 'blue' },
  'calibrated-perspective': { text: 'Escala real com perspectiva', tone: 'blue' },
  insufficient: { text: 'Calibração insuficiente', tone: 'warn' },
  uncalibrated: { text: 'Escala estimada', tone: 'warn' },
  manual: { text: 'Tamanho ajustado manualmente', tone: 'warn' },
};

function CompositionCard({ c, onDelete }: { c: Composition; onDelete: () => void }) {
  const ref = { kind: 'local' as const, assetId: c.renderAssetId };
  const url = useAssetUrl(ref);
  const restore = useSimulator((s) => s.restore);
  const navigate = useNavigate();
  const st = statusLabel[c.scaleStatus];
  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-awake-cream-dark">
      {url && <img src={url} alt={c.name} className="aspect-[3/2] w-full object-cover" />}
      <div className="space-y-2 p-4">
        <p className="font-semibold leading-snug">{c.name}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="pink">{c.mode.toUpperCase()}</Badge>
          <Badge tone={st.tone}>{st.text}</Badge>
        </div>
        <p className="text-[11px] text-awake-blue/60">{new Date(c.createdAt).toLocaleString('pt-BR')}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={async () => {
              if (!(await getRoom(c.roomId))) {
                alert('O ambiente desta composição não está mais disponível neste navegador.');
                return;
              }
              restore({ roomId: c.roomId, productId: c.productId, mode: c.mode, placement: c.placement, calibration: c.calibration, camera: c.camera });
              navigate('/simulador');
            }}
          >
            Abrir no simulador
          </Button>
          <Button size="sm" variant="outline" onClick={async () => downloadBlob(await getAssetBlob(ref), `${c.name}.png`)}>
            Baixar
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>Excluir</Button>
        </div>
      </div>
    </article>
  );
}

export default function CompositionsPage() {
  const [items, setItems] = useState<Composition[] | null>(null);
  useEffect(() => {
    listCompositions().then(setItems);
  }, []);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader eyebrow="Composições" title="Simulações salvas">
        Guardadas apenas neste navegador. Reabra uma composição para continuar ajustando no mesmo ambiente e com o mesmo produto.
      </PageHeader>
      {!items && <Spinner />}
      {items?.length === 0 && (
        <Notice>
          Nenhuma composição salva ainda. <Link to="/simulador" className="font-semibold underline">Abrir o simulador</Link>
        </Notice>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((c) => (
          <CompositionCard
            key={c.id}
            c={c}
            onDelete={async () => {
              if (!confirm('Excluir esta composição?')) return;
              await deleteComposition(c);
              setItems((xs) => xs!.filter((x) => x.id !== c.id));
            }}
          />
        ))}
      </div>
    </div>
  );
}
