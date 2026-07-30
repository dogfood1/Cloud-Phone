package com.yiyi.cloud_phone.cast;

import java.util.ArrayDeque;
import java.util.Queue;
import java.util.function.Consumer;

/** Limits concurrent cast/start calls (matches web acquireGroupCastStartSlot). */
final class GroupCastStartGate {
    private static final int MAX_PARALLEL = 2;
    private static final Object LOCK = new Object();
    private static int active;
    private static final Queue<Runnable> WAIT = new ArrayDeque<>();

    interface Slot {
        void release();
    }

    private GroupCastStartGate() {
    }

    static void acquire(Consumer<Slot> consumer) {
        Runnable grant = () -> consumer.accept(GroupCastStartGate::release);
        synchronized (LOCK) {
            if (active < MAX_PARALLEL) {
                active += 1;
                grant.run();
                return;
            }
            WAIT.add(grant);
        }
    }

    private static void release() {
        Runnable next = null;
        synchronized (LOCK) {
            active = Math.max(0, active - 1);
            if (!WAIT.isEmpty() && active < MAX_PARALLEL) {
                active += 1;
                next = WAIT.poll();
            }
        }
        if (next != null) {
            next.run();
        }
    }
}
