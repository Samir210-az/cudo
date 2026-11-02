import { useEffect, useState } from 'react';
import { enablePanelApp, useInstall } from '../lib/pwa';
import { Icon, Modal } from './ui';

export default function InstallButton({ className = 'btn' }) {
  const { installed, canPrompt, ios, prompt } = useInstall();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    enablePanelApp();
  }, []);

  if (installed) return null;

  return (
    <>
      <button type="button" className={className} onClick={() => (canPrompt ? prompt() : setHelp(true))}>
        <Icon name="download" /> Telefona yüklə
      </button>
      {help && (
        <Modal title="Tətbiqi telefona yüklə" onClose={() => setHelp(false)}>
          {ios ? (
            <ol className="howto">
              <li>Bu səhifəni <strong>Safari</strong>-də aç.</li>
              <li>Aşağıdakı <strong>Paylaş</strong> düyməsinə (ox çıxan kvadrat) bas.</li>
              <li><strong>Ana ekrana əlavə et</strong> seç.</li>
              <li>Yuxarı sağdakı <strong>Əlavə et</strong> düyməsini bas.</li>
            </ol>
          ) : (
            <ol className="howto">
              <li>Bu səhifəni <strong>Chrome</strong>-da aç.</li>
              <li>Yuxarı sağdakı <strong>⋮</strong> menyusuna bas.</li>
              <li><strong>Tətbiqi yüklə</strong> və ya <strong>Ana ekrana əlavə et</strong> seç.</li>
              <li>Açılan pəncərədə <strong>Yüklə</strong> düyməsini təsdiqlə.</li>
            </ol>
          )}
          <p className="muted" style={{ marginTop: 12 }}>
            Yükləndikdən sonra tətbiq ana ekranda "Cüdo Klub" adı ilə görünür və brauzer panelisiz açılır.
          </p>
        </Modal>
      )}
    </>
  );
}
