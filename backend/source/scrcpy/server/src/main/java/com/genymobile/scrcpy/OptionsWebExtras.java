package com.genymobile.scrcpy;

import com.genymobile.scrcpy.audio.AudioCodec;
import com.genymobile.scrcpy.audio.AudioSource;
import com.genymobile.scrcpy.device.Device;
import com.genymobile.scrcpy.model.Orientation;
import com.genymobile.scrcpy.model.Size;
import com.genymobile.scrcpy.util.Ln;
import com.genymobile.scrcpy.video.CameraAspectRatio;
import com.genymobile.scrcpy.video.CameraFacing;
import com.genymobile.scrcpy.video.VideoSource;

import android.os.Build;
import android.util.Pair;

final class OptionsWebExtras {

    private OptionsWebExtras() {
    }

    static void normalizeWebAudioOptions(Options copy) {
        if (!copy.getAudio()) {
            return;
        }

        if (copy.getAudioDup()) {
            if (Build.VERSION.SDK_INT < AndroidVersions.API_33_ANDROID_13) {
                Ln.w("audio_dup requires Android 13+; using output capture (device speakers muted during cast)");
                copy.audioDup = false;
                if (copy.getAudioSource() == AudioSource.PLAYBACK) {
                    copy.audioSource = AudioSource.OUTPUT;
                }
            } else {
                copy.audioSource = AudioSource.PLAYBACK;
            }
        } else if (copy.getAudioSource() == AudioSource.PLAYBACK
                && Build.VERSION.SDK_INT < AndroidVersions.API_33_ANDROID_13) {
            Ln.w("audio_source=playback requires Android 13+; using output");
            copy.audioSource = AudioSource.OUTPUT;
        }
    }

    static void applyVideoStreamExtras(Options copy, com.genymobile.scrcpy.ws.VideoSettings settings) {
        String extras = settings.getCodecOptionsString();
        if (extras == null || extras.isEmpty()) {
            return;
        }

        for (String part : extras.split(",")) {
            String token = part.trim();
            int eq = token.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String key = token.substring(0, eq).trim();
            String value = token.substring(eq + 1).trim();
            try {
                applyStreamExtraPair(copy, key, value);
            } catch (Exception e) {
                Ln.w("Ignoring invalid stream extra " + key + "=" + value + ": " + e.getMessage());
            }
        }
    }

    static void applyStreamExtraPair(Options copy, String key, String value) {
        switch (key) {
            case "capture_orientation":
                if (value.isEmpty()) {
                    return;
                }
                Pair<Orientation.Lock, Orientation> orientationPair = OptionsValueParsers.parseCaptureOrientation(value);
                copy.captureOrientationLock = orientationPair.first;
                copy.captureOrientation = orientationPair.second;
                break;
            case "crop":
                if (!value.isEmpty()) {
                    copy.crop = OptionsValueParsers.parseCrop(value);
                }
                break;
            case "new_display":
                if ("default".equals(value)) {
                    value = "";
                }
                copy.newDisplay = OptionsValueParsers.parseNewDisplay(value);
                copy.displayId = Device.DISPLAY_ID_NONE;
                break;
            case "vd_system_decorations":
                copy.vdSystemDecorations = Boolean.parseBoolean(value);
                break;
            case "display_id":
                copy.displayId = Integer.parseInt(value);
                break;
            case "show_touches":
                copy.showTouches = Boolean.parseBoolean(value);
                break;
            case "turn_screen_off":
                copy.turnScreenOff = Boolean.parseBoolean(value);
                break;
            case "stay_awake":
                copy.stayAwake = Boolean.parseBoolean(value);
                break;
            case "power_on":
                copy.powerOn = Boolean.parseBoolean(value);
                break;
            case "keep_active":
                copy.keepActive = Boolean.parseBoolean(value);
                break;
            case "screen_off_timeout":
                copy.screenOffTimeout = Integer.parseInt(value);
                break;
            case "flex_display":
                copy.flexDisplay = Boolean.parseBoolean(value);
                break;
            case "vd_destroy_content":
                copy.vdDestroyContent = Boolean.parseBoolean(value);
                break;
            case "display_ime_policy":
                copy.displayImePolicy = OptionsValueParsers.parseDisplayImePolicy(value);
                break;
            case "start_app":
                if (!value.isEmpty()) {
                    copy.startApp = value;
                }
                break;
            case "video":
                copy.video = Boolean.parseBoolean(value);
                break;
            case "audio":
                copy.audio = Boolean.parseBoolean(value);
                break;
            case "audio_codec":
                AudioCodec streamAudioCodec = AudioCodec.findByName(value);
                if (streamAudioCodec != null) {
                    copy.audioCodec = streamAudioCodec;
                }
                break;
            case "audio_encoder":
                if (!value.isEmpty()) {
                    copy.audioEncoder = value;
                }
                break;
            case "audio_bit_rate":
                copy.audioBitRate = Integer.parseInt(value);
                break;
            case "audio_source":
                AudioSource streamAudioSource = AudioSource.findByName(value);
                if (streamAudioSource != null) {
                    copy.audioSource = streamAudioSource;
                }
                break;
            case "audio_dup":
                copy.audioDup = Boolean.parseBoolean(value);
                break;
            case "video_source":
                VideoSource streamVideoSource = VideoSource.findByName(value);
                if (streamVideoSource != null) {
                    copy.videoSource = streamVideoSource;
                }
                break;
            case "camera_id":
                if (!value.isEmpty()) {
                    copy.cameraId = value;
                }
                break;
            case "camera_size":
                copy.cameraSize = OptionsValueParsers.parseSize(value);
                break;
            case "camera_facing":
                CameraFacing facing = CameraFacing.findByName(value);
                if (facing != null) {
                    copy.cameraFacing = facing;
                }
                break;
            case "camera_ar":
                copy.cameraAspectRatio = OptionsValueParsers.parseCameraAspectRatio(value);
                break;
            case "camera_zoom":
                copy.cameraZoom = Float.parseFloat(value);
                break;
            case "camera_fps":
                copy.cameraFps = Integer.parseInt(value);
                break;
            case "camera_high_speed":
                copy.cameraHighSpeed = Boolean.parseBoolean(value);
                break;
            case "camera_torch":
                copy.cameraTorch = Boolean.parseBoolean(value);
                break;
            default:
                Ln.w("Unknown stream extra: " + key);
                break;
        }
    }
}
