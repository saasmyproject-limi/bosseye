'use client';

import React, { useRef, useState } from 'react';
import { Camera, User, UploadCloud } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface PhotoUploaderProps {
  photoUrl: string | null;
  onPhotoUploaded: (url: string) => void;
  nom?: string;
  size?: number; // Diamètre en px (default 120)
  boutiqueId?: string;
}

export default function PhotoUploader({
  photoUrl,
  onPhotoUploaded,
  nom = '',
  size = 120,
  boutiqueId = 'boutique-yaounde-1',
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(photoUrl);

  const initials = nom
    ? nom
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'EMP';

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Direct preview via FileReader / ObjectURL
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      if (isSupabaseConfigured()) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${boutiqueId}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('employe-photos')
          .upload(fileName, file, { upsert: true });

        if (error) {
          console.error('Erreur Supabase upload storage:', error);
          onPhotoUploaded(objectUrl);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('employe-photos')
            .getPublicUrl(fileName);
          onPhotoUploaded(publicUrlData.publicUrl);
        }
      } else {
        // Fallback base64 conversion for offline mode
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onPhotoUploaded(base64);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      onPhotoUploaded(objectUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div
        onClick={handleClick}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="relative group cursor-pointer rounded-full overflow-hidden border-4 border-brand-orange shadow-glow flex items-center justify-center bg-brand-card transition-transform active:scale-95 hover:border-white"
      >
        {preview ? (
          <img
            src={preview}
            alt="Photo employé"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-orange to-amber-600 text-white font-bold text-2xl">
            {initials ? (
              <span>{initials}</span>
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
        )}

        {/* Overlay hover avec icône caméra */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
          <Camera className="w-8 h-8 mb-1 text-brand-orange" />
          <span className="text-[10px] font-bold text-center uppercase px-1">
            📷 Modifier
          </span>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-brand-orange">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="text-xs font-semibold text-brand-orange hover:underline flex items-center gap-1"
      >
        <Camera className="w-3.5 h-3.5" />
        {preview ? 'Changer la photo' : '📷 Ajoute photo'}
      </button>
    </div>
  );
}
