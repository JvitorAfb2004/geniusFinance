import { QRCodeSVG } from 'qrcode.react';

interface DocumentValidationFooterProps {
  code: string;
  url: string;
}

// Rodapé de autenticidade impresso no documento: QRCode + código curto digitável.
// O QR aponta para a página pública /validar/{code}; não expõe dados sensíveis.
export default function DocumentValidationFooter({ code, url }: DocumentValidationFooterProps) {
  return (
    <footer className="gh-validation">
      <QRCodeSVG value={url} size={88} level="M" marginSize={0} title={`Validação do documento ${code}`} />
      <div className="gh-validation-text">
        <p><strong>Autenticidade verificável</strong> — código <span className="gh-validation-code">{code}</span></p>
        <p>Escaneie o QRCode ou acesse {url}</p>
      </div>
    </footer>
  );
}
