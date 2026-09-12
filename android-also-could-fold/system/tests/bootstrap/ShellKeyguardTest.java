import android.os.ServiceManager;
import android.view.IWindowManager;
import dev.tommy.foldshell.system.ShellKeyguard;

public final class ShellKeyguardTest {
    public static void main(String[] args) throws Exception {
        ShellKeyguard keyguard = new ShellKeyguard();
        IWindowManager.Stub.locked = true;
        if (!keyguard.isKeyguardLocked()) throw new AssertionError("locked must stay locked");
        IWindowManager.Stub.locked = false;
        if (keyguard.isKeyguardLocked()) throw new AssertionError("must query current lock state");
        IWindowManager.Stub.denied = true;
        try {
            keyguard.isKeyguardLocked();
            throw new AssertionError("query failure must not be treated as unlocked");
        } catch (java.lang.reflect.InvocationTargetException expected) {
            if (!(expected.getCause() instanceof SecurityException)) throw expected;
        }
        ServiceManager.window = null;
        try {
            new ShellKeyguard();
            throw new AssertionError("missing service must stop startup");
        } catch (IllegalStateException expected) {
            if (!expected.getMessage().equals("Window service unavailable")) throw expected;
        }
        android.os.Process.uid = 10000;
        try {
            new ShellKeyguard();
            throw new AssertionError("non-shell use must be rejected");
        } catch (IllegalStateException expected) {
            if (!expected.getMessage().equals("ADB shell required")) throw expected;
        }
        System.out.println("ShellKeyguardTest passed (5 scenarios; host Binder model, not device validation)");
    }
}
