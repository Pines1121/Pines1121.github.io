package android.os;
public final class ServiceManager {
    public static IBinder window = new IBinder() {};
    public static IBinder getService(String name) {
        if (!"window".equals(name)) throw new AssertionError("Unexpected service: " + name);
        return window;
    }
}
