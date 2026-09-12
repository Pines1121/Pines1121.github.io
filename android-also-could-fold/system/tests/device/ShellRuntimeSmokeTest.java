import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.hardware.display.DisplayManager;
import android.os.Looper;
import android.os.PowerManager;
import dev.tommy.foldshell.system.ShellRuntime;

/** Runs as shell in an emulator; never starts the fold engine or creates surfaces. */
public final class ShellRuntimeSmokeTest {
    public static void main(String[] args) throws Exception {
        Looper.prepareMainLooper();
        Context first = ShellRuntime.createContext();
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
        System.out.println("ShellRuntimeSmokeTest PASS sdk=" + android.os.Build.VERSION.SDK_INT
                + " sensors=" + sensors.getSensorList(Sensor.TYPE_ALL).size()
                + " displays=" + displays.getDisplays().length
                + " interactive=" + power.isInteractive());
        // Returning directly from app_process would kill the runtime with SIGKILL.
        System.exit(0);
    }
}
