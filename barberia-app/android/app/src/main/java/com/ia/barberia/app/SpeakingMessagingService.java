package com.ia.barberia.app;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Replaces the push plugin's service (see AndroidManifest.xml). Pushes with a "speech" field come
 * data-only from the API (new booking, appointment reminder):
 * - App on screen: handed to the web app as usual; it shows its modal or toast and speaks.
 * - App in background or closed: the notification is built here and the text is read aloud with
 *   the phone's TTS engine, on the notification volume (silent mode keeps it quiet).
 * Every other push goes through the plugin unchanged.
 */
public class SpeakingMessagingService extends MessagingService {

    private static final String TAG = "SpeakingPush";
    /** Must match BOOKINGS_CHANNEL_ID in the app and ANDROID_CHANNEL_ID in the API. */
    private static final String CHANNEL_ID = "bookings";
    /** Latin American Spanish of Google's engine (it has no es-CO voice). */
    private static final Locale VOICE_LOCALE = new Locale("es", "US");
    /** onMessageReceived has about 20 s before Android may stop the service. */
    private static final long MAX_SPEECH_SECONDS = 15;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String speech = data.get("speech");
        if (speech == null || speech.isEmpty() || isAppInForeground()) {
            super.onMessageReceived(remoteMessage);
            return;
        }
        showNotification(remoteMessage, data);
        speak(speech);
    }

    private boolean isAppInForeground() {
        ActivityManager.RunningAppProcessInfo info = new ActivityManager.RunningAppProcessInfo();
        ActivityManager.getMyMemoryState(info);
        return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
    }

    private void showNotification(RemoteMessage remoteMessage, Map<String, String> data) {
        ensureChannel();
        String messageId = remoteMessage.getMessageId() != null ? remoteMessage.getMessageId() : String.valueOf(System.currentTimeMillis());

        // Same extras as an FCM tap, so the plugin fires pushNotificationActionPerformed with the data.
        Intent tap = new Intent(this, MainActivity.class);
        tap.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tap.putExtra("google.message_id", messageId);
        for (Map.Entry<String, String> entry : data.entrySet()) {
            tap.putExtra(entry.getKey(), entry.getValue());
        }
        PendingIntent pending = PendingIntent.getActivity(
            this,
            messageId.hashCode(),
            tap,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(data.get("title"))
            .setContentText(data.get("body"))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(data.get("body")))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setAutoCancel(true)
            .setContentIntent(pending);

        try {
            // The app reads the tag to keep reminders out of the bookings modal.
            NotificationManagerCompat.from(this).notify(data.get("tag"), messageId.hashCode(), builder.build());
        } catch (SecurityException e) {
            Log.w(TAG, "Notification permission missing", e);
        }
    }

    /** The app creates the channel on login; this covers a push arriving before that. */
    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Citas", NotificationManager.IMPORTANCE_HIGH);
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    /** Blocks this (background) thread until the text is read, so Android does not stop the service mid-sentence. */
    private void speak(String text) {
        CountDownLatch done = new CountDownLatch(1);
        Context context = getApplicationContext();
        final TextToSpeech[] holder = new TextToSpeech[1];
        holder[0] = new TextToSpeech(context, status -> {
            TextToSpeech tts = holder[0];
            if (status != TextToSpeech.SUCCESS) {
                done.countDown();
                return;
            }
            int lang = tts.setLanguage(VOICE_LOCALE);
            if (lang == TextToSpeech.LANG_MISSING_DATA || lang == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(new Locale("es"));
            }
            tts.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            );
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {}

                @Override
                public void onDone(String utteranceId) {
                    done.countDown();
                }

                @Override
                public void onError(String utteranceId) {
                    done.countDown();
                }
            });
            if (tts.speak(text, TextToSpeech.QUEUE_ADD, null, "push") != TextToSpeech.SUCCESS) {
                done.countDown();
            }
        });
        try {
            done.await(MAX_SPEECH_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            holder[0].shutdown();
        }
    }
}
