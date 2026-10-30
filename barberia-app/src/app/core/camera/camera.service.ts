import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/** Wraps the Capacitor Camera plugin. Pictures stay in memory as data URLs and are never saved. */
@Injectable({ providedIn: 'root' })
export class CameraService {
  /** Lets the user take a picture or pick one from the gallery. Resolves `null` when cancelled. */
  async takePhoto(labels: { header: string; photo: string; picture: string; cancel: string }): Promise<string | null> {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 90,
        width: 1280,
        correctOrientation: true,
        saveToGallery: false,
        webUseInput: true,
        promptLabelHeader: labels.header,
        promptLabelPhoto: labels.photo,
        promptLabelPicture: labels.picture,
        promptLabelCancel: labels.cancel,
      });
      return photo.dataUrl ?? null;
    } catch (error) {
      // The plugin rejects with "User cancelled photos app" when the user backs out.
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return null;
      }
      throw error;
    }
  }
}
