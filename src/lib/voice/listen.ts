/**
 * One utterance in, one string out, using the phone's own speech service.
 *
 * Privacy, stated plainly: the plugin makes no network calls of its own; it
 * hands the audio to Android's speech recogniser (usually Google's). That
 * service may go online to do the transcription, and the plugin offers no
 * way to force offline. Life Mentor only ever receives the text. The voice
 * card says so under the mic.
 *
 * English (India) is used for Tanglish: owners speak Tamil words in Latin
 * order, and en-IN returns them in Latin letters the parser can read;
 * ta-IN would return Tamil script.
 */
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

export async function voiceAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await SpeechRecognition.available()).available;
  } catch {
    return false;
  }
}

/** Resolves with what was heard, or "" if nothing was. Throws if refused. */
export async function listenOnce(): Promise<string> {
  let perm = await SpeechRecognition.checkPermissions();
  if (perm.speechRecognition !== "granted") {
    perm = await SpeechRecognition.requestPermissions();
  }
  if (perm.speechRecognition !== "granted") {
    throw new Error("Microphone permission is off for Life Mentor.");
  }
  const { matches } = await SpeechRecognition.start({
    language: "en-IN",
    maxResults: 1,
    partialResults: false,
    popup: true,
    prompt: "Pesunga…",
  });
  return matches?.[0]?.trim() ?? "";
}
