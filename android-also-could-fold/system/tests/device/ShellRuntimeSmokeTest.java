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
    public static void main(String[] args) throws Exception {
        Looper.prepareMainLooper();
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
