package dev.tommy.foldshell.system;

import android.content.Context;

/** Framework bootstrap for app_process, which does not receive bindApplication(). */
public final class ShellRuntime {
    private ShellRuntime() {}

    public static Context createContext() throws Exception {
        if (android.os.Process.myUid() != 2000) {
            throw new IllegalStateException("ADB shell required");
        }
        try {
            // A standalone app_process has no system-shared invalidation nonce
            // mapping. Disable framework caches BEFORE ActivityThread/context
            // initialization, so queries use their normal service backend.
            // This changes only this process, not the UI app or system_server.
            // A fabricated ApplicationSharedMemory would not receive system-server
            // invalidations and could retain stale service data.
            Class.forName("android.app.PropertyInvalidatedCache")
                    .getMethod("disableForTestMode").invoke(null);
            Class<?> activityThread = Class.forName("android.app.ActivityThread");
            Object thread = activityThread.getMethod("currentActivityThread").invoke(null);
            if (thread == null) thread = activityThread.getMethod("systemMain").invoke(null);
            Context system = (Context) activityThread.getMethod("getSystemContext").invoke(thread);
            return system.createPackageContext("com.android.shell", 0);
        } catch (ReflectiveOperationException error) {
            throw new IllegalStateException("Shell framework bootstrap failed: " + rootCause(error), error);
        }
    }

    static Throwable rootCause(Throwable error) {
        while (error.getCause() != null && error.getCause() != error) error = error.getCause();
        return error;
    }

    static void printDiagnostic(Throwable error) {
        java.io.StringWriter trace = new java.io.StringWriter();
        error.printStackTrace(new java.io.PrintWriter(trace));
        String text = trace.toString();
        if (text.length() > 8000) text = text.substring(0, 8000) + "\n[truncated]";
        // Send before FOLD ERROR: the app closes the ADB stream on that line.
        System.out.println("FOLD TRACE " + java.util.Base64.getEncoder().encodeToString(
                text.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
}
