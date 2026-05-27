package com.genymobile.scrcpy.video;

import com.genymobile.scrcpy.model.ConfigurationException;
import com.genymobile.scrcpy.model.Size;
import com.genymobile.scrcpy.util.LogUtils;
import com.genymobile.scrcpy.wrappers.ServiceManager;

import android.annotation.TargetApi;
import android.graphics.Rect;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.MediaCodec;

import com.genymobile.scrcpy.AndroidVersions;

import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Stream;

final class CameraCaptureSelection {

    private CameraCaptureSelection() {
    }

    static String selectCamera(String explicitCameraId, CameraFacing cameraFacing)
            throws CameraAccessException, ConfigurationException {
        CameraManager cameraManager = ServiceManager.getCameraManager();

        String[] cameraIds = cameraManager.getCameraIdList();
        if (explicitCameraId != null) {
            if (!Arrays.asList(cameraIds).contains(explicitCameraId)) {
                com.genymobile.scrcpy.util.Ln.e(
                        "Camera with id " + explicitCameraId + " not found\n" + LogUtils.buildCameraListMessage(false));
                throw new ConfigurationException("Camera id not found");
            }
            return explicitCameraId;
        }

        if (cameraFacing == null) {
            return cameraIds.length > 0 ? cameraIds[0] : null;
        }

        for (String cameraId : cameraIds) {
            CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);

            int facing = characteristics.get(CameraCharacteristics.LENS_FACING);
            if (cameraFacing.value() == facing) {
                return cameraId;
            }
        }

        return null;
    }

    @TargetApi(AndroidVersions.API_24_ANDROID_7_0)
    static Size selectSize(String cameraId, Size explicitSize, int maxSize, CameraAspectRatio aspectRatio, boolean highSpeed)
            throws CameraAccessException {
        if (explicitSize != null) {
            return explicitSize;
        }

        CameraManager cameraManager = ServiceManager.getCameraManager();
        CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);

        StreamConfigurationMap configs = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
        android.util.Size[] sizes = highSpeed ? configs.getHighSpeedVideoSizes() : configs.getOutputSizes(MediaCodec.class);
        if (sizes == null) {
            return null;
        }

        Stream<android.util.Size> stream = Arrays.stream(sizes);
        if (maxSize > 0) {
            stream = stream.filter(it -> it.getWidth() <= maxSize && it.getHeight() <= maxSize);
        }

        Float targetAspectRatio = resolveAspectRatio(aspectRatio, characteristics);
        if (targetAspectRatio != null) {
            stream = stream.filter(it -> {
                float ar = ((float) it.getWidth() / it.getHeight());
                float arRatio = ar / targetAspectRatio;
                return arRatio >= 0.9f && arRatio <= 1.1f;
            });
        }

        Optional<android.util.Size> selected = stream.max((s1, s2) -> {
            int cmp = Integer.compare(s1.getWidth(), s2.getWidth());
            if (cmp != 0) {
                return cmp;
            }

            if (targetAspectRatio != null) {
                float ar1 = ((float) s1.getWidth() / s1.getHeight());
                float arRatio1 = ar1 / targetAspectRatio;
                float distance1 = Math.abs(1 - arRatio1);

                float ar2 = ((float) s2.getWidth() / s2.getHeight());
                float arRatio2 = ar2 / targetAspectRatio;
                float distance2 = Math.abs(1 - arRatio2);

                cmp = Float.compare(distance2, distance1);
                if (cmp != 0) {
                    return cmp;
                }
            }

            return Integer.compare(s1.getHeight(), s2.getHeight());
        });

        if (selected.isPresent()) {
            android.util.Size size = selected.get();
            return new Size(size.getWidth(), size.getHeight());
        }

        return null;
    }

    private static Float resolveAspectRatio(CameraAspectRatio ratio, CameraCharacteristics characteristics) {
        if (ratio == null) {
            return null;
        }

        if (ratio.isSensor()) {
            Rect activeSize = characteristics.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE);
            return (float) activeSize.width() / activeSize.height();
        }

        return ratio.getAspectRatio();
    }
}
