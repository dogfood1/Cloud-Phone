package com.genymobile.scrcpy.control;

import com.genymobile.scrcpy.model.Point;
import com.genymobile.scrcpy.model.Position;
import com.genymobile.scrcpy.model.Size;
import com.genymobile.scrcpy.util.AffineMatrix;

public final class PositionMapper {

    private final Size videoSize;
    private final AffineMatrix videoToDeviceMatrix;

    public PositionMapper(Size videoSize, AffineMatrix videoToDeviceMatrix) {
        this.videoSize = videoSize;
        this.videoToDeviceMatrix = videoToDeviceMatrix;
    }

    public static PositionMapper create(Size videoSize, AffineMatrix filterTransform, Size targetSize) {
        boolean convertToPixels = !videoSize.equals(targetSize) || filterTransform != null;
        AffineMatrix transform = filterTransform;
        if (convertToPixels) {
            AffineMatrix inputTransform = AffineMatrix.ndcFromPixels(videoSize);
            AffineMatrix outputTransform = AffineMatrix.ndcToPixels(targetSize);
            transform = outputTransform.multiply(transform).multiply(inputTransform);
        }

        return new PositionMapper(videoSize, transform);
    }

    public Size getVideoSize() {
        return videoSize;
    }

    public Point map(Position position) {
        Size clientVideoSize = position.getScreenSize();
        Point point = position.getPoint();

        if (!videoSize.equals(clientVideoSize)) {
            // ws-scrcpy clients may send physical display size from scrcpy_initial while the
            // stream is scaled (max_size). Scale coordinates instead of dropping the event.
            if (clientVideoSize.getWidth() > 0 && clientVideoSize.getHeight() > 0
                    && videoSize.getWidth() > 0 && videoSize.getHeight() > 0) {
                point = new Point(
                        point.getX() * videoSize.getWidth() / clientVideoSize.getWidth(),
                        point.getY() * videoSize.getHeight() / clientVideoSize.getHeight());
            } else {
                return null;
            }
        }

        if (videoToDeviceMatrix != null) {
            point = videoToDeviceMatrix.apply(point);
        }
        return point;
    }
}
