import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { API_URL } from "../constants/api";
import { useToast } from "../hooks/useToast";
import { storageKeys } from "../constants/storage";
import ConfirmModal from "./ConfirmModal";

interface AvatarUploadProps {
  /** Base64 atual (data:image/...;base64,...) ou null */
  fotoBase64?: string | null;
  /** Iniciais para exibir quando não há foto */
  iniciais: string;
  /** Tamanho em px do avatar (padrão 80) */
  size?: number;
  /** Callback chamado após upload bem-sucedido com o novo base64 */
  onFotoAtualizada?: (novoBase64: string) => void;
  /** Callback chamado após remoção bem-sucedida da foto (volta ao avatar padrão) */
  onFotoRemovida?: () => void;
  /** Classes CSS extras no container */
  className?: string;
}

export default function AvatarUpload({
  fotoBase64,
  iniciais,
  size = 80,
  onFotoAtualizada,
  onFotoRemovida,
  className = "",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const toast = useToast();

  const handleClick = () => inputRef.current?.click();

  const handleRemover = async () => {
    setRemovendo(true);
    try {
      const token = localStorage.getItem(storageKeys.authToken);
      const res = await fetch(`${API_URL}/api/Perfil/foto`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.mensagem || "Erro ao remover foto.");
        return;
      }

      localStorage.removeItem(storageKeys.fotoBase64);
      onFotoRemovida?.();
      toast.success("Foto de perfil removida.");
      setConfirmarRemocao(false);
    } catch {
      toast.error("Falha de conexão.");
    } finally {
      setRemovendo(false);
    }
  };

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

  const podeRemover = !!fotoBase64 && !uploading;

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
            background: "linear-gradient(135deg, #3C6FA0, #2C5282)",
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

      {/* Botão remover foto (só aparece quando há foto) */}
      {podeRemover && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmarRemocao(true);
          }}
          aria-label="Remover foto de perfil"
          title="Remover foto"
          className="absolute -top-1.5 -right-1.5 w-7 h-7 grid place-items-center rounded-full bg-white text-danger border border-line shadow-card opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-danger hover:text-white hover:border-danger transition-all z-10"
        >
          <Trash2 size={14} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <ConfirmModal
        isOpen={confirmarRemocao}
        title="Remover foto de perfil?"
        description="Sua foto será removida e o avatar voltará a exibir a inicial do seu nome."
        confirmText="Remover"
        cancelText="Cancelar"
        type="destructive"
        loading={removendo}
        onConfirm={handleRemover}
        onCancel={() => setConfirmarRemocao(false)}
      />
    </div>
  );
}
