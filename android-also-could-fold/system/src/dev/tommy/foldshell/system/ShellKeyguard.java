package dev.tommy.foldshell.system;

import android.os.IBinder;
import java.lang.reflect.Method;

/** Read-only keyguard query for an unbound ADB app_process. */
public final class ShellKeyguard {
    private final Object windowService;
    private final Method isKeyguardLocked;

    public ShellKeyguard() throws ReflectiveOperationException {
        if (android.os.Process.myUid() != 2000) {
            throw new IllegalStateException("ADB shell required");
        }
        // KeyguardManager's constructor calls WindowManagerGlobal, which in
        // Android 17 reads the animator scale from ApplicationSharedMemory.
        // app_process never receives that mapping. Use the same real WMS Binder
        // query as KeyguardManager.isKeyguardLocked(), without initializing an
        // app window session or fabricating shared memory / lock state.
        Object binder = Class.forName("android.os.ServiceManager")
                .getMethod("getService", String.class).invoke(null, "window");
        if (binder == null) throw new IllegalStateException("Window service unavailable");
        windowService = Class.forName("android.view.IWindowManager$Stub")
                .getMethod("asInterface", IBinder.class).invoke(null, binder);
        if (windowService == null) throw new IllegalStateException("Window service unavailable");
        isKeyguardLocked = Class.forName("android.view.IWindowManager")
                .getMethod("isKeyguardLocked");
    }

    public boolean isKeyguardLocked() throws ReflectiveOperationException {
        // Do not treat a failed query as unlocked: the engine stops and removes
        // its layers on failure, preserving the existing capture protections.
        return (Boolean) isKeyguardLocked.invoke(windowService);
    }
}
