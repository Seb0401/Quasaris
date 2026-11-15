"use client";

import { useSyncExternalStore } from "react";
import type { FileUIPart } from "ai";

const formats = ["image/jpeg", "image/png", "image/webp"];
const maxPhotoBytes = 2 * 1024 * 1024;

export async function preparePhoto(file: File): Promise<FileUIPart> {
  if (!formats.includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Invalid photo");
  let photo: Blob = file;
  if (file.size > maxPhotoBytes) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo conversion unavailable");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      photo = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Photo conversion failed")), "image/jpeg", 0.8);
      });
    } finally {
      bitmap.close();
    }
  }
  if (photo.size > maxPhotoBytes) throw new Error("Photo too large");
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(photo);
  });
  return { type: "file", mediaType: photo.type, filename: file.name, url };
}

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function recognitionConstructor() {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export type { Recognition };

const subscribe = () => () => {};
const serverSnapshot = () => false;
const canRecognize = () => !!recognitionConstructor();
const canSpeak = () => "speechSynthesis" in window;

export function useSpeechSupport() {
  return {
    recognition: useSyncExternalStore(subscribe, canRecognize, serverSnapshot),
    synthesis: useSyncExternalStore(subscribe, canSpeak, serverSnapshot),
  };
}

export function speak(text: string, lang: string) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}
