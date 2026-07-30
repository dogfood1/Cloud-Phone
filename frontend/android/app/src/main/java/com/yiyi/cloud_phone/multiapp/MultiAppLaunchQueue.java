package com.yiyi.cloud_phone.multiapp;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class MultiAppLaunchQueue {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile Runnable tail = () -> {};

    void enqueue(Runnable task) {
        tail = chain(tail, task);
    }

    void shutdown() {
        executor.shutdownNow();
    }

    private Runnable chain(Runnable prev, Runnable next) {
        return () -> executor.execute(() -> {
            try {
                prev.run();
                next.run();
            } catch (Exception ignored) {
                // keep chain alive
            }
        });
    }
}
