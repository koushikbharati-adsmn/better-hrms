import { useRef, useState } from "react";
import { toast } from "sonner";

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    : null;

export default function useSpeechToText(
  onResult: (transcript: string) => void,
) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supported = Boolean(SpeechRecognition);

  function start() {
    if (!supported || listening) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      onResult(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e.error);
      toast.error(`Microphone error: ${e.error}`);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { listening, supported, start, stop };
}
