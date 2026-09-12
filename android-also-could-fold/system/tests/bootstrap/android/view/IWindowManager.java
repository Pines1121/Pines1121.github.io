package android.view;
import android.os.IBinder;
public interface IWindowManager {
    boolean isKeyguardLocked();
    final class Stub {
        public static boolean locked;
        public static boolean denied;
        public static IWindowManager asInterface(IBinder binder) {
            return () -> {
                if (denied) throw new SecurityException("keyguard access denied");
                return locked;
            };
        }
    }
}
