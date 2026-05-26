import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { API_URL } from "../constants/api";
import { useToast } from "../hooks/useToast";
import { storageKeys } from "../constants/storage";

interface AvatarUploadProps {
  /** Base64 atual (data:image/...;base64,...) ou null */
  fotoBase64?: string | null;
  /** Iniciais para exibir quando não há foto */
  iniciais: string;
  /** Tamanho em px do avatar (padrão 80) */
  size?: number;
  /** Callback chamado após upload bem-sucedido com o novo base64 */
  onFotoAtualizada?: (novoBase64: string) => void;
  /** Classes CSS extras no container */
  className?: string;
}

export default function AvatarUpload({
  fotoBase64,
  iniciais,
  size = 80,
  onFotoAtualizada,
  className = "",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2_000_000) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error("Formato inválido. Use JPEG, PNG ou WEBP.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("foto", file);

      const token = localStorage.getItem(storageKeys.authToken);
      const res = await fetch(`${API_URL}/api/Perfil/foto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.mensagem || "Erro ao enviar foto.");
        return;
      }

      const data = await res.json();
      localStorage.setItem(storageKeys.fotoBase64, data.fotoBase64);
      onFotoAtualizada?.(data.fotoBase64);
      toast.success("Foto de perfil atualizada!");
    } catch {
      toast.error("Falha de conexão.");
    } finally {
      setUploading(false);
      // Limpa o input para permitir reenvio do mesmo arquivo
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const borderRadius = size >= 64 ? "1.25rem" : "0.75rem";
  const fontSize = size >= 64 ? size * 0.35 : size * 0.4;

  return (
    <div
      className={`relative group shrink-0 cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      onClick={handleClick}
      title="Clique para alterar a foto"
    >
      {/* Avatar */}
      {fotoBase64 ? (
        <img
          src={fotoBase64}
          alt="Foto de perfil"
          style={{
            width: size,
            height: size,
            borderRadius,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius,
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 900,
            fontSize,
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}
        >
          {iniciais}
        </div>
      )}

      {/* Overlay de hover / loading */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: uploading ? 1 : 0,
          transition: "opacity 0.2s",
        }}
        className="group-hover:!opacity-100"
      >
        {uploading ? (
          <Loader2 size={size * 0.3} color="#fff" className="animate-spin" />
        ) : (
          <Camera size={size * 0.28} color="#fff" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
