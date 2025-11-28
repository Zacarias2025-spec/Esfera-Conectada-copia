import { Button } from '@/components/ui/button';
import { Mic, Square, X, Play } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useEffect, useRef } from 'react';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onAudioReady, onCancel }: AudioRecorderProps) {
  const { isRecording, audioBlob, recordingTime, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioBlob && audioRef.current) {
      audioRef.current.src = URL.createObjectURL(audioBlob);
    }
  }, [audioBlob]);

  const handleStart = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleConfirm = () => {
    if (audioBlob) {
      onAudioReady(audioBlob);
      resetRecording();
    }
  };

  const handleCancel = () => {
    resetRecording();
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium">{formatTime(recordingTime)} / 1:00</span>
            </>
          ) : audioBlob ? (
            <>
              <Play className="h-4 w-4" />
              <span className="text-sm">Áudio gravado</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Gravar áudio (máx. 60s)</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {audioBlob && (
        <audio ref={audioRef} controls className="w-full" />
      )}

      <div className="flex gap-2">
        {!audioBlob && !isRecording && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleStart}
          >
            <Mic className="h-4 w-4 mr-2" />
            Gravar
          </Button>
        )}
        
        {isRecording && (
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4 mr-2" />
            Parar
          </Button>
        )}

        {audioBlob && !isRecording && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={resetRecording}
            >
              Regravar
            </Button>
            <Button
              type="button"
              className="flex-1 bg-gradient-to-r from-primary to-accent"
              onClick={handleConfirm}
            >
              Usar áudio
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
