import android.app.ActivityThread;
import android.app.PropertyInvalidatedCache;
import android.content.Context;
import dev.tommy.foldshell.system.ShellRuntime;

public final class ShellRuntimeTest {
    interface Action { void run() throws Exception; }
    static void check(boolean ok, String message) { if (!ok) throw new AssertionError(message); }
    static void fails(String message, Action action) throws Exception {
        try { action.run(); } catch (Exception e) {
            check(e.toString().contains(message), "wrong failure: " + e);
            return;
        }
        throw new AssertionError("expected: " + message);
    }
    public static void main(String[] args) throws Exception {
        // The old startup sequence reproduces the reported exception.
        fails("ApplicationSharedMemory not initialized", ActivityThread::systemMain);
        check(ShellRuntime.createContext() != null, "bootstrap context");
        check(ActivityThread.starts == 1, "first bootstrap starts ActivityThread");
        ShellRuntime.createContext();
        check(ActivityThread.starts == 1, "reuse existing ActivityThread");
        PropertyInvalidatedCache.backendValue = 1;
        check(PropertyInvalidatedCache.query() == 1, "service remains available");
        PropertyInvalidatedCache.backendValue = 2;
        check(PropertyInvalidatedCache.query() == 2, "no stale result after service state changes");
        PropertyInvalidatedCache.disabled = false;
        android.os.Process.uid = 10000;
        fails("ADB shell required", ShellRuntime::createContext);
        check(!PropertyInvalidatedCache.disabled, "normal app caches untouched");
        android.os.Process.uid = 2000;
        PropertyInvalidatedCache.failDisable = true;
        fails("cache setup rejected", ShellRuntime::createContext);
        check(!PropertyInvalidatedCache.disabled, "do not continue after bootstrap failure");
        PropertyInvalidatedCache.failDisable = false;
        Context.failPackage = true;
        fails("package access denied", ShellRuntime::createContext);
        System.out.println("ShellRuntimeTest passed (7 scenarios; host framework model, not device validation)");
    }
}
