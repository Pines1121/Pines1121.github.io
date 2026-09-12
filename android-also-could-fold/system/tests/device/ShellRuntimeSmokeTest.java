import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.hardware.display.DisplayManager;
import android.os.Looper;
import android.os.PowerManager;
import dev.tommy.foldshell.system.ShellRuntime;
import dev.tommy.foldshell.system.ShellKeyguard;
import dev.tommy.foldshell.system.FoldShell;

/** Runs as shell; constructs both engine modes but never starts effects or captures. */
public final class ShellRuntimeSmokeTest {
    private static void exerciseSharedMemoryFlag() throws Exception {
        if (android.os.Build.VERSION.SDK_INT < 37) return;
        try {
            Class<?> flags = Class.forName("com.android.window.flags.Flags");
            java.lang.reflect.Method getter = flags.getMethod("currentAnimatorScaleUsesSharedMemory");
            System.out.println("Animator shared-memory flag before test=" + getter.invoke(null));
            // Test process only. Simulate a vendor enabling this framework path;
            // never change device_config, system_server or any phone setting.
            java.lang.reflect.Field field = flags.getDeclaredField("FEATURE_FLAGS");
            field.setAccessible(true);
            Object original = field.get(null);
            Class<?> contract = field.getType();
            Object enabled = java.lang.reflect.Proxy.newProxyInstance(contract.getClassLoader(),
                    new Class<?>[] { contract }, (proxy, method, values) ->
                            method.getName().equals("currentAnimatorScaleUsesSharedMemory")
                                    ? true : method.invoke(original, values));
            field.set(null, enabled);
            System.out.println("Animator shared-memory flag in test=" + getter.invoke(null));
        } catch (ReflectiveOperationException | IllegalArgumentException error) {
            // Optimized framework builds may make flags immutable. Record that
            // limitation explicitly instead of claiming the path was exercised.
            System.out.println("Framework flag cannot be overridden in this test: " + error);
        }
    }

    public static void main(String[] args) {
        try {
            run(args);
        } catch (Throwable error) {
            // app_process's uncaught handler otherwise logs only to logcat and
            // kills the process, hiding the framework cause from the CI output.
            error.printStackTrace(System.out);
            System.exit(1);
        }
    }

    private static void run(String[] args) throws Exception {
        Looper.prepareMainLooper();
        exerciseSharedMemoryFlag();
        Context first = ShellRuntime.createContext();
        if (args.length > 0 && args[0].equals("legacy-keyguard")) {
            // Separate process: demonstrate the path omitted by the 0.4.18 test.
            try {
                android.app.KeyguardManager old = first.getSystemService(android.app.KeyguardManager.class);
                System.out.println("Legacy KeyguardManager available: locked=" + old.isKeyguardLocked());
            } catch (Throwable error) {
                Throwable root = error;
                while (root.getCause() != null && root.getCause() != root) root = root.getCause();
                if (!(root instanceof IllegalStateException)
                        || !"ApplicationSharedMemory not initialized".equals(root.getMessage())) throw error;
                System.out.println("REPRODUCED legacy KeyguardManager: " + root);
                error.printStackTrace(System.out);
            }
            System.exit(0);
        }
        Context second = ShellRuntime.createContext();
        if (!"com.android.shell".equals(first.getPackageName())
                || !first.getPackageName().equals(second.getPackageName())) {
            throw new AssertionError("Wrong package context");
        }
        SensorManager sensors = first.getSystemService(SensorManager.class);
        DisplayManager displays = second.getSystemService(DisplayManager.class);
        PowerManager power = first.getSystemService(PowerManager.class);
        if (sensors == null || displays == null || power == null || displays.getDisplays().length == 0) {
            throw new AssertionError("Required system service unavailable");
        }
        boolean locked = new ShellKeyguard().isKeyguardLocked();
        // Exercise the complete production constructor, including keyguard and
        // hidden compositor/display method lookup that the former test missed.
        java.lang.reflect.Constructor<FoldShell> constructor =
                FoldShell.class.getDeclaredConstructor(Context.class, boolean.class);
        constructor.setAccessible(true);
        java.lang.reflect.Method displayInfo = FoldShell.class.getDeclaredMethod("displayInfo");
        displayInfo.setAccessible(true);
        for (boolean v2 : new boolean[] { false, true }) {
            FoldShell engine = constructor.newInstance(first, v2);
            try {
                if (displayInfo.invoke(engine) == null) throw new AssertionError("Display info missing");
            } finally { engine.close(); }
        }
        System.out.println("ShellRuntimeSmokeTest PASS sdk=" + android.os.Build.VERSION.SDK_INT
                + " sensors=" + sensors.getSensorList(Sensor.TYPE_ALL).size()
                + " displays=" + displays.getDisplays().length
                + " interactive=" + power.isInteractive() + " locked=" + locked + " modes=V1,V2");
        // Returning directly from app_process would kill the runtime with SIGKILL.
        System.exit(0);
    }
}
